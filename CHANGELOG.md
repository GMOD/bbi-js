## [10.0.2](https://github.com/GMOD/bbi-js/compare/v10.0.1...v10.0.2) (2026-08-04)

### Bug Fixes

- Stop one aborted caller from rejecting concurrent callers

### Chores

- Sha-pin actions, take pnpm version from packageManager, node 24
- Pin pnpm via the `packageManager` field, so local pnpm and CI agree
- Share one eslint-plugin-unicorn opt-out list across the repos
- Turn off unicorn/prefer-early-return across the repos
- Add git-cliff for changelog generation

### Documentation

- Restructure README; drop the dead RequestOptions.headers
- Move the wasm notes into docs/wasm.md, leave a pointer in the README
- Backfill CHANGELOG.md for v9.0.11 through v10.0.1
- Mark breaking changes in the generated changelog

### Other Changes

- Measure wasm vs pure-JS deflate, cite the number in the README

## [Unreleased](https://github.com/GMOD/bbi-js/compare/v10.0.1...HEAD)

### Bug Fixes

* remove the dead `RequestOptions.headers` option — it was forwarded on header/index reads but every feature-block read built its own request object, so a caller relying on it for auth would 401 fetching data blocks ([b4d1f97](https://github.com/GMOD/bbi-js/commit/b4d1f973f7c9677e571515d744decdbf097c6f3d))

## [10.0.1](https://github.com/GMOD/bbi-js/compare/v10.0.0...v10.0.1) (2026-07-25)

### Performance Improvements

* replace the DataView BigInt64 polyfill with direct 32-bit-half reads for B+/R-tree entries — every call site immediately converted the BigInt to `Number`, so the allocation was pure overhead ([de6e162](https://github.com/GMOD/bbi-js/commit/de6e1629ca4aa12f77e4f54eaac270acdf76f703))
* mark non-barrel modules side-effect-free so bundlers can tree-shake unused exports ([63d536c](https://github.com/GMOD/bbi-js/commit/63d536c8458a458cff0f4d76cd8393a259570cb1))

# [10.0.0](https://github.com/GMOD/bbi-js/compare/v9.3.3...v10.0.0) (2026-07-25)

### BREAKING CHANGES

* the `renameRefSeqs` constructor option is removed. It rewrote both the header's `refsByName`/`refsById` names and every query name, so the names `getHeader()` reported were not reliably the names you could query with unless the callback happened to be idempotent. Map names at the call site instead ([ee986a7](https://github.com/GMOD/bbi-js/commit/ee986a7f05b211b3cf07477e3bd7636585b7d4fb))
* `getFeaturesAsArrays`/`getFeaturesAsArraysMulti` now throw when called on a `BigBed` instead of silently returning garbage — the typed-array readers only understand fixed-width BigWig/summary record layouts ([ee986a7](https://github.com/GMOD/bbi-js/commit/ee986a7f05b211b3cf07477e3bd7636585b7d4fb))

### Bug Fixes

* zero-length ranges (`start === end === 0`) returned unfiltered data through the typed-array readers instead of an empty result, since the wasm parsers treated that as a "no filter" sentinel that collides with a legitimate query; at zoom levels this also disabled chromosome filtering so other chromosomes' features leaked in ([ee986a7](https://github.com/GMOD/bbi-js/commit/ee986a7f05b211b3cf07477e3bd7636585b7d4fb))
* corrupt block offsets/lengths could index out of bounds inside the wasm batch parsers; since the wasm crate builds with `panic = "abort"`, this trapped and left the whole wasm instance unusable for every later call. Bounds are now checked and a catchable error is thrown instead ([ee986a7](https://github.com/GMOD/bbi-js/commit/ee986a7f05b211b3cf07477e3bd7636585b7d4fb))
* the R-tree node overlap test used inclusive bounds, pulling in nodes that merely abut the query instead of overlapping it; now matches UCSC's `cirTreeOverlaps` exactly, which also tightens `getRegionByteSize` estimates ([ee986a7](https://github.com/GMOD/bbi-js/commit/ee986a7f05b211b3cf07477e3bd7636585b7d4fb))
* `groupBlocks` could shrink a group's extent when a block was fully contained within the previous block's span, truncating the read ([ee986a7](https://github.com/GMOD/bbi-js/commit/ee986a7f05b211b3cf07477e3bd7636585b7d4fb))
* `readIndices` misparsed the main file header as an extension header when `extHeaderOffset` was `0` (i.e. no extension header present) ([ee986a7](https://github.com/GMOD/bbi-js/commit/ee986a7f05b211b3cf07477e3bd7636585b7d4fb))

### Performance Improvements

* `getFeaturesMulti`/`getFeaturesAsArraysMulti` now collect R-tree blocks for all regions concurrently instead of sequentially, sharing the node cache across regions — a whole-genome multi-region read dropped from 12.2ms to 4.9ms ([ee986a7](https://github.com/GMOD/bbi-js/commit/ee986a7f05b211b3cf07477e3bd7636585b7d4fb))
* the chromosome B+ tree no longer spends an extra read just to learn a node's item count, since `blockSize` is already in the tree header — `getHeader` x50 dropped from 28ms to 13ms ([ee986a7](https://github.com/GMOD/bbi-js/commit/ee986a7f05b211b3cf07477e3bd7636585b7d4fb))
* `searchExtraIndex` now groups matched blocks per field into a single `readFeatures` call instead of one read per match, so a 267-hit query costs the same number of reads as a 1-hit query ([ee986a7](https://github.com/GMOD/bbi-js/commit/ee986a7f05b211b3cf07477e3bd7636585b7d4fb))

## [9.3.3](https://github.com/GMOD/bbi-js/compare/v9.3.2...v9.3.3) (2026-07-15)

### Features

* add `getRegionByteSize`/`getRegionByteSizeMulti`, which sum R-tree block byte lengths without reading or decompressing data blocks, for gating over-large fetches before they start ([4d17c32](https://github.com/GMOD/bbi-js/commit/4d17c32cdb25b74561d1c6182b01ada22884d404))

## [9.3.2](https://github.com/GMOD/bbi-js/compare/v9.3.1...v9.3.2) (2026-07-01)

### Bug Fixes

* `searchExtraIndex`'s B+ tree binary search used locale-aware string comparison, but `bedToBigBed` sorts keys in byte order — locale collation reordered underscores/mixed case, so some names (e.g. `Metazoa_SRP`, `YWHAH`) were silently unfindable. Fixed with a byte-order comparator ([8377d65](https://github.com/GMOD/bbi-js/commit/8377d656941e8c47f6556dac9c661b9370803b78))
* `searchExtraIndex` returned only one matching entry per name, but a name maps to one entry per record (e.g. every transcript of a gene) and those entries can point at different data blocks; it now collects and dedupes the whole run of matching entries ([8377d65](https://github.com/GMOD/bbi-js/commit/8377d656941e8c47f6556dac9c661b9370803b78))

## [9.3.1](https://github.com/GMOD/bbi-js/compare/v9.3.0...v9.3.1) (2026-06-26)

### Bug Fixes

* pass only `signal` (not the full read options) through to the filehandle for R-tree header reads, so bbi's own `onProgress` callback isn't misfired for internal index reads — required to stay compatible with generic-filehandle2 2.2.0's new `onProgress` option ([90235c1](https://github.com/GMOD/bbi-js/commit/90235c1e285d0f7712b96df6ab38b7c40954942f))

# [9.3.0](https://github.com/GMOD/bbi-js/compare/v9.2.1...v9.3.0) (2026-06-26)

### Features

* add `getFeaturesAsArraysMulti`, the multi-region counterpart of `getFeaturesAsArrays` — combines the block-coalescing of `getFeaturesMulti` with typed-array output, sharing one backing set of typed arrays across regions via a `regionOffsets` index ([5d69625](https://github.com/GMOD/bbi-js/commit/5d69625881508201109e5acd996111ee4dda3b38))

## [9.2.1](https://github.com/GMOD/bbi-js/compare/v9.2.0...v9.2.1) (2026-06-19)

### Features

* `getFeatures`/`getFeaturesMulti`/`getFeaturesAsArrays` accept an `onProgress(bytesDownloaded, totalBytes)` callback, reported at block-group granularity and determinate from the first tick since block byte sizes are known up front from the R-tree index ([fef25bf](https://github.com/GMOD/bbi-js/commit/fef25bfd63d7fbac64da44ad731e016e32a083ed))
* expand JSDoc across the public API and export additional public types ([192dac5](https://github.com/GMOD/bbi-js/commit/192dac5af663a8782a1c624a561d7c83e823b60d))

# [9.2.0](https://github.com/GMOD/bbi-js/compare/v9.1.0...v9.2.0) (2026-06-03)

### Features

* add `getFeaturesMulti(regions, opts)`, which coalesces R-tree blocks across multiple regions into one set of reads instead of one request per region — on a 25-chromosome whole-genome overview this cut 27 reads/691KB to 3 reads/312KB with byte-identical features ([e91d4e9](https://github.com/GMOD/bbi-js/commit/e91d4e9adce3cdc50437023a26e3daecd864591f))

# [9.1.0](https://github.com/GMOD/bbi-js/compare/v9.0.17...v9.1.0) (2026-05-29)

### Bug Fixes

* the BigInt64 native-support check tested `'getBigInt64' in DataView` (the constructor) instead of `DataView.prototype`, so it was always false and the slow JS polyfill silently overrode the native `getBigInt64`/`getBigUint64` in every environment ([e87c8d8](https://github.com/GMOD/bbi-js/commit/e87c8d8b3b6b388b1f55661a8d58cfb28b0d9135))
* detect a truncated `autoSql` string (null terminator past the probed buffer) and refetch a larger buffer instead of returning truncated data ([e87c8d8](https://github.com/GMOD/bbi-js/commit/e87c8d8b3b6b388b1f55661a8d58cfb28b0d9135))
* BigBed `uniqueId` used a packed `blockOffset*256 + recordStart` encoding that could collide across records; replaced with a `bb-<blockOffset>-<recordStart>` string that's unique by construction ([e87c8d8](https://github.com/GMOD/bbi-js/commit/e87c8d8b3b6b388b1f55661a8d58cfb28b0d9135))
* the JS parse paths used `end >= reqStart` for feature-interval overlap while the wasm path used `end > reqStart`, so the same file could return different features at exact region boundaries depending on whether it was compressed. Both now agree on the correct half-open-interval `>` test ([4870670](https://github.com/GMOD/bbi-js/commit/4870670200c9e22408bc39edf944692485613a10))

### Performance Improvements

* rewrite the BigWig/summary wasm parse loops to iterate fixed-size records via `chunks_exact` instead of per-field byte indexing, removing per-field bounds checks from the hot loop (varstep -16%, fixedStep -11%, bedGraph -6%); also drops dead wasm exports, shrinking the wasm bundle 39.6KB -> 33.9KB ([6514b12](https://github.com/GMOD/bbi-js/commit/6514b1277b18f3654245dd9d42c11919754912ff))

## [9.0.17](https://github.com/GMOD/bbi-js/compare/v9.0.16...v9.0.17) (2026-05-19)

## [9.0.16](https://github.com/GMOD/bbi-js/compare/v9.0.15...v9.0.16) (2026-05-18)

### Features

* restore `any` as `BigWigFeature.get`'s fallback return type, matching JBrowse's `Feature.get(name): any`, so `BigWigFeature` stays structurally assignable to `Feature` without a cast ([e04150b](https://github.com/GMOD/bbi-js/commit/e04150b687978afe2ce8d09d3510ad5f59625a04))

## [9.0.15](https://github.com/GMOD/bbi-js/compare/v9.0.14...v9.0.15) (2026-05-18)

## [9.0.14](https://github.com/GMOD/bbi-js/compare/v9.0.13...v9.0.14) (2026-05-18)

## [9.0.13](https://github.com/GMOD/bbi-js/compare/v9.0.12...v9.0.13) (2026-05-18)

## [9.0.12](https://github.com/GMOD/bbi-js/compare/v9.0.11...v9.0.12) (2026-05-18)

### Bug Fixes

* **published package was broken:** the wasm-inlined decompression bundle (`src/wasm/inflate-wasm-inlined.js`) was gitignored, so it never reached the published `esm/`/`dist/` output — importing `@gmod/bbi@9.0.11` failed with `Can't resolve './wasm/inflate-wasm-inlined.js'`. Fixed by tracking the bundle in git and copying it into both build outputs, plus a pack-and-import smoke test (`pnpm test:pack`) wired into CI and `preversion` so this class of break can't ship silently again ([6bd5715](https://github.com/GMOD/bbi-js/commit/6bd571583e07413be9464dfb7963797fda53de10))

## [9.0.11](https://github.com/GMOD/bbi-js/compare/v9.0.10...v9.0.11) (2026-05-18)

### Bug Fixes

* fix `uniqueId` collision in `parseBigBedBlock` — offsets were combined by addition, which could produce the same id for two different records; now joined with `-` ([6482626](https://github.com/GMOD/bbi-js/commit/6482626302637535612f13cf7791301c03421fdc))
* propagate `AbortSignal` to chromosome-tree reads in `_readChromosomeTree`, which previously ignored it ([6482626](https://github.com/GMOD/bbi-js/commit/6482626302637535612f13cf7791301c03421fdc))
* summary score returns `0` when `validCnt` is `0` instead of a nonsense fallback value ([6482626](https://github.com/GMOD/bbi-js/commit/6482626302637535612f13cf7791301c03421fdc))
* harden the autoSql decode against a missing null terminator ([03a52d3](https://github.com/GMOD/bbi-js/commit/03a52d38d36eb82371e34dcf550239df2e6c97c5))

## [9.0.10](https://github.com/GMOD/bbi-js/compare/v9.0.9...v9.0.10) (2026-04-27)


### Bug Fixes

* add non-null assertions for noUncheckedIndexedAccess compliance ([3d67c8c](https://github.com/GMOD/bbi-js/commit/3d67c8cf989a15872b667b094e1d65b5f98ee95a))

## [9.0.9](https://github.com/GMOD/bbi-js/compare/v9.0.8...v9.0.9) (2026-04-04)

## [9.0.8](https://github.com/GMOD/bbi-js/compare/v9.0.7...v9.0.8) (2026-04-04)

## [9.0.7](https://github.com/GMOD/bbi-js/compare/v9.0.6...v9.0.7) (2026-04-02)

## [9.0.6](https://github.com/GMOD/bbi-js/compare/v9.0.5...v9.0.6) (2026-04-02)

## [9.0.5](https://github.com/GMOD/bbi-js/compare/v9.0.4...v9.0.5) (2026-04-02)

## [9.0.4](https://github.com/GMOD/bbi-js/compare/v9.0.3...v9.0.4) (2026-03-28)

## [9.0.3](https://github.com/GMOD/bbi-js/compare/v9.0.2...v9.0.3) (2026-03-28)

## [9.0.2](https://github.com/GMOD/bbi-js/compare/v9.0.1...v9.0.2) (2026-03-28)

## [9.0.1](https://github.com/GMOD/bbi-js/compare/v9.0.0...v9.0.1) (2026-03-28)

# [9.0.0](https://github.com/GMOD/bbi-js/compare/v8.1.2...v9.0.0) (2026-03-20)

## [8.1.2](https://github.com/GMOD/bbi-js/compare/v8.1.1...v8.1.2) (2026-03-20)

## [8.1.1](https://github.com/GMOD/bbi-js/compare/v8.1.0...v8.1.1) (2026-01-06)



# [8.1.0](https://github.com/GMOD/bbi-js/compare/v8.0.4...v8.1.0) (2025-12-25)



## [8.0.4](https://github.com/GMOD/bbi-js/compare/v8.0.3...v8.0.4) (2025-12-17)



## [8.0.3](https://github.com/GMOD/bbi-js/compare/v8.0.2...v8.0.3) (2025-12-16)



## [8.0.2](https://github.com/GMOD/bbi-js/compare/v8.0.1...v8.0.2) (2025-12-16)



## [8.0.1](https://github.com/GMOD/bbi-js/compare/v8.0.0...v8.0.1) (2025-12-16)



# [8.0.0](https://github.com/GMOD/bbi-js/compare/v7.1.0...v8.0.0) (2025-12-11)



# [7.1.0](https://github.com/GMOD/bbi-js/compare/v7.0.5...v7.1.0) (2025-11-09)



## [7.0.5](https://github.com/GMOD/bbi-js/compare/v7.0.4...v7.0.5) (2025-06-10)



## [7.0.4](https://github.com/GMOD/bbi-js/compare/v7.0.3...v7.0.4) (2025-06-07)



## [7.0.3](https://github.com/GMOD/bbi-js/compare/v7.0.2...v7.0.3) (2025-05-16)



## [7.0.2](https://github.com/GMOD/bbi-js/compare/v7.0.1...v7.0.2) (2025-05-13)



## [7.0.2](https://github.com/GMOD/bbi-js/compare/v7.0.1...v7.0.2) (2025-05-13)



## [7.0.1](https://github.com/GMOD/bbi-js/compare/v7.0.0...v7.0.1) (2025-04-30)



# [7.0.0](https://github.com/GMOD/bbi-js/compare/v6.0.3...v7.0.0) (2025-04-30)



## [6.0.3](https://github.com/GMOD/bbi-js/compare/v6.0.2...v6.0.3) (2025-04-11)



## [6.0.2](https://github.com/GMOD/bbi-js/compare/v6.0.1...v6.0.2) (2025-03-18)



## [6.0.1](https://github.com/GMOD/bbi-js/compare/v6.0.0...v6.0.1) (2024-12-12)



# [6.0.0](https://github.com/GMOD/bbi-js/compare/v5.0.2...v6.0.0) (2024-12-12)



## [5.0.2](https://github.com/GMOD/bbi-js/compare/v5.0.1...v5.0.2) (2024-09-03)



## [5.0.1](https://github.com/GMOD/bbi-js/compare/v5.0.0...v5.0.1) (2024-08-09)



# [5.0.0](https://github.com/GMOD/bbi-js/compare/v4.0.6...v5.0.0) (2024-08-09)



## [4.0.6](https://github.com/GMOD/bbi-js/compare/v4.0.5...v4.0.6) (2024-07-23)

- Use renamed abortable-promise-cache -> @gmod/abortable-promise-cache

## [4.0.5](https://github.com/GMOD/bbi-js/compare/v4.0.4...v4.0.5) (2024-06-19)

- Improved linting


## [4.0.4](https://github.com/GMOD/bbi-js/compare/v4.0.3...v4.0.4) (2024-3-5)



- Fix issue fetching data from file where refNames are not sorted (#59)

## [4.0.3](https://github.com/GMOD/bbi-js/compare/v4.0.2...v4.0.3) (2024-01-16)

### Performance Improvements

- optimize `parseBigBedBlock` ([#58](https://github.com/GMOD/bbi-js/issues/58))
  ([eb3f7a4](https://github.com/GMOD/bbi-js/commit/eb3f7a4885c4e8262c6e3e63696b533e53072463))

* Small perf improvement (#58)

## [4.0.2](https://github.com/GMOD/bbi-js/compare/v4.0.1...v4.0.2) (2023-07-30)

- Fix issue with fetching headers that are large in certain cases

## [4.0.1](https://github.com/GMOD/bbi-js/compare/v4.0.0...v4.0.1) (2023-07-13)

- Fix eslint plugin being in dependencies Accidentally

# [4.0.0](https://github.com/GMOD/bbi-js/compare/v3.0.1...v4.0.0) (2023-05-05)

- Improve typescripting, refactoring
- Options argument only accepts {signal}, not just signal now

## [3.0.1](https://github.com/GMOD/bbi-js/compare/v3.0.0...v3.0.1) (2023-04-21)

### Features

- explicit buffer import ([#53](https://github.com/GMOD/bbi-js/issues/53))
  ([2699c98](https://github.com/GMOD/bbi-js/commit/2699c983dea380bbb56773058ba3f233c833d9c8))

* Add explicit Buffer import

# [3.0.0](https://github.com/GMOD/bbi-js/compare/v2.0.5...v3.0.0) (2023-01-11)

- Update to rxjs 7

## [2.0.5](https://github.com/GMOD/bbi-js/compare/v2.0.4...v2.0.5) (2022-12-17)

- Cleanup package.json and README

## [2.0.4](https://github.com/GMOD/bbi-js/compare/v2.0.3...v2.0.4) (2022-10-15)

- Use plain TextDecoder for decoding autoSql

## [2.0.3](https://github.com/GMOD/bbi-js/compare/v2.0.2...v2.0.3) (2022-10-10)

- Add BigInt64 polyfill for older safari

## [2.0.2](https://github.com/GMOD/bbi-js/compare/v2.0.1...v2.0.2) (2022-07-18)

- Make basesCovered a number instead of BigInt

## [2.0.1](https://github.com/GMOD/bbi-js/compare/v2.0.0...v2.0.1) (2022-07-18)

- Bump generic-filehandle 2->3

# [2.0.0](https://github.com/GMOD/bbi-js/compare/v1.0.35...v2.0.0) (2022-07-18)

- Use binary-parser instead of @gmod/binary-parser, with some optimizations.
  This uses BigInt and TextDecoder, so requires a major version bump

## [1.0.35](https://github.com/GMOD/bbi-js/compare/v1.0.34...v1.0.35) (2022-04-22)

- Produce actual ESM module for the "module" field in package.json, was commonJS
- Add sourceMap:true to tsconfig

## [1.0.34](https://github.com/GMOD/bbi-js/compare/v1.0.33...v1.0.34) (2022-03-11)

### Reverts

- Revert "Use subarray instead of slice since slice is deprecated under node
  xref 'https://nodejs.org/api/buffer.html#bufslicestart-end'"
  ([44116cc](https://github.com/GMOD/bbi-js/commit/44116cce54601727d37f1c449bfcc60c1b4e602d))

* Back to slice instead of subarray, as subarray returned a UInt8Array instead
  of a true Buffer

## [1.0.33](https://github.com/GMOD/bbi-js/compare/v1.0.32...v1.0.33) (2022-02-25)

- Use subarray instead of slice since slice is deprecated under node xref
  'https://nodejs.org/api/buffer.html#bufslicestart-end'"

## [1.0.32](https://github.com/GMOD/bbi-js/compare/v1.0.31...v1.0.32) (2022-02-16)

- Use pako to decode on command line instead of using zlib to avoid need to
  manually polyfill zlib

## [1.0.31](https://github.com/GMOD/bbi-js/compare/v1.0.30...v1.0.31) (2021-12-14)

- Add esm module builds with less babelification for smaller bundle sizes

## [1.0.30](https://github.com/GMOD/bbi-js/compare/v1.0.29...v1.0.30) (2020-06-25)

- Use abortable-promise-cache instead of abortable-memoize
- Allow opts parameter to getHeader instead of just abortsignal

## [1.0.29](https://github.com/GMOD/bbi-js/compare/v1.0.28...v1.0.29) (2020-01-28)

- Accidentally made the package include itself as dependency in 1.0.28,
  republish

## [1.0.28](https://github.com/GMOD/bbi-js/compare/v1.0.27...v1.0.28) (2020-01-28)

- Change typescript interface to use object keys instead of Map type for
  refsByName, refsById
- Typescript only release change

## [1.0.27](https://github.com/GMOD/bbi-js/compare/v1.0.26...v1.0.27) (2020-01-10)

- Reduce number of requests needed on initial header
- Add definedFieldCount to the returned Header

Thanks to @skinner for both of these contributions!

## [1.0.26](https://github.com/GMOD/bbi-js/compare/v1.0.25...v1.0.26) (2019-11-10)

- Fix important bug with fixed step bigwig files not using the proper start
  coordinate

## [1.0.25](https://github.com/GMOD/bbi-js/compare/v1.0.24...v1.0.25) (2019-11-03)

- Add fix for files with a large header, if autoSql is large in a bigbed file
  would be likely scenario

## [1.0.24](https://github.com/GMOD/bbi-js/compare/v1.0.23...v1.0.24) (2019-10-29)

- Fix the uniqueIds generated via the bigbed features

## [1.0.23](https://github.com/GMOD/bbi-js/compare/v1.0.22...v1.0.23) (2019-10-06)

- Small refactor of `filehandle.read()` to make it more robust

## [1.0.22](https://github.com/GMOD/bbi-js/compare/v1.0.21...v1.0.22) (2019-06-13)

- Bump generic-filehandle
- Add more checks for abort signal to allow early bailing

## [1.0.21](https://github.com/GMOD/bbi-js/compare/v1.0.20...v1.0.21) (2019-05-09)

- Add fix for reading files with greater than 256 contigs

## [1.0.20](https://github.com/GMOD/bbi-js/compare/v1.0.19...v1.0.20) (2019-05-06)

- Add fix that prevented accessing the lowest zoom/reduction level

## [1.0.19](https://github.com/GMOD/bbi-js/compare/v1.0.18...v1.0.19) (2019-05-02)

- Add regression fix since 1.0.16 for uncompressed files. Thanks to @lidaof for
  reporting!

## [1.0.18](https://github.com/GMOD/bbi-js/compare/v1.0.17...v1.0.18) (2019-05-02)

- Improve error handling of the observables (issue #20, pull #21)
- Bump generic-filehandle to 1.0.9 to fix compatibility with native browser
  fetch

## [1.0.17](https://github.com/GMOD/bbi-js/compare/v1.0.16...v1.0.17) (2019-04-30)

- Use some standard rxjs notions for combining operator results
- Add parsing of the extraIndex data in BigBed, allowing you to call
  bigbed.searchExtraIndex(name[,opts])

## [1.0.16](https://github.com/GMOD/bbi-js/compare/v1.0.15...v1.0.16) (2019-04-23)

- Pre-compile binary-parser instances for faster
- Important: fixed bug that caused bigwig summary blocks to not be returned in
  output

## [1.0.15](https://github.com/GMOD/bbi-js/compare/v1.0.14...v1.0.15) (2019-04-18)

- Make important performance improvement for BigWig data

## [1.0.14](https://github.com/GMOD/bbi-js/compare/v1.0.12...v1.0.14) (2019-04-17)

- Improve documentation for integration with @gmod/bed@2
- Fix some cases where abortSignal was passed incorrectly to filehandle

## [1.0.13](https://github.com/GMOD/bbi-js/compare/v1.0.12...v1.0.13) (2019-04-14)

- Added uniqueId to objects returned from BigBed to avoid issue with duplicates

## [1.0.12](https://github.com/GMOD/bbi-js/compare/v1.0.11...v1.0.12) (2019-04-12)

- Fix returning bigbed objects on empty regions

## [1.0.11](https://github.com/GMOD/bbi-js/compare/v1.0.10...v1.0.11) (2019-04-10)

- Removed polyfill of Array.prototype.flat which modifies global scope

## [1.0.10](https://github.com/GMOD/bbi-js/compare/v1.0.9...v1.0.10) (2019-04-09)

- Fix misinterpretation of variable step wig files in this module (the span is
  not variable in variable step files, only the step, use bedGraphToBigWig for
  variable span)
- Improved docs

## [1.0.9](https://github.com/GMOD/bbi-js/compare/v1.0.8...v1.0.9) (2019-04-05)

- Added caching of networking requests (thanks @rbuels for the
  abortable-promise-cache module!)
- Fix some type errors on the range class
- Correct using span on fixed size wiggle types

## [1.0.8](https://github.com/GMOD/bbi-js/compare/v1.0.7...v1.0.8) (2019-04-01)

- Fix @babel/runtime in deployed package
- Bugfix to the url argument to the BigWig/BigBed

## [1.0.7](https://github.com/GMOD/bbi-js/compare/v1.0.6...v1.0.7) (2019-04-01)

- Added getFeatureStream which returns an Observable from rxjs
- Added url option to BigWig and BigBed constructors to allow usage of
  RemoteFile filehandle
- Added typescript backend for better processing

## [1.0.6](https://github.com/GMOD/bbi-js/compare/v1.0.5...v1.0.6) (2019-03-15)

- Fix issue with fixed step and variable step bigwig files not working at all

## [1.0.5](https://github.com/GMOD/bbi-js/compare/v1.0.4...v1.0.5) (2019-03-07)

- Fix issue with jest being in deps instead of devDeps

## [1.0.4](https://github.com/GMOD/bbi-js/compare/v1.0.3...v1.0.4) (2019-01-28)

- Add renameRefSeqs functionality where you can apply a callback to the refseq
  names
- Consistently apply start/end coordinate filters at different zoom levels

## [1.0.3](https://github.com/GMOD/bbi-js/compare/v1.0.2...v1.0.3) (2019-01-27)

- Fix issue with properly inflating chunks (issue #1)

## [1.0.2](https://github.com/GMOD/bbi-js/compare/v1.0.1...v1.0.2) (2019-01-24)

- Added regenerator-runtime to babel dist compilation

## [1.0.1](https://github.com/GMOD/bbi-js/compare/v1.0.0...v1.0.1) (2019-01-24)

- Added exports for BigWig and BigBed. const {BigWig, BigBed} =
  require('@gmod/bbi')

# 1.0.0 (2019-01-23)

- Initial version
- Has support for bigwig and bigbed files
