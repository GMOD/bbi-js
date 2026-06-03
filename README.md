# bbi-js

[![NPM version](https://img.shields.io/npm/v/@gmod/bbi.svg?style=flat-square)](https://npmjs.org/package/@gmod/bbi)
![Build Status](https://img.shields.io/github/actions/workflow/status/GMOD/bbi-js/publish.yml?branch=main)

Parser for BigWig and BigBed file formats.

## Installation

```bash
npm install @gmod/bbi
```

## Usage

### Local files

```typescript
import { BigWig } from '@gmod/bbi'

const file = new BigWig({ path: 'volvox.bw' })
const header = await file.getHeader()
const features = await file.getFeatures('chr1', 0, 100, { scale: 1 })
```

### Remote files

```typescript
import { BigWig } from '@gmod/bbi'

const file = new BigWig({ url: 'https://example.com/file.bw' })
const features = await file.getFeatures('chr1', 0, 100, { scale: 1 })
```

You can also pass a custom filehandle from
[generic-filehandle2](https://github.com/GMOD/generic-filehandle2/):

```typescript
import { RemoteFile } from 'generic-filehandle2'

const file = new BigWig({
  filehandle: new RemoteFile('https://example.com/file.bw'),
})
```

### Browser (CDN)

```html
<script type="module">
  import { BigWig } from 'https://esm.sh/@gmod/bbi'

  const file = new BigWig({ url: 'https://example.com/file.bw' })
  const features = await file.getFeatures('chr1', 0, 100)
  console.log(features)
</script>
```

See the [example](./example/) folder for a complete working demo.

## API

### Constructor (BigWig / BigBed)

Pass exactly one of:

| Option | Description |
|---|---|
| `path` | Path to a local file |
| `url` | URL of a remote file |
| `filehandle` | A `GenericFilehandle` instance from [generic-filehandle2](https://www.npmjs.com/package/generic-filehandle2) |

### BigWig

#### `getFeatures(refName, start, end, opts?)`

Returns a `Promise<Feature[]>` for the given region. Returns an empty array if
the refName is not found or the region has no data. Coordinates are 0-based
half-open.

| Parameter | Description |
|---|---|
| `refName` | Chromosome/sequence name |
| `start` | 0-based start (inclusive) |
| `end` | 0-based end (exclusive) |
| `opts.scale` | Pixels per basepair — selects the zoom level where `reductionLevel ≤ 2/scale`. Omit for base resolution. |
| `opts.basesPerSpan` | Inverse of `scale` (basepairs per pixel) |
| `opts.signal` | `AbortSignal` to cancel the request |

```typescript
const features = await bigwig.getFeatures('chr1', 0, 100000)
// [{ start, end, score }, ...]
```

#### `getFeaturesMulti(regions, opts?)`

Fetches features for multiple regions in one call. Returns arrays aligned to
input order (`result[i]` corresponds to `regions[i]`).

Reads for adjacent on-disk blocks are coalesced across region boundaries, so a
whole-genome overview needs far fewer range requests than calling `getFeatures`
per region — useful for rate-limited remote files. Regions may be in any order
and may overlap.

```typescript
const perRegion = await bigwig.getFeaturesMulti([
  { refName: 'chr1', start: 0, end: 1_000_000 },
  { refName: 'chr2', start: 0, end: 1_000_000 },
])
```

#### `getFeaturesAsArrays(refName, start, end, opts?)`

Same parameters as `getFeatures`, but returns typed arrays instead of an array
of objects — more memory-efficient and lower GC pressure for large datasets.

```typescript
const result = await bigwig.getFeaturesAsArrays('chr1', 0, 100000)
// Base resolution: { starts: Int32Array, ends: Int32Array, scores: Float32Array, isSummary: false }

const summary = await bigwig.getFeaturesAsArrays('chr1', 0, 100000, { scale: 0.01 })
// Zoom level:    { starts, ends, scores, minScores: Float32Array, maxScores: Float32Array, isSummary: true }
```

The `isSummary` discriminant lets TypeScript narrow the union type:

```typescript
if (result.isSummary) {
  // minScores and maxScores are available here
}
```

Types:

```typescript
interface BigWigFeatureArrays {
  starts: Int32Array
  ends: Int32Array
  scores: Float32Array
  isSummary: false
}

interface SummaryFeatureArrays {
  starts: Int32Array
  ends: Int32Array
  scores: Float32Array
  minScores: Float32Array
  maxScores: Float32Array
  isSummary: true
}
```

#### Understanding zoom levels

`scale` (pixels per basepair) controls which pre-computed zoom level is served.
The file stores zoom levels at increasing `reductionLevel` values; the library
picks the first level where `reductionLevel ≤ 2/scale`, scanning from the
coarsest zoom inward:

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

If no zoom level matches (e.g. `scale: 1`), base-resolution data is returned.

### BigBed

#### `getFeatures(refName, start, end, opts?)`

Returns a `Promise<Feature[]>`. No zoom levels — always base resolution.

| Parameter | Description |
|---|---|
| `refName` | Chromosome/sequence name |
| `start` | 0-based start (inclusive) |
| `end` | 0-based end (exclusive) |
| `opts.signal` | `AbortSignal` to cancel the request |

#### `searchExtraIndex(name, opts?)`

Searches the BigBed [extra indexes](https://genome.ucsc.edu/goldenpath/help/bigBed.html)
(created with `-extraIndex` in `bedToBigBed`) for a string match. Returns a
`Promise<Feature[]>` with an additional `field` property indicating which index
matched.

### Parsing BigBed features with @gmod/bed

Raw BigBed features contain a `rest` field with tab-delimited columns 4+. Use
[@gmod/bed](https://www.npmjs.com/package/@gmod/bed) together with the
`autoSql` from the file header to parse them into named fields:

```typescript
import { BigBed } from '@gmod/bbi'
import BED from '@gmod/bed'

const file = new BigBed({ path: './data/hg18.bb' })
const { autoSql } = await file.getHeader()
const feats = await file.getFeatures('chr7', 0, 100000)
const parser = new BED({ autoSql })
const lines = feats.map(({ start, end, rest, uniqueId }) =>
  parser.parseLine(`chr7\t${start}\t${end}\t${rest}`, { uniqueId }),
)
```

Raw feature:

```json
{
  "chromId": 0,
  "start": 64068,
  "end": 64107,
  "rest": "uc003sil.1\t0\t-\t64068\t64068\t255,0,0\t.\tDQ584609",
  "uniqueId": "bb-171"
}
```

Parsed feature:

```json
{
  "uniqueId": "bb-0",
  "chrom": "chr7",
  "chromStart": 54028,
  "chromEnd": 73584,
  "name": "uc003sii.2",
  "score": 0,
  "strand": -1,
  "thickStart": 54028,
  "thickEnd": 54028,
  "reserved": "255,0,0",
  "spID": "AL137655"
}
```

The `uniqueId` is derived from the file offset and helps deduplicate exact
feature copies.

### `parseBigWig(bigwig, opts?)`

Reads all features from every chromosome at base resolution, skipping
chromosomes with no data.

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

Returns `Promise<BigWigFeatureArrays[]>`, one entry per chromosome with data.

### `ArrayFeatureView` / `BigWigFeature`

`ArrayFeatureView` wraps a `BigWigFeatureArrays` or `SummaryFeatureArrays`
result and exposes a JBrowse-compatible `Feature`-style interface.
`BigWigFeature` is a single-feature view into an `ArrayFeatureView`.

```typescript
import { BigWig, ArrayFeatureView } from '@gmod/bbi'

const file = new BigWig({ path: 'volvox.bw' })
const arrays = await file.getFeaturesAsArrays('chr1', 0, 100000)
const view = new ArrayFeatureView(arrays, 'mySource', 'chr1')

for (let i = 0; i < view.length; i++) {
  console.log(view.start(i), view.end(i), view.score(i))
}
```

`BigWigFeature` exposes `get(i, key)` and `toJSON()`. Valid keys: `start`,
`end`, `score`, `refName`, `source`, `summary`, `minScore`, `maxScore`.

## Publishing

[Trusted publishing](https://docs.npmjs.com/about-trusted-publishing) via GitHub
Actions.

```bash
pnpm version patch  # or minor/major
```

## Academic Use

This package was written with funding from the [NHGRI](http://genome.gov) as
part of the [JBrowse](http://jbrowse.org) project. If you use it in an academic
project that you publish, please cite the most recent JBrowse paper, which will
be linked from [jbrowse.org](http://jbrowse.org).

## License

MIT © [Colin Diesh](https://github.com/cmdcolin)
