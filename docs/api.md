# API

`BigWig` and `BigBed` share the same interface, except where noted.

## Constructor

Pass exactly one of `path` (a local file, node only), `url` (a remote file), or
`filehandle` (a `GenericFilehandle` from
[generic-filehandle2](https://www.npmjs.com/package/generic-filehandle2)).

Use `filehandle` when you need control over how the package fetches bytes — auth
headers, a custom `fetch`, a `Blob` from a file input:

```typescript
const file = new BigWig({
  filehandle: new RemoteFile('https://example.com/file.bw', {
    headers: { Authorization: `Bearer ${token}` },
  }),
})
```

Chromosome names are always the file's own names, both in query arguments and in
the `refsByName`/`refsByNumber` maps `getHeader()` returns. If your application
uses different names, map them at the call site:

```typescript
const toFileName = (name: string) => name.replace('chr', '')
const feats = await bigwig.getFeatures(toFileName('chr1'), 0, 100_000)
```

## Options

Every read method takes the same optional `opts`:

| Option         | Description                                                      |
| -------------- | ---------------------------------------------------------------- |
| `scale`        | Pixels per basepair — selects a [zoom level](#zoom-levels)       |
| `basesPerSpan` | Inverse of `scale` (basepairs per pixel); use one or the other   |
| `signal`       | `AbortSignal` to cancel the request                              |
| `onProgress`   | `(bytesDownloaded, totalBytes) => void`, called as blocks arrive |

`onProgress` reports a determinate fraction — the index supplies every block's
byte size, so the total is known up front — at block-group granularity:

```typescript
await bigwig.getFeatures('chr1', 0, 100_000, {
  onProgress: (downloaded, total) => console.log(`${downloaded}/${total}`),
})
```

Every read fires it at least once, starting at `(0, total)` and ending at
`(total, total)`. A query that overlaps no blocks — an unknown refName, an empty
region — reports the single call `(0, 0)`, so guard against a zero total before
dividing. The fraction only ever grows, but a read that lands out of order can
make it jump by more than one block group at a time.

## Reading features

### `getHeader(opts?)`

Returns `Promise<BigWigHeaderWithRefNames>` with the chromosome list
(`refsByName`, `refsByNumber`), zoom levels, summary statistics, and — for
BigBed files — the `autoSql` schema string. The first call caches the result.

### `getFeatures(refName, start, end, opts?)`

Returns a `Promise<Feature[]>` for the given region. Coordinates are 0-based
half-open. Returns an empty array if the refName is not found, the region has no
data, or `start >= end`.

```typescript
const features = await bigwig.getFeatures('chr1', 0, 100_000)
// [{ start, end, score }, ...]
```

### `getFeaturesMulti(regions, opts?)`

Fetches features for multiple regions in one call, returning
`Promise<Feature[][]>` aligned to input order (`result[i]` corresponds to
`regions[i]`). Regions may be in any order and may overlap.

Reads for adjacent on-disk blocks coalesce across region boundaries, so a
whole-genome overview needs far fewer range requests than calling `getFeatures`
per region — useful for rate-limited remote files.

```typescript
const perRegion = await bigwig.getFeaturesMulti([
  { refName: 'chr1', start: 0, end: 1_000_000 },
  { refName: 'chr2', start: 0, end: 1_000_000 },
])
```

### `getFeaturesAsArrays(refName, start, end, opts?)`

Same parameters as `getFeatures`, but returns typed arrays instead of an array
of objects — more memory-efficient and lower GC pressure for large datasets.
BigWig only; see [BigBed](#bigbed).

```typescript
const result = await bigwig.getFeaturesAsArrays('chr1', 0, 100_000)
// { starts: Int32Array, ends: Int32Array, scores: Float32Array, isSummary: false }

const summary = await bigwig.getFeaturesAsArrays('chr1', 0, 100_000, {
  scale: 0.01,
})
// { starts, ends, scores, minScores: Float32Array, maxScores: Float32Array, isSummary: true }
```

The `isSummary` discriminant narrows the union:

```typescript
if (result.isSummary) {
  // minScores and maxScores are available here
}
```

### `getFeaturesAsArraysMulti(regions, opts?)`

Multi-region counterpart of `getFeaturesAsArrays`, with the same cross-region
read coalescing as `getFeaturesMulti`. Instead of one object per region, all
regions share one backing set of typed arrays, and `regionOffsets` records where
each region's half-open slice begins. Pulling a region out is a `subarray` with
no copy. `regionOffsets` has length `regions.length + 1`.

```typescript
const multi = await bigwig.getFeaturesAsArraysMulti([
  { refName: 'ctgA', start: 0, end: 1000 },
  { refName: 'ctgA', start: 5000, end: 6000 },
])
// multi.regionOffsets -> [0, 998, 1998]

const secondRegionStarts = multi.starts.subarray(
  multi.regionOffsets[1],
  multi.regionOffsets[2],
)
```

Returns `BigWigFeatureArraysMulti | SummaryFeatureArraysMulti` — the shapes
above plus `regionOffsets: number[]`, discriminated by `isSummary` the same way.

## Estimating download size

### `getRegionByteSize(refName, start, end, opts?)`

Sums the compressed on-disk block lengths the index reports overlapping the
region, reading only the R-tree index — it downloads and decompresses no feature
blocks at all. An upper bound on what a `getFeatures` call over the same region
and zoom would transfer, for gating over-large downloads before they start.
Returns 0 if the refName is not found.

```typescript
const bytes = await bigwig.getRegionByteSize('chr1', 0, 100_000)
if (bytes < 5_000_000) {
  const features = await bigwig.getFeatures('chr1', 0, 100_000)
}
```

### `getRegionByteSizeMulti(regions, opts?)`

Multi-region counterpart. A block that two overlapping regions share counts
once, matching the single fetch `getFeaturesMulti` would make.

## Zoom levels

BigWig files store pre-computed summaries at increasing `reductionLevel` values.
The `scale` option (pixels per basepair) picks the first level where
`reductionLevel ≤ 2/scale`, scanning from the coarsest zoom inward:

```json
[
  { "reductionLevel": 40 },
  { "reductionLevel": 160 },
  { "reductionLevel": 640 },
  { "reductionLevel": 2560 },
  { "reductionLevel": 10240 },
  { "reductionLevel": 40960 },
  { "reductionLevel": 163840 }
]
```

If no zoom level matches (e.g. `scale: 1`), the read falls back to
base-resolution data.

## `Feature` type

Both `BigWig` and `BigBed` return `Feature` objects. Fields vary by file type
and zoom level:

| Field      | Present on                  | Description                                                                                                               |
| ---------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `start`    | always                      | 0-based half-open start                                                                                                   |
| `end`      | always                      | 0-based half-open end                                                                                                     |
| `score`    | BigWig                      | Signal value; mean over the interval on zoom data                                                                         |
| `rest`     | BigBed                      | Raw tab-delimited BED columns 4+, including the BED score                                                                 |
| `uniqueId` | BigBed                      | Block byte offset paired with the record's offset inside that block, so it is unique file-wide; deduplicates exact copies |
| `field`    | BigBed (`searchExtraIndex`) | Which extra-index column matched                                                                                          |
| `minScore` | zoom data                   | Minimum score across the summary interval                                                                                 |
| `maxScore` | zoom data                   | Maximum score across the summary interval                                                                                 |
| `summary`  | zoom data                   | `true` when the feature comes from a zoom level                                                                           |

```typescript
// BigWig, base resolution
{ start: 2, end: 3, score: 1 }

// BigWig, zoom level
{ start: 2, end: 10242, minScore: 1, maxScore: 32, score: 18.44677734375, summary: true }
```

## BigBed

`BigBed` supports every method above except the typed-array readers.
`getFeaturesAsArrays` and `getFeaturesAsArraysMulti` throw: BigBed records are
variable-width and carry a `rest` string, which does not fit a fixed-width typed
array. Use `getFeatures`/`getFeaturesMulti` instead.

bbi-js always reads BigBed at base resolution, so `scale`/`basesPerSpan` are
accepted but ignored — any zoom levels `bedToBigBed` wrote are not consulted.

### `searchExtraIndex(name, opts?)`

Searches the BigBed
[extra indexes](https://genome.ucsc.edu/goldenpath/help/bigBed.html) (created
with `-extraIndex` in `bedToBigBed`) for a string match. Returns a
`Promise<Feature[]>` with an additional `field` property indicating which index
matched.

### Parsing BigBed features with @gmod/bed

Raw BigBed features contain a `rest` field with tab-delimited columns 4+. Use
[@gmod/bed](https://www.npmjs.com/package/@gmod/bed) together with the `autoSql`
from the file header to parse them into named fields:

```typescript
import { BigBed } from '@gmod/bbi'
import BED from '@gmod/bed'

const file = new BigBed({ path: './data/hg18.bb' })
const { autoSql } = await file.getHeader()
const feats = await file.getFeatures('chr7', 0, 100_000)
const parser = new BED({ autoSql })
const lines = feats.map(({ start, end, rest, uniqueId }) =>
  parser.parseLine(`chr7\t${start}\t${end}\t${rest}`, { uniqueId }),
)
```

A raw feature, and the same feature parsed:

```json
{
  "start": 54028,
  "end": 73584,
  "rest": "uc003sii.2\t0\t-\t54028\t54028\t255,0,0\t.\tAL137655",
  "uniqueId": "bb-1083-0"
}
```

```json
{
  "chrom": "chr7",
  "chromStart": 54028,
  "chromEnd": 73584,
  "name": "uc003sii.2",
  "score": 0,
  "strand": -1,
  "thickStart": 54028,
  "thickEnd": 54028,
  "reserved": "255,0,0",
  "spID": "AL137655",
  "uniqueId": "bb-1083-0"
}
```

## Helpers

### `parseBigWig(bigwig, opts?)`

Reads all features from every chromosome at base resolution, skipping
chromosomes with no data. Returns `Promise<BigWigFeatureArrays[]>`, one entry
per chromosome with data.

```typescript
import { BigWig, parseBigWig } from '@gmod/bbi'

const file = new BigWig({ path: 'volvox.bw' })
const results = await parseBigWig(file)
for (const { starts, ends, scores } of results) {
  for (let i = 0; i < starts.length; i++) {
    console.log(starts[i], ends[i], scores[i])
  }
}
```

### `ArrayFeatureView` / `BigWigFeature`

`ArrayFeatureView` wraps a `BigWigFeatureArrays` or `SummaryFeatureArrays`
result and exposes a JBrowse-compatible `Feature`-style interface.
`BigWigFeature` is a single-feature view into an `ArrayFeatureView`.

```typescript
import { BigWig, ArrayFeatureView, BigWigFeature } from '@gmod/bbi'

const file = new BigWig({ path: 'volvox.bw' })
const arrays = await file.getFeaturesAsArrays('chr1', 0, 100_000)
const view = new ArrayFeatureView(arrays, 'mySource', 'chr1')

for (let i = 0; i < view.length; i++) {
  console.log(view.start(i), view.end(i), view.score(i))
}

// BigWigFeature binds an index, so it exposes get(key), id(), and toJSON()
const feature = new BigWigFeature(view, 0)
feature.get('score')
feature.toJSON()
```

`ArrayFeatureView.get(i, key)` reads one field of feature `i`. Valid keys for
either `get`: `start`, `end`, `score`, `refName`, `source`, `summary`,
`minScore`, `maxScore`.
