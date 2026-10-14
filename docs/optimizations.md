# Optimizations

[parser-selection.md](parser-selection.md) charts which parser a call reaches.
This page explains why the rest of the query path is built the way it is.

A query has four steps, and which of them dominates depends entirely on where
the file is. The table reads the largest chromosome whole at base resolution
from a local file with a warm page cache, and takes the minimum of 5 runs, with
reads serialized so the phases add up:

| fixture (bytes read)                  | features |  index |  fetch |     inflate | build records |   total |
| ------------------------------------- | -------: | -----: | -----: | ----------: | ------------: | ------: |
| `cDC.bw` chr1 (4.4MB of a 67MB file)  |  917,130 | 0.7 ms | 1.9 ms | **38.1 ms** |   **37.1 ms** | 78.1 ms |
| `variable_step_large.bw` chr1 (3.3MB) |  500,000 | 0.5 ms | 0.6 ms | **21.7 ms** |   **21.8 ms** | 45.0 ms |
| `ENCFF826FLP.bw` chr22 (2.0MB)        |  445,460 | 0.6 ms | 0.5 ms | **15.8 ms** |   **15.5 ms** | 32.6 ms |
| `clinvarCnv.bb` chr1 (0.25MB)         |    3,372 | 0.2 ms | 0.2 ms |      2.2 ms |        2.4 ms |  5.0 ms |
| `uncompressed.bw` ctgA (0.6MB)        |   49,984 | 0.2 ms | 0.1 ms |           — |        2.2 ms |  2.5 ms |

On a local file, inflating blocks and building records split the work almost
exactly in half, and walking the index takes a negligible fraction of either.
Behind a network, `fetch` dominates, since a 24-region query over `cDC.bw`
spends 0.9-4.1 seconds on round trips issued one at a time, or 0.4-1.5 seconds
issued concurrently, against the tens of milliseconds of work above
([concurrency.md](concurrency.md)).

The library therefore optimizes for two different bottlenecks: **fewer, larger,
more overlapped reads** for the remote case, and **fewer bytes and fewer objects
touched per record** for the local one.

## Reading the header and the index

### The header is one read, grown only if it has to be

`_getMainHeader` asks for 2000 bytes, which covers the fixed header, the zoom
level table, the `totalSummary` struct and a typical autoSql definition. It
refetches at double the size only when one of those ends past the end of the
buffer, which usually means a BigBed with a long autoSql. A read that returns
fewer bytes than requested means EOF, so `_getMainHeader` stops growing the
buffer rather than looping on a truncated file.

### The chromosome B+ tree reads a whole node at a time

A node stores its item count inside the node, so reading the 4-byte node header
first would cost a second round trip per node. `maxNodeSize` is
`4 + blockSize * (keySize + max(valSize, 8))`, from the tree header. An item is
a key plus either a leaf value of `valSize` bytes or an internal item's 8-byte
child offset, and the formula takes the wider of the two, so one read of that
size covers any node. Reading the header first doubled the request count on
remote files.

The walk then reads sibling children with `Promise.all`, so a level costs one
round trip rather than one per node.

### Header, indices and R-tree nodes are shared, not merely memoized

The header, BigBed's extra-index list, and every R-tree node read go through
`SharedReadCache`, which differs from a memoized promise in how it handles
aborts. `SharedReadCache` gives the underlying read a separate signal and aborts
it only once _every_ waiting caller has aborted. A genome browser panning away
from a view aborts its query, and with a memoized promise that abort would
reject the concurrent queries sharing the same index read.

bbi-js also caches `BlockView`s, keyed by R-tree offset and block type, so
repeated queries at one zoom level reuse the node cache instead of starting an
empty one.

bbi-js does not cache decompressed data blocks. It caches the index and leaves
caching the bytes to the filehandle; see
[what the consumer has to do](#what-the-consumer-has-to-do).

## Choosing and fetching blocks

### The R-tree walk merges its node reads

The nodes at one level of the R-tree are scattered but often adjacent, so
`mergeRanges` joins overlapping and abutting spans into single reads before
issuing any. The walk reads each node at `4 + blockSize * 32` bytes, the size of
a completely full leaf, so that one request replaces a header read plus a body
read, as in the B+ tree.

Overlap uses UCSC's lexicographic half-open test on `(chrom, base)` pairs, and
the comparisons have to stay strict. Inclusive bounds pull in nodes that merely
abut the query and contribute no features.

### Adjacent data blocks coalesce into one read

`groupBlocks` sorts the R-tree's blocks by file offset and joins any two within
2KB of each other into one range request. BBI writes a chromosome's blocks
contiguously, so the blocks merge into far fewer reads:

| query                                     | blocks | reads |
| ----------------------------------------- | -----: | ----: |
| `cDC.bw` chr1, base resolution            |    896 |     1 |
| `ENCFF826FLP.bw` largest chrom, base      |    436 |     1 |
| `cDC.bw` 24 chroms × 2Mb, base resolution |    234 |    19 |
| `cDC.bw` whole-genome overview (zoomed)   |     19 |     3 |

`groupBlocks` sets the group's length to the `max` of its current length and the
new block's end, rather than to the new block's end. A block inside the group's
existing extent, such as a duplicate or one nested in a longer earlier block,
must not shrink the group, because a short group read would leave later blocks
decoding from truncated bytes.

### A query's independent reads go out together

Two loops issue several reads: one over the R-tree nodes at a level, and one
over the merged block groups. Both run six reads at a time via
`forEachWithReadahead`, so a query's wall-clock time is the longest of its reads
rather than their sum. `forEachWithReadahead` still passes results on in input
order, so no later step has to re-sort. It stores a rejection in that read's
slot and rethrows it in order, rather than propagating it at once, which would
leave the other in-flight rejections unhandled.

The limit is six because a browser runs at most six requests per origin on
HTTP/1.1. A request beyond what the transport runs in parallel lowers no
latency, and it keeps another group's compressed bytes, decompression output and
parsed arrays alive. The limit is deliberately not a constructor option, because
it multiplies with whatever fan-out the caller puts above it, so this module
cannot see the number that matters.

Read-ahead makes a multi-region BigWig query ~2.5× faster and a multi-region
BigBed query ~4× faster, at every latency tested, with byte-identical traffic.
[concurrency.md](concurrency.md) has the measurements, and explains why a query
whose blocks already merge into a handful of reads gains nothing.

### Many regions in one pass

`getFeaturesMulti` walks every region's index concurrently, dedupes the blocks
by file offset, and merges the reads for the union. A block that two regions
need is therefore fetched once and parsed once per region, and blocks from
_different_ regions merge into one read when they are adjacent on disk. The
table compares twenty adjacent 100kb windows on `cDC.bw` chr1, the layout a
genome browser renders, issued both ways:

| issued as                 | blocks | reads |   bytes |
| ------------------------- | -----: | ----: | ------: |
| one `getFeaturesMulti`    |     22 |     1 | 107,073 |
| 20 separate `getFeatures` |     42 |    21 | 206,810 |

The single call makes one read in place of 21 and halves the byte count, because
with separate calls, both windows that touch a boundary block download and
inflate it.

### `getRegionByteSize` reads no data blocks

`getRegionByteSize` totals the merged block reads a query would make, reading
only index nodes. Its cost is the `index` column of the table at the top, tenths
of a millisecond, against a download that may be megabytes, so a caller can use
it to decide whether to issue the query at all. The multi-region form dedupes by
offset and counts a block shared by overlapping regions once, as the fetch would
fetch it once.

## Decompression

Every data block on disk is individually zlib-compressed, so every read has to
inflate, and the table at the top shows that inflating takes half of a local
query. A Rust/WebAssembly libdeflater module does the inflating, ~2.5-3× faster
than a pure-JS inflate and 4-11× faster than the platform's
`DecompressionStream`. [wasm.md](wasm.md) has the fixtures and the numbers, and
explains why the platform API does so much worse on this file format than on
bgzf.

**JS calls into wasm once per block group, not once per block**.
`inflate_raw_batch` takes the whole fetched group plus a `Uint32Array` of
offsets and lengths and returns one buffer. A query inflating 896 blocks pays
for one call, one allocation and one copy out of wasm memory instead of 896 of
each. The output buffer is reserved at the true upper bound
(`blocks × uncompressBufSize`), so it never reallocates inside the grow-only
wasm heap.

Each block starts with a 2-byte zlib header, which `deflate_block` skips before
inflating with libdeflater's raw path. The raw path also skips the trailing
adler32 check, so a benchmark against this path has to skip it too to measure
the same work.

## Parsing records

### Typed arrays instead of objects

`getFeaturesAsArrays` fills packed `Int32Array`/`Float32Array`s and allocates no
per-record object. For a caller that can use it, that is the largest single gain
available, roughly 1.7-1.9× faster with 5× less memory:

| fixture                  | features | objects | arrays |  objects retained |   arrays retained |
| ------------------------ | -------: | ------: | -----: | ----------------: | ----------------: |
| `cDC.bw` chr1            |  917,130 |  78.1ms | 43.2ms | 79.1MB (90 B/rec) | 13.3MB (15 B/rec) |
| `variable_step_large.bw` |  500,000 |  45.0ms | 23.8ms |                 — |                 — |
| `ENCFF826FLP.bw`         |  445,460 |  32.6ms | 19.8ms | 34.2MB (80 B/rec) |  7.7MB (18 B/rec) |

Retained is `heapUsed + arrayBuffers` after a forced GC with the result still
live. `ArrayFeatureView` wraps the arrays in a JBrowse-style `get(i, key)`
interface for consumers that want feature-style access without paying for the
objects.

The typed-array readers reject BigBed rather than mis-parsing it. Their parsers
handle only fixed-width layouts, and the BigWig parser, given a variable-width
record with a trailing `rest` string, returns records that look plausible and
are garbage.

### The fused wasm call lowers memory use, not wall-clock time

`decompress_and_parse_bigwig` inflates a block _and_ walks its records _and_
applies the coordinate filter, in one call, returning packed arrays. We ran the
same single-region query through it and through the multi path (wasm inflate,
then JS array parse), alternating three runs each on `cDC.bw`, `ENCFF826FLP.bw`
and `variable_step_large.bw`, and the wall-clock times matched.

The fused entry points save memory, though not time, by keeping the decompressed
bytes out of the JS heap and never allocating records outside the query window.
The JS array path, by contrast, allocates `itemCount` slots per block and
`subarray`s them down afterwards. The typed-array table above measures the parse
optimization, and the fused call reduces the allocation behind it.

The matching wall-clock times also explain the routing in
[parser-selection.md](parser-selection.md). A multi-region call has one filter
per region and one shared set of blocks, so there is no single range to pass to
wasm, and the call takes the JS array parse instead. On these fixtures the JS
parse is no slower, which makes the multi path worth having.

### BigBed decodes `rest` only for records that survive the filter

The parser has to scan for each BigBed record's null terminator to find the next
record, but it does not have to decode the bytes in between, so it decodes
`rest` after the coordinate filter rather than before. The R-tree walk already
dropped the blocks that miss the query, so lazy decoding skips the out-of-range
records in a query's edge blocks, plus every re-parse in the multi-region path.
The table times the parse step per query, decoding lazily and eagerly:

| query                              |   lazy |  eager |
| ---------------------------------- | -----: | -----: |
| `clinvarCnv.bb` chr1, 100kb window | 0.25ms | 0.50ms |
| `clinvarCnv.bb` chr1, 1Mb window   | 0.25ms | 0.58ms |
| `clinvarCnv.bb` chr1, 10Mb window  | 0.28ms | 0.69ms |
| `clinvarCnv.bb` chr1, whole chrom  | 2.33ms | 2.64ms |

The narrower the window, the more of its edge blocks the filter throws away. A
whole-chromosome read, where the filter rejects nothing, takes about the same
time either way. Rendering a screenful corresponds to the first row, not the
last.

### Small things that add up

- **The parsers read uint64 fields as two uint32s**, not through `getBigUint64`.
  Every file offset in the R-tree and both B+ trees is one of these, and every
  one would otherwise allocate a BigInt to be immediately converted. Values
  below 2^53 are exact, which covers any real offset.
- **`rest`, autoSql and every B+ tree key decode through one shared
  `TextDecoder`**, and key parsing slices to the null terminator rather than
  decoding the padding and trimming afterwards.
- **`searchExtraIndex` dedupes before reading.** Many index entries for one name
  point into the same data block, because a block packs several records
  together. `searchExtraIndex` therefore dedupes the blocks by offset and passes
  them to `readFeatures` in one call per field, which merges their reads the
  same way as for a coordinate query.
- **The truncated-block check is per block, not per record.** A section declares
  its item count and a zoom block is a whole number of 32-byte records, so one
  comparison against the declared count covers the whole block and the parse
  loops are unchanged. It runs _before_ the typed arrays are sized, so a short
  block cannot size an allocation.
- **An uncompressed file never calls into wasm.** When
  `uncompressBufSize === 0`, the reader slices blocks straight out of the
  fetched group, including on the path that would otherwise use a fused call,
  because the fused entry points _are_ the decompressor.

## What the consumer has to do

Some of the largest gains are outside this library, because they depend on
decisions about the calling process rather than the file.

- **Put a caching, coalescing filehandle underneath.** bbi-js caches the header
  and the index but never a decompressed data block, so a repeat query re-reads
  and re-inflates. `RemoteFileWithRangeCache` from
  [`@gmod/range-cache-filehandle`](https://github.com/GMOD/range-cache-filehandle),
  the filehandle in the README's example, fetches in aligned blocks, joins
  contiguous runs and dedups in flight. It works alongside the block merging
  above rather than conflicting with it, because the filehandle dedups bytes
  while bbi-js decides which bytes to ask for.
- **Ask for arrays when you can.** For a caller that does not need one object
  per record, the table above shows 1.7-1.9× the speed with 5× less memory.
  `getFeaturesAsArraysMulti` packs every region into one backing buffer per
  field. With a single region, though, it serves the query from the fused
  parser, whose three arrays are views into _one_ buffer, so a `postMessage`
  transfer list must name each distinct buffer once.
- **Batch regions into one call.** `getFeaturesMulti` dedupes the blocks and
  merges reads across regions, as measured above, which a loop over
  `getFeatures` cannot do.
- **Pass `scale` or `basesPerSpan`.** BigWig zoom levels are pre-computed
  summaries. For the same 24 × 2Mb view of `cDC.bw`, a zoomed query reads 73
  features from 19 blocks in 3 reads, against 221,001 features from 234 blocks
  in 19 reads unzoomed. A query that omits both options reads unzoomed data no
  matter how far out the view is. The reader can use only the levels the file
  contains. `cDC.bw`'s coarsest reduction is 655,360 bases, and its finest is
  2,560, so a view below ~1.3kb/px reads unzoomed data however the option is
  set.
- **Bound your own fan-out.** The six-read limit applies per query, so a track
  fetching ten files at once has sixty reads outstanding. The caller's fan-out
  sets that peak, and bbi-js cannot see it; [concurrency.md](concurrency.md)
  measures it.
- **Gate on `getRegionByteSize`** before issuing a query that might be huge.

## What is left

**No block cache.** bbi-js caches only the index, so a pan that revisits a
window re-fetches and re-inflates it. We chose this deliberately for now,
because the filehandle layer can dedupe the bytes, which are the expensive half
remotely. As a result, every repeat query pays the inflate column of the first
table again, and that column is half of a local query. A parsed-block cache
would need a byte-bounded budget shared across files, as bam-js's does, rather
than an entry count.

**`@gmod/shared-read-cache` provides such a budget** in `SharedBudget`. bbi-js
already depends on that package for the header, index and R-tree node caches, so
a block cache would add no new dependency. `@gmod/bam` and `@gmod/tabix` both
pool their decompressed-chunk caches through a `SharedBudget`, and
`@gmod/tabix`'s
[ADR 0001](https://github.com/GMOD/tabix-js/blob/main/agent-docs/architecture-decision-records/0001-bound-the-chunk-cache-by-decompressed-bytes.md)
and
[ADR 0002](https://github.com/GMOD/tabix-js/blob/main/agent-docs/architecture-decision-records/0002-size-the-chunk-cache-above-one-query.md)
are the two things to read before sizing one. They bound a cache by decompressed
bytes rather than entries, and size it above one query's working set or not at
all.

Whether the repeated inflate is worth caching here is a measurement bbi-js still
has to make, on a pan rather than on a cold query. The caches listed above weigh
**entries**, so a block cache weighed in bytes cannot share a budget with them
or with bam's. A `SharedBudget` totals its members, so mixing units bounds
neither.

**bbi-js parses BigBed in JS.** BigBed records are variable-width and contain a
string, so bbi-js inflates them in wasm and parses them in JS, and has no
typed-array reader for them. The parse column for `clinvarCnv.bb` is small only
because the fixture is; a dense BigBed at base resolution has no fused path to
fall back on.

**bbi-js ignores BigBed zoom levels.** `BigBed.getView` returns the unzoomed
view at every scale, so bbi-js never reads the zoom levels `bedToBigBed` wrote.
For the same reason, BigBed gains more than BigWig from concurrent reads,
because every BigBed query reads unzoomed blocks spread across the file.

## Further reading

- [concurrency.md](concurrency.md) — how many range requests a query makes, and
  what overlapping them is worth over a simulated network link
- [wasm.md](wasm.md) — the decompressor, the batching, and the
  `DecompressionStream` comparison
- [parser-selection.md](parser-selection.md) — which of the four parsers a call
  reaches, and how they are held to agreement
- [api.md](api.md) — the read methods these decisions are visible through

To reproduce the tables, `pnpm benchonly` runs the inflate and BigWig
benchmarks, and `scripts/network-bench.sh` runs the latency ones. The phase
breakdown and the block and read counts came from temporary instrumentation in
`src/block-view.ts`, which is not committed.
