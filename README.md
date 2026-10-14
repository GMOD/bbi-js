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
import { RemoteFile } from 'generic-filehandle2'

const local = new BigWig({ path: 'volvox.bw' }) // node only
const remote = new BigWig({ url: 'https://example.com/file.bw' })
const custom = new BigWig({
  filehandle: new RemoteFile('https://example.com/file.bw'),
})

const header = await remote.getHeader()
const features = await remote.getFeatures('chr1', 0, 100_000)
```

A query makes many small reads, often near the previous query's, and over HTTP
each read costs a request.
[`@gmod/range-cache-filehandle`](https://github.com/GMOD/range-cache-filehandle)
fetches the file in 256 KiB chunks, merges adjacent reads into one request, and
answers repeat reads from memory:

```typescript
import { RemoteFileWithRangeCache } from '@gmod/range-cache-filehandle'

const cached = new BigWig({
  filehandle: new RemoteFileWithRangeCache('https://example.com/file.bw'),
})
```

Its `CachedFilehandle` wraps a local file or `Blob` the same way, but matters
less there, since local reads are cheap and the OS caches them.

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

## Decompression

A Rust/WebAssembly [libdeflater](https://github.com/ebiggers/libdeflate) module
inflates the blocks, at ~2.5–3× a pure-JS inflate and roughly 4–11× the
browser's own
[`DecompressionStream`](docs/wasm.md#why-not-the-platforms-decompressionstream).
The build inlines the module into the bundle as base64, and the module loads
lazily, so there is nothing extra to install or configure. bbi-js then reads the
records with one of four parsers that all produce the same features, picking one
by the file's compression, the reader you called and the region count. Two of
the parsers run in JS, and two run inside the wasm call that inflates the
blocks.

## Migrating to v10

- **`renameRefSeqs` is gone.** Map chromosome names at the call site instead;
  see [docs/api.md](docs/api.md#constructor).
- **`RequestOptions.headers` is gone.** It only ever applied to header and index
  reads, never to feature blocks, and per-request headers do not fit the
  block-level caching. Set headers on the filehandle instead; see
  [docs/api.md](docs/api.md#constructor).

## Docs

- [docs/api.md](docs/api.md) — constructor, options, every read method, the
  `Feature` type, BigBed and the helpers
- [docs/optimizations.md](docs/optimizations.md) — where a query's time goes,
  and the decisions that follow from it
- [docs/concurrency.md](docs/concurrency.md) — how many range requests a query
  makes, and the measured effect of overlapping them
- [docs/parser-selection.md](docs/parser-selection.md) — which of the four
  record parsers a call reaches, and why each exists
- [docs/wasm.md](docs/wasm.md) — the Rust/WebAssembly decompressor
- [CONTRIBUTING.md](CONTRIBUTING.md) — development, release and publishing

## Academic Use

Written with [NHGRI](http://genome.gov) funding as part of
[JBrowse](http://jbrowse.org). If you use this in a publication, please cite the
most recent JBrowse paper at [jbrowse.org](http://jbrowse.org).

## License

MIT © [Colin Diesh](https://github.com/cmdcolin)
