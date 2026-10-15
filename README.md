# bbi-js

[![NPM version](https://img.shields.io/npm/v/@gmod/bbi.svg?style=flat-square)](https://npmjs.org/package/@gmod/bbi)
![Build Status](https://img.shields.io/github/actions/workflow/status/GMOD/bbi-js/publish.yml?branch=main)

Parser for BigWig and BigBed file formats.

## Install

```bash
npm install @gmod/bbi
```

## Usage

```typescript
import { BigWig } from '@gmod/bbi'
import { RemoteFileWithRangeCache } from '@gmod/range-cache-filehandle'

const local = new BigWig({ path: 'volvox.bw' }) // node only

const remote = new BigWig({
  filehandle: new RemoteFileWithRangeCache('https://example.com/file.bw'),
})

const header = await remote.getHeader()
const features = await remote.getFeatures('chr1', 0, 100_000)
```

[`@gmod/range-cache-filehandle`](https://github.com/GMOD/range-cache-filehandle)
merges adjacent reads and answers repeat reads from memory.
`new BigWig({ url })` also works, without that cache.

### Browser (CDN)

```html
<script type="module">
  import { BigWig } from 'https://esm.sh/@gmod/bbi'

  const file = new BigWig({ url: 'https://example.com/file.bw' })
  const features = await file.getFeatures('chr1', 0, 100)
  console.log(features)
</script>
```

Note that such CDN usage makes you reliant on a third party service, esm.sh,
staying up, so it's not necessarily recommended for production usage, but it
does work

See the [example](./example/) folder for a complete working demo.

## Decompression

A Rust/WebAssembly [libdeflater](https://github.com/ebiggers/libdeflate) module,
inlined in the bundle as base64, inflates the blocks at ~2.5–3× a pure-JS
inflate, so there is nothing extra to install or configure. See
[docs/wasm.md](docs/wasm.md).

## Docs

- [docs/api.md](docs/api.md) — constructor, options, methods, types,
  BigWig/BigBed and helpers
- [docs/optimizations.md](docs/optimizations.md) — decisions we made to improve
  performance
- [docs/concurrency.md](docs/concurrency.md) — how many range requests a query
  makes
- [docs/parser-selection.md](docs/parser-selection.md) — decision tree showing
  decoding workflow
- [docs/wasm.md](docs/wasm.md) — description of the Rust/WebAssembly
  decompressor
- [CONTRIBUTING.md](CONTRIBUTING.md) — development, release and publishing

## Academic Use

Written with [NHGRI](http://genome.gov) funding as part of
[JBrowse](http://jbrowse.org). If you use this in a publication, please cite the
most recent JBrowse paper at [jbrowse.org](http://jbrowse.org).

## License

MIT © [Colin Diesh](https://github.com/cmdcolin)
