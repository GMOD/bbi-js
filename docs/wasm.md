# Decompression (WebAssembly)

A Rust/WebAssembly module built on
[libdeflater](https://github.com/ebiggers/libdeflate) decompresses the blocks
and parses BigWig records from them. The API does not expose the module, and it
needs no setup or bundler config, so this page is for contributors and for
anyone wondering why the package contains wasm.

- [libdeflater inflates blocks ~2.5–3× faster than pako](#libdeflater-inflates-blocks-253-faster-than-pako)
- [Why not the platform's `DecompressionStream`?](#why-not-the-platforms-decompressionstream)
- [What runs in Rust](#what-runs-in-rust)
- [How it loads](#how-it-loads)
- [Benchmarking](#benchmarking)
- [Building](#building)
- [Packaging notes](#packaging-notes)

## libdeflater inflates blocks ~2.5–3× faster than pako

Every data block on disk is individually zlib-compressed, so every read has to
decompress, and a wide query inflates hundreds of blocks before it can return a
single feature.

`benchmarks/inflate.bench.ts` times the wasm path against
[pako](https://github.com/nodeca/pako), the pure-JS baseline, over the real
blocks of four fixtures. libdeflater is consistently **~2.5–3× faster**:

| Fixture                  | Compressed | Blocks | Speedup vs pako |
| ------------------------ | ---------- | ------ | --------------- |
| `volvox.bw`              | 139KB      | 49     | 2.9–3.8×        |
| `cow.bw`                 | 490KB      | 125    | 2.3–2.7×        |
| `ENCFF826FLP.bw`         | 2.0MB      | 436    | 2.6–2.8×        |
| `variable_step_large.bw` | 3.3MB      | 489    | 2.7–3.0×        |

Ranges are across three runs on one machine; treat them as an order of
magnitude, not a spec.

**This multiplier measures the decompression step in isolation, not a whole
query.** A query also spends time fetching bytes, walking the R-tree, and
building results. When a query reads a whole chromosome from a local file with a
warm page cache, inflate takes about half the time and building records the
other half; behind a network, fetching dominates
([optimizations.md](optimizations.md)). Don't quote 2.5–3× as a library-level
speedup.

## Why not the platform's `DecompressionStream`?

The browser has had a built-in inflate since 2023, which looks like a way to
delete this module and its ~65KB bundle. `DecompressionStream` measures
**roughly 4–11× slower than the wasm path, and 1.4–3.3× slower than even pako**,
so the module stays.

The table gives the best of three runs, as mean ms, over the same blocks and
with the same byte-identical assertion as above (`pnpm benchonly inflate`):

| Fixture                  | Blocks | wasm | pako | `DecompressionStream` |
| ------------------------ | ------ | ---- | ---- | --------------------- |
| `volvox.bw`              | 49     | 1.9  | 6.0  | 20.0                  |
| `cow.bw`                 | 125    | 5.4  | 16.6 | 38.2                  |
| `ENCFF826FLP.bw`         | 436    | 31   | 86   | 124                   |
| `variable_step_large.bw` | 489    | 29   | 62   | 109                   |

The gap comes from the file format rather than codec quality, because a bbi
file's blocks are individually zlib-compressed streams instead of members of one
concatenated stream. A caller therefore cannot pass the API a whole buffer and
has to make one call per block, hundreds per query. The `DecompressionStream`
column divided by the block count is **220–410 µs of overhead per call**, far
more than the inflating itself takes. The wasm path calls into wasm **once for
the whole block group**, through `inflate_raw_batch`, so it pays that cost a
single time per query instead of once per block, and the gap widens with block
count rather than with bytes.

Two structural points apply on top of the timing:

- **`DecompressionStream` cannot provide the fused calls.**
  `decompress_and_parse_bigwig` inflates and parses in one pass without copying
  the decompressed bytes into JS. A stream API can only return bytes, so the
  parse would have to move back to JS, which removes the reason the fused
  exports exist.
- **`DecompressionStream` has only been baseline since May 2023** (Safari 16.4,
  Firefox 113), so a library keeps a JS fallback regardless, and the bundle
  saving that motivates the question never happens.

The table shows Node numbers, where `DecompressionStream` is zlib with
comparatively little code around it. A browser adds the `Blob` → stream →
`Response` path on top, so read the column as the API's best case.

The `DecompressionStream` comparison comes out much closer for a sibling library
with a different block structure.
[`@gmod/bgzf-filehandle`](https://github.com/GMOD/bgzf-filehandle/blob/main/docs/optimizations.md)
decompresses concatenated gzip members, so a whole buffer goes through **one**
call and pays the per-call overhead once. There the same API comes within about
2× of wasm rather than 4–11×. The API and the codec underneath are the same in
both libraries; the difference is entirely how many times a caller has to invoke
the API.

## What runs in Rust

The crate has three entry points, all in
[`crate/src/lib.rs`](../crate/src/lib.rs):

| Export                         | Used for                           |
| ------------------------------ | ---------------------------------- |
| `inflate_raw_batch`            | BigBed blocks, and any raw inflate |
| `decompress_and_parse_bigwig`  | BigWig base-resolution blocks      |
| `decompress_and_parse_summary` | BigWig zoom/summary blocks         |

Some reads call none of them; [parser-selection.md](./parser-selection.md)
charts which of the four parsers a given call gets.

**Calls are batched.** The reader passes all of a query's blocks at once, packed
into a single input buffer with a `Uint32Array` of offsets and lengths, and gets
a single output buffer back. One call per block would pay for a JS↔wasm call and
a fresh allocation hundreds of times per query.

**Rust parses BigWig records as well as decompressing them.**
`decompress_and_parse_bigwig` inflates a block _and_ walks its fixed-width
records, returning packed `starts`/`ends`/`scores` arrays. `getFeaturesAsArrays`
returns those arrays as they are, so a base-resolution BigWig read allocates no
per-record JS object at all. BigBed records are variable-width and contain a
`rest` string, so bbi-js inflates them in wasm and parses them in JS. The same
layout is why the typed-array readers reject BigBed.

**Blocks are zlib streams, but the inflate is raw.** Each BBI block starts with
the 2-byte zlib header. `deflate_block` skips those two bytes and uses
libdeflater's raw-deflate path, which also skips the trailing adler32
verification. A benchmark comparing against this path has to skip both too to
measure the same work, as `pakoBatch` in the benchmark does.

The crate builds with `panic = "abort"`, so an out-of-bounds slice would trap
and leave the wasm instance unusable for every later call. Block slicing
therefore returns `Result` and raises a catchable JS error instead of indexing
directly.

## How it loads

webpack **inlines the `.wasm` as base64** into the JS bundle
(`src/wasm/inflate-wasm-inlined.js`), so node, browsers and bundlers all work
from a plain `npm install`, with no separate asset to fetch, copy or configure a
bundler for.

`crate/src/wrapper.ts` **instantiates the module lazily** on first use and
caches the instance. Every read method is already `async`, so lazy loading adds
nothing to the API, and callers have no `init()` to remember. In exchange, the
module holds instance state at module scope, which is one reason to avoid
shipping two copies of it (see below).

## Benchmarking

```bash
pnpm benchonly inflate
```

The benchmark pulls every base-resolution block out of a fixture's R-tree, packs
them the way `readBlocks` does, and times `unzipBatch` against pako and against
`DecompressionStream` over the same bytes. The benchmark gives pako a
`chunkSize` hint so that pako's time excludes growing its output buffer, and
**asserts that both paths produce byte-identical output before timing**, because
a decompression benchmark whose paths decode different bytes measures nothing
useful.

`pnpm bench` builds two git branches into `esm_branch1/` and `esm_branch2/` and
compares them against each other, to judge a change to this library rather than
wasm against JS.

## Building

```bash
pnpm build:wasm   # needs a Rust toolchain + wasm-bindgen
```

The build needs three tools, and the third is the usual cause of a failed build:

- rustup. `crate/rust-toolchain.toml` pins the Rust release and the
  `wasm32-unknown-unknown` target, and rustup installs both on the first build.
  Without the target, cargo stops at `can't find crate for 'core'`
- `wasm-bindgen-cli` at the version in `Cargo.lock`, which CI also reads to pin
  it
- a clang that can emit wasm. `libdeflate-sys` builds its C through cc-rs, and
  **Apple's clang has no WebAssembly backend**, so on macOS the build gets past
  cargo and then fails in the C step with
  `unable to create target: 'No available targets are compatible with triple "wasm32-unknown-unknown"'`.
  Install one that can (Homebrew's `llvm`) and point cc-rs at it with
  `CC=$(brew --prefix llvm)/bin/clang`.

Git tracks the generated bundle, so consumers and contributors who don't touch
the Rust need none of these tools. `pnpm build` still runs `build:wasm` first,
even when the Rust is unchanged, and **fails there** without them. Build the JS
alone with `pnpm build:esm && pnpm build:es5`.

### Keeping the bundle current

- CI's test and publish jobs both rebuild the bundle from `crate/`, so tests and
  the npm package always use wasm built from the source at that commit.
- `build:wasm` writes `crate/wasm-inputs.sha256`: a hash of every file in
  `crate/`, and a hash of the bundle it built. `pnpm check:wasm` runs first in
  CI and in `preversion`, and fails when either hash no longer matches, so a
  change to `crate/` can't land without its regenerated, committed bundle.
- The check compares inputs, not output bytes, because the bytes depend on the
  machine. `libdeflate-sys` compiles libdeflate's C with the system clang, and
  clang-20 and clang-21 emit different wasm. The npm bundle, built on CI's
  runner, therefore differs in bytes from the committed one built from the same
  source.
- `crate/rust-toolchain.toml` still pins rustc and `Cargo.lock` pins
  wasm-bindgen, so a rebuild on one machine is repeatable. `build-wasm.sh`
  remaps `~/.cargo` to `/cargo`, so the panic locations in the wasm contain no
  build machine paths.

## Packaging notes

Two decisions here, both following the convention in the shared GMOD notes, are
easy to "fix" and thereby break.

**The inlined bundle is `.js`, not `.mjs`.** With `allowJs: true`, tsc compiles
it per target: real ESM into `esm/`, real CommonJS into `dist/`. With a `.mjs`
name, tsc would _copy_ the bundle verbatim instead, and the CJS build would
reach it through `require(ESM)`. That works on modern node, but only because the
bundle happens to have no top-level await, so compiling is the sturdier option.

**Don't co-locate a hand-written `.d.mts` next to the bundle.** tsc reads
`.mjs` + `.d.mts` as a pre-built package and stops emitting the bundle to the
output directory, which is how `@gmod/bbi@9.0.11` shipped with a missing wasm
module. If you ever need richer types than tsc can infer, add a `.ts` wrapper
that imports the bundle and re-exports it typed.

Because `esm/` and `dist/` each contain a full copy, the ~62KB base64 bundle
ships twice (three times counting `src/`, which we publish for source maps). A
bundle that reaches both entry points also instantiates the wasm twice, since
the module holds init state at module scope. Going ESM-only would remove both
duplications, at the cost of a breaking major.
