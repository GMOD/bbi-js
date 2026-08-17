# Optimizations

Why the query path looks the way it does.
[parser-selection.md](parser-selection.md) charts which parser a call reaches;
this is about everything around that choice.

Four steps make up a query, and which of them dominates depends entirely on
where the file is. Whole largest chromosome at base resolution, local file, page
cache warm, min of 5 runs, with reads serialized so the phases add up:

| fixture (bytes read)                  | features |  index |  fetch |     inflate | build records |   total |
| ------------------------------------- | -------: | -----: | -----: | ----------: | ------------: | ------: |
| `cDC.bw` chr1 (4.4MB of a 67MB file)  |  917,130 | 0.7 ms | 1.9 ms | **38.1 ms** |   **37.1 ms** | 78.1 ms |
| `variable_step_large.bw` chr1 (3.3MB) |  500,000 | 0.5 ms | 0.6 ms | **21.7 ms** |   **21.8 ms** | 45.0 ms |
| `ENCFF826FLP.bw` chr22 (2.0MB)        |  445,460 | 0.6 ms | 0.5 ms | **15.8 ms** |   **15.5 ms** | 32.6 ms |
| `clinvarCnv.bb` chr1 (0.25MB)         |    3,372 | 0.2 ms | 0.2 ms |      2.2 ms |        2.4 ms |  5.0 ms |
| `uncompressed.bw` ctgA (0.6MB)        |   49,984 | 0.2 ms | 0.1 ms |           — |        2.2 ms |  2.5 ms |

Inflating blocks and turning them into records split the work almost exactly in
half, and walking the index costs a rounding error beside either. That is the
local picture. Put the same file behind a network and `fetch` becomes
everything: a 24-region query over `cDC.bw` costs 0.9-4.1 seconds of round trips
issued one at a time, or 0.4-1.5 concurrently, against the tens of milliseconds
of work above ([concurrency.md](concurrency.md)).

So the library optimizes for two different bottlenecks: **fewer, larger, more
overlapped reads** for the remote case, and **fewer bytes and fewer objects
touched per record** for the local one.

## Reading the header and the index

### The header is one read, grown only if it has to be

`_getMainHeader` asks for 2000 bytes, which covers the fixed header, the zoom
level table, the `totalSummary` struct and a typical autoSql definition. It
refetches at double the size only when one of those actually lands past the end
of the buffer — a BigBed with a long autoSql, usually. A short read means EOF,
so the growth stops rather than looping on a truncated file.

### The chromosome B+ tree reads a whole node at a time

A node's item count lives inside the node, so reading only the 4-byte node
header first would cost a second round trip per node. `maxNodeSize` bounds any
node from `blockSize`, `keySize` and `valSize` in the tree header — an internal
item (key + 8-byte child offset) is never wider than a leaf item — so one read
covers it. Reading the header first doubled the request count on remote files.

Sibling children are then walked with `Promise.all`, so a level costs one round
trip rather than one per node.

### Header, indices and R-tree nodes are shared, not merely memoized

The header, BigBed's extra-index list, and every R-tree node read go through
`SharedReadCache`. The difference from a memoized promise is abort behaviour:
the underlying read carries a signal of its own and is only aborted once _every_
waiting caller has aborted. A genome browser panning away from a view aborts its
query, and without this that abort would reject the concurrent queries sharing
the same index read.

`BlockView`s are cached too, keyed by R-tree offset and block type, so repeated
queries at one zoom level reuse the node cache instead of starting an empty one.

Note what is _not_ cached: decompressed data blocks. bbi-js caches the index and
leaves the bytes to the filehandle — see
[what the consumer has to do](#what-the-consumer-has-to-do).

## Choosing and fetching blocks

### The R-tree walk merges its node reads

The nodes at one level of the R-tree are scattered but often adjacent, so
`mergeRanges` joins overlapping and abutting spans into single reads before
issuing any. Each node is read at `4 + blockSize * 32` — the size of a
completely full leaf — for the same reason the B+ tree is: one request instead
of a header read plus a body read.

Overlap uses UCSC's lexicographic half-open test on `(chrom, base)` pairs, and
the comparisons have to stay strict. Inclusive bounds pull in nodes that merely
abut the query and contribute no features.

### Adjacent data blocks coalesce into one read

`groupBlocks` sorts the R-tree's blocks by file offset and joins any two within
2KB of each other into one range request. BBI writes a chromosome's blocks
contiguously, so this collapses almost completely:

| query                                     | blocks | reads |
| ----------------------------------------- | -----: | ----: |
| `cDC.bw` chr1, base resolution            |    896 |     1 |
| `ENCFF826FLP.bw` largest chrom, base      |    436 |     1 |
| `cDC.bw` 24 chroms × 2Mb, base resolution |    234 |    19 |
| `cDC.bw` whole-genome overview (zoomed)   |     19 |     3 |

The group's length is `max`ed rather than extended, because a block contained
within the group's existing extent — a duplicate, or one nested in a longer
earlier block — must not shrink it. A short group read would leave later blocks
decoding from truncated bytes.

### A query's independent reads go out together

Both loops that issue several reads — the R-tree nodes at a level, and the
coalesced block groups — run six at a time via `forEachWithReadahead`, so a
query's wall clock is the longest of its reads rather than their sum. Results
are still handed back in input order, so nothing downstream has to re-sort, and
a rejection is settled into its slot and rethrown in order rather than
propagated eagerly (which would leave the other in-flight rejections unhandled).

Six because that is the HTTP/1.1 per-origin cap a browser enforces: more in
flight than the transport will run buys no latency while holding another group's
compressed bytes, decompression output and parsed arrays alive. It is
deliberately not a constructor option — the bound multiplies with whatever
fan-out the caller puts above it, so the number that matters is not one this
module can see.

Worth ~2.5× on a multi-region BigWig query and ~4× on BigBed, at every latency
tested, with byte-identical traffic. The measurements, and why a query that
already coalesces to a handful of reads gains nothing, are in
[concurrency.md](concurrency.md).

### Many regions in one pass

`getFeaturesMulti` walks every region's index concurrently, dedupes the blocks
by file offset, and coalesces the union — so a block two regions both want is
fetched once and parsed once per region, and blocks from _different_ regions
merge into one read when they are adjacent on disk. Twenty adjacent 100kb
windows on `cDC.bw` chr1, the shape a genome browser renders:

| issued as                 | blocks | reads |   bytes |
| ------------------------- | -----: | ----: | ------: |
| one `getFeaturesMulti`    |     22 |     1 | 107,073 |
| 20 separate `getFeatures` |     42 |    21 | 206,810 |

Twenty-one reads become one, and the byte count halves — the boundary blocks
were being downloaded and inflated by both of the windows that touch them.

### Forecasting a query costs no data blocks

`getRegionByteSize` sums the on-disk block lengths the R-tree reports for a
range, reading only index nodes. It is the `index` column of the table at the
top — tenths of a millisecond — against a download that may be megabytes, which
is what makes it usable as a gate before issuing the query at all. The
multi-region form dedupes by offset, so a block shared by overlapping regions is
counted once, as the fetch would fetch it once.

## Decompression

Every data block on disk is individually zlib-compressed, so inflate is
unavoidable work on every read, and the table at the top says it is half of a
local query. It runs in a Rust/WebAssembly libdeflater module, ~2.5-3× faster
than a pure-JS inflate and 4-11× faster than the platform's own
`DecompressionStream` — [wasm.md](wasm.md) has the fixtures, the numbers, and
why the platform API loses so badly on this file shape when it wins on bgzf.

The shape that matters here is that **the boundary is crossed once per block
group, not once per block**. `inflate_raw_batch` takes the whole fetched group
plus a `Uint32Array` of offsets and lengths and returns one buffer. A query
inflating 896 blocks pays for one call, one allocation and one copy out of wasm
memory instead of 896 of each; the output buffer is reserved at the true upper
bound (`blocks × uncompressBufSize`) so it never reallocates inside the
grow-only wasm heap.

Blocks carry a 2-byte zlib header that `deflate_block` skips, using
libdeflater's raw path — which also skips the trailing adler32 check. Anything
benchmarked against this path has to do the same to be measuring the same work.

## Parsing records

### Typed arrays instead of objects

`getFeaturesAsArrays` fills packed `Int32Array`/`Float32Array`s and allocates no
per-record object. That is the single largest win available to a caller that can
use it — roughly 1.7-1.9× the wall clock and 5× the memory:

| fixture                  | features | objects | arrays |  objects retained |   arrays retained |
| ------------------------ | -------: | ------: | -----: | ----------------: | ----------------: |
| `cDC.bw` chr1            |  917,130 |  78.1ms | 43.2ms | 79.1MB (90 B/rec) | 13.3MB (15 B/rec) |
| `variable_step_large.bw` |  500,000 |  45.0ms | 23.8ms |                 — |                 — |
| `ENCFF826FLP.bw`         |  445,460 |  32.6ms | 19.8ms | 34.2MB (80 B/rec) |  7.7MB (18 B/rec) |

Retained is `heapUsed + arrayBuffers` after a forced GC with the result still
live. `ArrayFeatureView` wraps the arrays in a JBrowse-style `get(i, key)`
interface for consumers that want feature-shaped access without paying for the
objects.

The typed-array readers reject BigBed rather than mis-parsing it: those parsers
only understand fixed-width layouts, and a variable-width record with a trailing
`rest` string fed to the BigWig parser yields records that look plausible and
are garbage.

### The fused wasm call buys memory, not speed

`decompress_and_parse_bigwig` inflates a block _and_ walks its records _and_
applies the coordinate filter, in one call, returning packed arrays. Against
routing the same single-region query through the multi path — wasm inflate, JS
array parse — it measures at parity on wall clock across `cDC.bw`,
`ENCFF826FLP.bw` and `variable_step_large.bw`, run alternately three times each.

That is worth stating plainly, because the fused entry points look like the
speed optimization and are not. What they buy is that the decompressed bytes are
never materialized in the JS heap at all, and that records outside the query
window are never allocated — the JS array path allocates `itemCount` slots per
block and `subarray`s them down afterwards. The table above is the parse
optimization; this one is the allocation behind it.

It also explains the routing in [parser-selection.md](parser-selection.md): a
multi-region call has one filter per region and one shared block set, so there
is no single range to hand wasm, and it takes the JS array parse instead. On
these fixtures that costs it nothing in wall clock, which is what makes the
multi path worth having.

### BigBed decodes `rest` only for records that survive the filter

Scanning for a BigBed record's null terminator is unavoidable — it is how the
next record is found — but decoding the bytes in between is not, so `rest` is
materialized after the coordinate filter rather than before. The R-tree already
pruned non-overlapping blocks, so what this skips is the partly-out-of-range
records in a query's edge blocks, plus every re-parse in the multi-region path.
Parse step per query, decoding lazily vs eagerly:

| query                              |   lazy |  eager |
| ---------------------------------- | -----: | -----: |
| `clinvarCnv.bb` chr1, 100kb window | 0.25ms | 0.50ms |
| `clinvarCnv.bb` chr1, 1Mb window   | 0.25ms | 0.58ms |
| `clinvarCnv.bb` chr1, 10Mb window  | 0.28ms | 0.69ms |
| `clinvarCnv.bb` chr1, whole chrom  | 2.33ms | 2.64ms |

The narrower the window, the more of the edge blocks it throws away — and a
whole-chromosome read, where the filter rejects nothing, is a wash. Rendering a
screenful is the first row, not the last.

### Small things that add up

- **uint64 fields are read as two uint32s**, not through `getBigUint64`. Every
  file offset in the R-tree and both B+ trees is one of these, and every one
  would otherwise allocate a BigInt to be immediately converted. Values below
  2^53 are exact, which covers any real offset.
- **`rest`, autoSql and every B+ tree key decode through one shared
  `TextDecoder`**, and key parsing slices to the null terminator rather than
  decoding the padding and trimming afterwards.
- **`searchExtraIndex` dedupes before reading.** Many index entries for one name
  point into the same data block — several records packed together — so blocks
  are deduped by offset and handed to `readFeatures` per field in one call,
  which puts them through the same coalescing as a coordinate query.
- **The truncated-block check is per block, not per record.** A section declares
  its item count and a zoom block is a whole number of 32-byte records, so one
  comparison against the declared count covers the whole block and the parse
  loops are unchanged. It runs _before_ the typed arrays are sized, so a short
  block cannot size an allocation.
- **An uncompressed file touches no wasm at all.** `uncompressBufSize === 0`
  means blocks slice straight out of the fetched group — including on the path
  that would otherwise fuse, since the fused entry points _are_ the
  decompressor.

## What the consumer has to do

Some of the biggest wins are not in this library, because they are decisions
about the process rather than the file.

- **Put a caching, coalescing filehandle underneath.** bbi-js caches the header
  and the index but never a decompressed data block, so a repeat query re-reads
  and re-inflates. jbrowse's `RemoteFileWithRangeCache` fetches in aligned
  blocks, joins contiguous runs and dedups in flight; it composes with the
  coalescing above rather than fighting it, since that layer dedups bytes while
  this one decides which bytes to ask for.
- **Ask for arrays when you can.** The table above is 1.7-1.9× and 5× the memory
  for a caller that does not need one object per record.
  `getFeaturesAsArraysMulti` packs every region into one backing buffer per
  field — but note that with a single region it serves the query from the fused
  parser, whose three arrays are views into _one_ buffer, so a `postMessage`
  transfer list must name each distinct buffer once.
- **Batch regions into one call.** `getFeaturesMulti` is not sugar for a loop;
  it is the dedupe and the cross-region coalescing measured above.
- **Pass `scale` or `basesPerSpan`.** BigWig zoom levels are pre-computed
  summaries, and picking one is the difference between 221,001 features from 234
  blocks in 19 reads and 73 features from 19 blocks in 3, for the same 24 × 2Mb
  view of `cDC.bw`. A query that omits it reads unzoomed data no matter how far
  out the view is. Only the levels the file actually carries are available:
  `cDC.bw`'s coarsest reduction is 655,360 bases, and its finest, 2,560, means a
  view below ~1.3kb/px is served unzoomed however the option is set.
- **Bound your own fan-out.** Six-at-a-time is per query. A track fetching ten
  files at once has sixty reads outstanding, and the peak is set by the caller's
  fan-out rather than by anything this module can see —
  [concurrency.md](concurrency.md) measures it.
- **Gate on `getRegionByteSize`** before issuing a query that might be huge.

## What is left

**No block cache.** A pan that re-visits a window re-fetches and re-inflates it;
only the index is cached. This is deliberate for now — the filehandle layer
above can dedupe the bytes, which is the expensive half remotely — but it means
the inflate column of the first table is paid again on every repeat query, and
that column is half of a local query. A parsed-block cache would need a
byte-bounded budget shared across files, as bam-js's does, rather than an entry
count.

**That budget now exists**, in `@gmod/shared-read-cache`'s `SharedBudget` —
which this package already depends on for the header, index and R-tree node
caches, so the prerequisite costs no new dependency. `@gmod/bam` and
`@gmod/tabix` both pool their decompressed-chunk caches through one, and
`@gmod/tabix`'s
[ADR 0001](https://github.com/GMOD/tabix-js/blob/main/agent-docs/adr/0001-bound-the-chunk-cache-by-decompressed-bytes.md)
and
[ADR 0002](https://github.com/GMOD/tabix-js/blob/main/agent-docs/adr/0002-size-the-chunk-cache-above-one-query.md)
are the two things to read before sizing one: bound by decompressed bytes rather
than entries, and above one query's working set or not at all.

So what is unsettled is no longer the mechanism, it is whether the repeated
inflate is worth caching here — which is a measurement this repo has to make, on
a pan rather than on a cold query. Note the caches listed above weigh
**entries**, and a byte-weighed block cache cannot share a budget with them or
with bam's: a `SharedBudget` totals its members, so mixing units bounds neither.

**BigBed parses in JS.** BigBed records are variable-width and carry a string,
so they inflate in wasm and parse in JS, and there is no typed-array reader for
them. The parse column for `clinvarCnv.bb` is small only because the fixture is;
a dense BigBed at base resolution has no fused path to fall back on.

**BigBed ignores its zoom levels.** `BigBed.getView` returns the unzoomed view
at every scale, so whatever `bedToBigBed` wrote is never consulted — which is
also why BigBed gains more than BigWig from concurrent reads: every query reads
unzoomed blocks spread across the file.

**`searchExtraIndex` descends one child per node.** A name occurring more than
`blockSize` times would be split across sibling leaves and the extras missed. It
does not happen for the transcript and gene-name indexes `bedToBigBed` builds,
but full correctness needs multi-child descent (cf. UCSC `bptFileFindMulti`).

## Further reading

- [concurrency.md](concurrency.md) — how many range requests a query makes, and
  what overlapping them is worth over a simulated network link
- [wasm.md](wasm.md) — the decompressor, the batching, and the
  `DecompressionStream` comparison
- [parser-selection.md](parser-selection.md) — which of the four parsers a call
  reaches, and how they are held to agreement
- [api.md](api.md) — the read methods these decisions are visible through

Reproducing the tables: `pnpm benchonly` runs the inflate and BigWig benchmarks,
`scripts/network-bench.sh` the latency ones. The phase breakdown and the
block/read counts came from temporary instrumentation in `src/block-view.ts`
rather than a committed script.
