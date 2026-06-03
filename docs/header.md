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
