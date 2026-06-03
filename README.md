# bbi-js

[![NPM version](https://img.shields.io/npm/v/@gmod/bbi.svg?style=flat-square)](https://npmjs.org/package/@gmod/bbi)
![Build Status](https://img.shields.io/github/actions/workflow/status/GMOD/bbi-js/publish.yml?branch=main)

A parser for bigwig and bigbed file formats

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

You can use the `url` option or provide a custom filehandle from
[generic-filehandle2](https://github.com/GMOD/generic-filehandle2/):

```typescript
import { BigWig } from '@gmod/bbi'

// Using url directly
const file = new BigWig({
  url: 'https://example.com/file.bw',
})

// Or with a custom RemoteFile instance
import { RemoteFile } from 'generic-filehandle2'

const file = new BigWig({
  filehandle: new RemoteFile('https://example.com/file.bw'),
})

const header = await file.getHeader()
const features = await file.getFeatures('chr1', 0, 100, { scale: 1 })
```

### Using without npm (CDN)

You can use this library directly in the browser without npm by importing from
an ESM CDN like [esm.sh](https://esm.sh) (note that we don't necessarily
recommend CDN usage, it is just a way to test things easily):

```html
<script type="module">
  import { BigWig } from 'https://esm.sh/@gmod/bbi'

  const file = new BigWig({
    url: 'https://example.com/file.bw',
  })
  const header = await file.getHeader()
  const features = await file.getFeatures('chr1', 0, 100)
  console.log(features)
</script>
```

See the [example](./example/) folder for a complete working demo.

### How to parse BigBed results

BigBed features are returned as `{ start, end, rest, uniqueId }` where `rest`
is the raw tab-delimited text for BED columns 4+. Parse it with
[`@gmod/bed`](https://www.npmjs.com/package/@gmod/bed):

```typescript
import { BigBed } from '@gmod/bbi'
import BED from '@gmod/bed'

const file = new BigBed({ path: './data/hg18.bb' })
const { autoSql } = await file.getHeader()
const feats = await file.getFeatures('chr7', 0, 100000)
const parser = new BED({ autoSql })
const lines = feats.map(f => {
  const { start, end, rest, uniqueId } = f
  return parser.parseLine(`chr7\t${start}\t${end}\t${rest}`, { uniqueId })
})
```

`uniqueId` is derived from file offsets and deduplicates exact feature copies.

Feature before parsing:

```json
{ "start": 64068, "end": 64107, "rest": "uc003sil.1\t0\t-\t64068\t64068\t255,0,0\t.\tDQ584609", "uniqueId": "bb-171" }
```

Feature after parsing with `@gmod/bed`:

```json
{ "uniqueId": "bb-0", "chrom": "chr7", "chromStart": 54028, "chromEnd": 73584, "name": "uc003sii.2", "score": 0, "strand": -1, "thickStart": 54028, "thickEnd": 54028, "reserved": "255,0,0", "spID": "AL137655" }
```

## API Reference
## Classes

### ArrayFeatureView

Wraps a `BigWigFeatureArrays` or `SummaryFeatureArrays` result and exposes
a JBrowse-compatible `Feature`-style interface. Use `view.get(i, key)` to
read individual feature fields, or iterate with `view.length`.

#### Constructors

##### Constructor

```ts
new ArrayFeatureView(
   arrays, 
   source, 
   refName): ArrayFeatureView;
```

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `arrays` | \| [`BigWigFeatureArrays`](#bigwigfeaturearrays) \| [`SummaryFeatureArrays`](#summaryfeaturearrays) | typed arrays result from `getFeaturesAsArrays` |
| `source` | `string` | source identifier (e.g. track name) attached to each feature |
| `refName` | `string` | chromosome name attached to each feature |

###### Returns

[`ArrayFeatureView`](#arrayfeatureview)

#### Accessors

##### length

###### Get Signature

```ts
get length(): number;
```

Number of features in this view.

###### Returns

`number`

#### Methods

##### get()

```ts
get(i, key): string | number | boolean | undefined;
```

Returns the value of `key` for feature at index `i`.
Valid keys: `start`, `end`, `score`, `refName`, `source`, `summary`,
`minScore`, `maxScore`.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `i` | `number` |
| `key` | `string` |

###### Returns

`string` \| `number` \| `boolean` \| `undefined`

***

### BigBed

Parser for BigBed files. Inherits `getHeader`, `getFeatures`, and
`getFeaturesMulti` from `BBI`.

Features have an additional `rest` field containing raw tab-delimited BED
columns 4+, and a `uniqueId` derived from the file offset. No zoom levels
are used for BigBed data.

#### Extends

- `BBI`

#### Constructors

##### Constructor

```ts
new BigBed(args): BigBed;
```

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | \{ `filehandle?`: `GenericFilehandle`; `path?`: `string`; `renameRefSeqs?`: (`a`) => `string`; `url?`: `string`; \} | - |
| `args.filehandle?` | `GenericFilehandle` | a filehandle from generic-filehandle2 |
| `args.path?` | `string` | path to a local file |
| `args.renameRefSeqs?` | (`a`) => `string` | optional mapping function to rename internal reference sequence names before querying |
| `args.url?` | `string` | URL of a remote file |

###### Returns

[`BigBed`](#bigbed)

###### Inherited from

```ts
BBI.constructor
```

#### Methods

##### getFeatures()

```ts
getFeatures(
   refName, 
   start, 
   end, 
opts?): Promise<Feature[]>;
```

Fetches features for a single region.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `refName` | `string` | chromosome name as it appears in the file |
| `start` | `number` | 0-based half-open start coordinate |
| `end` | `number` | 0-based half-open end coordinate |
| `opts?` | [`RequestOptions2`](#requestoptions2) | optional scale/basesPerSpan for zoom level selection and AbortSignal |

###### Returns

`Promise`\<[`Feature`](#feature)[]\>

`Promise<Feature[]>` — empty array if refName not found or no
  features overlap the range

###### Inherited from

```ts
BBI.getFeatures
```

##### getFeaturesAsArrays()

```ts
getFeaturesAsArrays(
   refName, 
   start, 
   end, 
   opts?): Promise<
  | BigWigFeatureArrays
| SummaryFeatureArrays>;
```

Same query as `getFeatures` but returns typed arrays instead of an array
of objects, reducing GC pressure for large datasets.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `refName` | `string` | chromosome name as it appears in the file |
| `start` | `number` | 0-based half-open start coordinate |
| `end` | `number` | 0-based half-open end coordinate |
| `opts?` | [`RequestOptions2`](#requestoptions2) | optional scale/basesPerSpan for zoom level selection and AbortSignal |

###### Returns

`Promise`\<
  \| [`BigWigFeatureArrays`](#bigwigfeaturearrays)
  \| [`SummaryFeatureArrays`](#summaryfeaturearrays)\>

`Promise<BigWigFeatureArrays | SummaryFeatureArrays>` — use the
  `isSummary` discriminant to distinguish the two shapes

###### Inherited from

```ts
BBI.getFeaturesAsArrays
```

##### getFeaturesMulti()

```ts
getFeaturesMulti(regions, opts?): Promise<Feature[][]>;
```

Fetches features for many regions in a single pass. All regions share one
zoom level, and adjacent on-disk blocks are coalesced across region
boundaries, reducing range requests for whole-genome overviews.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `regions` | `object`[] | array of `{ refName, start, end }` query regions |
| `opts?` | [`RequestOptions2`](#requestoptions2) | same options as `getFeatures` |

###### Returns

`Promise`\<[`Feature`](#feature)[][]\>

`Promise<Feature[][]>` — one `Feature[]` per input region in the
  same order (`result[i]` corresponds to `regions[i]`)

###### Inherited from

```ts
BBI.getFeaturesMulti
```

##### getHeader()

```ts
getHeader(opts?): Promise<BigWigHeaderWithRefNames>;
```

Returns file header metadata including chromosome list, zoom levels, autoSql
definition, and summary statistics.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `opts?` | [`RequestOptions`](#requestoptions) | optional `RequestOptions` (e.g. `opts.signal` for abort) |

###### Returns

`Promise`\<[`BigWigHeaderWithRefNames`](#bigwigheaderwithrefnames)\>

`Promise<BigWigHeaderWithRefNames>`

###### Inherited from

```ts
BBI.getHeader
```

##### searchExtraIndex()

```ts
searchExtraIndex(name, opts?): Promise<object[]>;
```

Searches BigBed extra indexes (created via `-extraIndex` in `bedToBigBed`)
for a given name. A file may have multiple extra indexes, e.g. for gene ID
and gene name columns.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `name` | `string` | value to look up in the extra index |
| `opts` | [`RequestOptions`](#requestoptions) | optional `RequestOptions` (e.g. `opts.signal` for abort) |

###### Returns

`Promise`\<`object`[]\>

`Promise<Feature[]>` — matching features with an added `field`
  property indicating which extra-index column was matched

***

### BigWig

Parser for BigWig files. Inherits `getHeader`, `getFeatures`,
`getFeaturesMulti`, and `getFeaturesAsArrays` from `BBI`.

Supports zoom levels — pass `opts.scale` or `opts.basesPerSpan` to
automatically select the appropriate pre-computed zoom level.

#### Extends

- `BBI`

#### Constructors

##### Constructor

```ts
new BigWig(args): BigWig;
```

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `args` | \{ `filehandle?`: `GenericFilehandle`; `path?`: `string`; `renameRefSeqs?`: (`a`) => `string`; `url?`: `string`; \} | - |
| `args.filehandle?` | `GenericFilehandle` | a filehandle from generic-filehandle2 |
| `args.path?` | `string` | path to a local file |
| `args.renameRefSeqs?` | (`a`) => `string` | optional mapping function to rename internal reference sequence names before querying |
| `args.url?` | `string` | URL of a remote file |

###### Returns

[`BigWig`](#bigwig)

###### Inherited from

```ts
BBI.constructor
```

#### Methods

##### getFeatures()

```ts
getFeatures(
   refName, 
   start, 
   end, 
opts?): Promise<Feature[]>;
```

Fetches features for a single region.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `refName` | `string` | chromosome name as it appears in the file |
| `start` | `number` | 0-based half-open start coordinate |
| `end` | `number` | 0-based half-open end coordinate |
| `opts?` | [`RequestOptions2`](#requestoptions2) | optional scale/basesPerSpan for zoom level selection and AbortSignal |

###### Returns

`Promise`\<[`Feature`](#feature)[]\>

`Promise<Feature[]>` — empty array if refName not found or no
  features overlap the range

###### Inherited from

```ts
BBI.getFeatures
```

##### getFeaturesAsArrays()

```ts
getFeaturesAsArrays(
   refName, 
   start, 
   end, 
   opts?): Promise<
  | BigWigFeatureArrays
| SummaryFeatureArrays>;
```

Same query as `getFeatures` but returns typed arrays instead of an array
of objects, reducing GC pressure for large datasets.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `refName` | `string` | chromosome name as it appears in the file |
| `start` | `number` | 0-based half-open start coordinate |
| `end` | `number` | 0-based half-open end coordinate |
| `opts?` | [`RequestOptions2`](#requestoptions2) | optional scale/basesPerSpan for zoom level selection and AbortSignal |

###### Returns

`Promise`\<
  \| [`BigWigFeatureArrays`](#bigwigfeaturearrays)
  \| [`SummaryFeatureArrays`](#summaryfeaturearrays)\>

`Promise<BigWigFeatureArrays | SummaryFeatureArrays>` — use the
  `isSummary` discriminant to distinguish the two shapes

###### Inherited from

```ts
BBI.getFeaturesAsArrays
```

##### getFeaturesMulti()

```ts
getFeaturesMulti(regions, opts?): Promise<Feature[][]>;
```

Fetches features for many regions in a single pass. All regions share one
zoom level, and adjacent on-disk blocks are coalesced across region
boundaries, reducing range requests for whole-genome overviews.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `regions` | `object`[] | array of `{ refName, start, end }` query regions |
| `opts?` | [`RequestOptions2`](#requestoptions2) | same options as `getFeatures` |

###### Returns

`Promise`\<[`Feature`](#feature)[][]\>

`Promise<Feature[][]>` — one `Feature[]` per input region in the
  same order (`result[i]` corresponds to `regions[i]`)

###### Inherited from

```ts
BBI.getFeaturesMulti
```

##### getHeader()

```ts
getHeader(opts?): Promise<BigWigHeaderWithRefNames>;
```

Returns file header metadata including chromosome list, zoom levels, autoSql
definition, and summary statistics.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `opts?` | [`RequestOptions`](#requestoptions) | optional `RequestOptions` (e.g. `opts.signal` for abort) |

###### Returns

`Promise`\<[`BigWigHeaderWithRefNames`](#bigwigheaderwithrefnames)\>

`Promise<BigWigHeaderWithRefNames>`

###### Inherited from

```ts
BBI.getHeader
```

***

### BigWigFeature

Single-feature view into an `ArrayFeatureView`. Exposes a JBrowse-compatible
`Feature`-style `get(key)` interface and a `toJSON()` method.

Valid keys for `get()`: `start`, `end`, `score`, `refName`, `source`,
`summary`, `minScore`, `maxScore`.

#### Methods

##### get()

```ts
get(key): any;
```

Returns the value of `key` for this feature.
Valid keys: `start`, `end`, `score`, `refName`, `source`, `summary`,
`minScore`, `maxScore`.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |

###### Returns

`any`

##### toJSON()

```ts
toJSON(): object;
```

Returns a plain-object representation of this feature.

###### Returns

`object`

| Name | Type | Default value |
| ------ | ------ | ------ |
| `end` | `number` | - |
| `maxScore` | `number` \| `undefined` | - |
| `minScore` | `number` \| `undefined` | - |
| `refName` | `string` | `view.refName` |
| `score` | `number` | - |
| `source` | `string` | `view.source` |
| `start` | `number` | - |
| `summary` | `boolean` | `view.isSummary` |
| `uniqueId` | `string` | - |

## Interfaces

### BigWigFeatureArrays

Typed-array result for base-resolution BigWig features (`isSummary: false`).

***

### BigWigHeader

Raw parsed BigWig/BigBed file header (without chromosome maps).

#### Extended by

- [`BigWigHeaderWithRefNames`](#bigwigheaderwithrefnames)

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="autosql"></a> `autoSql` | `string` | autoSql schema string (BigBed only; empty string for BigWig). |

***

### BigWigHeaderWithRefNames

BigWig/BigBed file header including chromosome name and ID maps. Returned by `getHeader()`.

#### Extends

- [`BigWigHeader`](#bigwigheader)

#### Properties

| Property | Type | Description | Inherited from |
| ------ | ------ | ------ | ------ |
| <a id="autosql-1"></a> `autoSql` | `string` | autoSql schema string (BigBed only; empty string for BigWig). | [`BigWigHeader`](#bigwigheader).[`autoSql`](#autosql) |
| <a id="refsbyname"></a> `refsByName` | `Record`\<`string`, `number`\> | Map from chromosome name → internal integer ID. | - |
| <a id="refsbynumber"></a> `refsByNumber` | `Record`\<`number`, [`RefInfo`](#refinfo)\> | Map from internal integer ID → `RefInfo`. | - |

***

### Feature

A single feature returned by `getFeatures`.

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="end"></a> `end` | `number` | 0-based half-open end coordinate. |
| <a id="field"></a> `field?` | `number` | Extra-index column that matched during a `searchExtraIndex` call (BigBed only). |
| <a id="maxscore"></a> `maxScore?` | `number` | Maximum score in a summary interval (zoom data only). |
| <a id="minscore"></a> `minScore?` | `number` | Minimum score in a summary interval (zoom data only). |
| <a id="rest"></a> `rest?` | `string` | Raw tab-delimited BED columns 4+ (BigBed only). |
| <a id="score"></a> `score?` | `number` | Signal score (BigWig) or BED score (BigBed). |
| <a id="start"></a> `start` | `number` | 0-based half-open start coordinate. |
| <a id="summary"></a> `summary?` | `boolean` | True when the feature comes from a zoom/summary level. |
| <a id="uniqueid"></a> `uniqueId?` | `string` | Stable ID derived from the file offset; used to deduplicate exact copies (BigBed only). |

***

### RefInfo

Chromosome metadata from the BigWig/BigBed header.

***

### RequestOptions

Options accepted by all data-fetching methods.

#### Extended by

- [`RequestOptions2`](#requestoptions2)

***

### RequestOptions2

Options for `getFeatures` / `getFeaturesMulti` / `getFeaturesAsArrays`.

#### Extends

- [`RequestOptions`](#requestoptions)

#### Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="basesperspan"></a> `basesPerSpan?` | `number` | Bases per pixel — inverse of `scale`. Use one or the other. |
| <a id="scale"></a> `scale?` | `number` | Pixels per base pair — selects the zoom level whose `reductionLevel <= 2 / scale`. Omit for base-resolution data. |

***

### Statistics

Summary statistics stored in the BigWig file header.

***

### SummaryFeatureArrays

Typed-array result for zoom/summary BigWig features (`isSummary: true`).

***

### ZoomLevel

A zoom level entry from the BigWig file header.

## Functions

### parseBigWig()

```ts
function parseBigWig(bigwig, opts?): Promise<BigWigFeatureArrays[]>;
```

Reads all base-resolution features from every chromosome in a BigWig file.
Zoom levels and chromosomes with no data are skipped.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `bigwig` | [`BigWig`](#bigwig) | a `BigWig` instance |
| `opts?` | [`RequestOptions2`](#requestoptions2) | optional `RequestOptions` (e.g. `opts.signal` for abort) |

#### Returns

`Promise`\<[`BigWigFeatureArrays`](#bigwigfeaturearrays)[]\>

`Promise<BigWigFeatureArrays[]>` — one entry per chromosome that
  has data, in chromosome order

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
