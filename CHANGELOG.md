## [11.2.3](https://github.com/GMOD/bbi-js/compare/v11.2.2...v11.2.3) (2026-08-21)

### Bug Fixes

- Take the shared-read-cache release that fixes abort, eviction and weighing ([9523033](https://github.com/GMOD/bbi-js/commit/95230334ea64d8384bf8ed6cb752405bbf7418e2))

### Documentation

- Backfill CHANGELOG.md for v5.0.0 through v10.0.1 ([9a22175](https://github.com/GMOD/bbi-js/commit/9a22175afda8605f32c81d71581c6e80e1c71a55))

## [11.2.2](https://github.com/GMOD/bbi-js/compare/v11.2.1...v11.2.2) (2026-08-17)

### Chores

- Keep agent worktrees out of the toolchain's way ([0d68bb8](https://github.com/GMOD/bbi-js/commit/0d68bb8cbd834081a8a2e7e6332eee31164c63c3))
- Build each ref in a worktree ([03bb773](https://github.com/GMOD/bbi-js/commit/03bb773eb1595cf023408e2dc02ff6c23095bc13))

### Documentation

- Chart which of the four parsers a read reaches ([7982a0a](https://github.com/GMOD/bbi-js/commit/7982a0a0a14338fd7d48539b7a7c6dcadb4998ee))
- The parser-selection diagram was unreadable on a dark theme ([fe73e97](https://github.com/GMOD/bbi-js/commit/fe73e97aef47bdce9a12a8693eb8bd42411ff8ca))
- Trim the README, moving the API and concurrency into docs/ ([55fe03d](https://github.com/GMOD/bbi-js/commit/55fe03d16354cb2fea5adcd40c78b37d054fc6b2))
- Scripts/network-bench.sh, not ./scripts ([896e2c9](https://github.com/GMOD/bbi-js/commit/896e2c9634c246b4dba338b17978658790b9299d))
- Trim a sentence that restated its own paragraph ([123717a](https://github.com/GMOD/bbi-js/commit/123717ab2dfa0bd94273caf9f1977a6301781654))
- README title, citation and section order match the sibling repos ([2d58619](https://github.com/GMOD/bbi-js/commit/2d58619a14e150440000118e3d6aa3bd712d8fd4))
- Fix stale SYNC paths in parser-selection.dot ([911d768](https://github.com/GMOD/bbi-js/commit/911d76831000b9a0d0a9895554968caf2dee4651))
- Answer "why not DecompressionStream" with a measured bench arm ([a450046](https://github.com/GMOD/bbi-js/commit/a4500467be0207e01cc7d09ffa299f5b02935408))
- Put the prose in the active voice ([95b00c8](https://github.com/GMOD/bbi-js/commit/95b00c8dece1098ece1e60c043b0b9f9fdaf5125))
- Record where a query's time goes, and what follows from it ([2b262bb](https://github.com/GMOD/bbi-js/commit/2b262bba96a641daffe0cb532397e52a0c2a5e97))
- Correct the release command in CONTRIBUTING, and its voice ([f0f03b7](https://github.com/GMOD/bbi-js/commit/f0f03b723dbf77a9aa61df93b5b412e25ab72379))
- The budget a block cache would need is already a dependency here ([6747790](https://github.com/GMOD/bbi-js/commit/6747790c66e766ee842f42df58616c43e576c2ab))
- Suggest @gmod/range-cache-filehandle for remote files ([17ed6c1](https://github.com/GMOD/bbi-js/commit/17ed6c1b68129b757f8804b4e65a8daebca56081))

### Other Changes

- Move graphviz parser-selection diagram into docs/img/ ([dbec690](https://github.com/GMOD/bbi-js/commit/dbec69056df2a8b41c660d58c64b882813cf4579))

### Performance Improvements

- Drop two wasm exports nothing calls, for 3.5 KB off the bundle ([212146e](https://github.com/GMOD/bbi-js/commit/212146e041dd5f880d7c020ea74c9525fe7fbd70))

### Tests

- Assert which parser each call reaches, and chart the fifth entry ([384aefb](https://github.com/GMOD/bbi-js/commit/384aefb4a42a953aab02140aafdc3118fa073825))

## [11.2.1](https://github.com/GMOD/bbi-js/compare/v11.2.0...v11.2.1) (2026-08-15)

### Bug Fixes

- Agree between the JS and wasm parsers on a truncated block ([d8a2d4c](https://github.com/GMOD/bbi-js/commit/d8a2d4cc58e357ce04e4e38339289e0bbea05aab))

### Other Changes

- Cover BigBed, which gains more than BigWig ([5a5f0b9](https://github.com/GMOD/bbi-js/commit/5a5f0b926f1b00049d3d0c8257824e93dd73d9a4))

## [11.2.0](https://github.com/GMOD/bbi-js/compare/v11.1.0...v11.2.0) (2026-08-15)

### Documentation

- Say that a query issues concurrent range requests ([33a94e5](https://github.com/GMOD/bbi-js/commit/33a94e52bb78350d370cbda058512ea93c7bf437))
- Correct the fan-out claim with a measurement ([a6f2a49](https://github.com/GMOD/bbi-js/commit/a6f2a494752bcd6b0ae087ca154478fb99d06e1d))

### Other Changes

- Measure query wall clock over a simulated network link ([67d725c](https://github.com/GMOD/bbi-js/commit/67d725ccb2c82247cc646cc2e583a0a4800b8afd))

### Performance Improvements

- Fetch a query's independent reads with read-ahead, not one at a time ([6df14c3](https://github.com/GMOD/bbi-js/commit/6df14c3a628ca05dc2a1826c284821d64784781f))

## [11.1.0](https://github.com/GMOD/bbi-js/compare/v11.0.1...v11.1.0) (2026-08-13)

### Chores

- Render only the commit subject, and link the commit ([8285dcd](https://github.com/GMOD/bbi-js/commit/8285dcd50ce1dbe93123c86b1caaaab7f2842152))
- Create a GitHub release for each published tag ([b4bae12](https://github.com/GMOD/bbi-js/commit/b4bae12cc60f4335634301c16aa137903d07b0b7))
- Enforce type strippability in tsconfig ([b49eb1a](https://github.com/GMOD/bbi-js/commit/b49eb1a0cf83c205d0ca308026aa30d05633eaa0))

### Documentation

- Note the one-region array-buffer sharing on getFeaturesAsArraysMulti ([974e132](https://github.com/GMOD/bbi-js/commit/974e132b42f7f250e43835cbc2d7c2f538c64b26))

### Performance Improvements

- Serve a one-region getFeaturesAsArraysMulti from the fused parser ([bfdcc67](https://github.com/GMOD/bbi-js/commit/bfdcc67cd3cd2b2e0af991696aaf671130fb8f38))

## [11.0.1](https://github.com/GMOD/bbi-js/compare/v11.0.0...v11.0.1) (2026-08-10)

### Chores

- Emit the .slice() rationale so it survives regeneration
- Wasm-bindgen 0.2.122 -> 0.2.126, bundle rebuilt
- Gate preversion on format:check, as CI does
- Converge package.json on the shape its siblings use

### Other Changes

- Revert "chore: converge package.json" — the CHANGELOG prettier step ([0209e5b](https://github.com/GMOD/bbi-js/commit/0209e5b938201fa287e92075c54773847b63eb69))

## [11.0.0](https://github.com/GMOD/bbi-js/compare/v10.0.2...v11.0.0) (2026-08-06)

### Bug Fixes

- Copy out of wasm memory before decoding strings
- Report onProgress consistently when a query overlaps no blocks
- Name the file when the header's totalSummary offset is past EOF

### Chores

- Drop eslint-plugin-unicorn
- Typecheck and format-check the whole tree in CI
- Explain why the typecheck step exists
- Let npm publish stop auto-correcting repository.url
- Exempt our own packages from the release quarantine
- Bump pnpm/action-setup to v6.0.10
- Run the test suite as `pnpm test --run`

### Refactoring

- Make bigbed's Loc.field required
- **BREAKING** Drop @gmod/abortable-promise-cache and @jbrowse/quick-lru
- Use @gmod/shared-read-cache instead of a local copy

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

### Documentation

* document the previously-undocumented `getFeaturesAsArraysMulti` (including its `regionOffsets` slice layout), `getRegionByteSize`/`getRegionByteSizeMulti`, and `opts.onProgress`, and note which methods BigBed shares with BigWig and that the typed-array readers throw there; fix the `Feature` table's claim that `score` is present on every feature (BigBed's BED score actually lives in `rest`), drop the stale `chromId`/`bb-171` example fields in favor of the current `bb-<blockOffset>-<recordStart>` format, align the raw/parsed JSON examples on the same real record, correct `BigWigFeature`'s documented `get(i, key)` signature to `get(key)`, and note that `getFeatures` returns an empty array when `start >= end`; backed by a new `test/readme.test.ts` that runs every README example against the fixture files so the docs can't drift from the code again ([b467e86](https://github.com/GMOD/bbi-js/commit/b467e86d5c2094a87dc6cb97a43dd020a35060a5))

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

### Chores

* set pnpm's `minimumReleaseAge` to 3 days ([a9458d9](https://github.com/GMOD/bbi-js/commit/a9458d95f33f08565ff59299e3c1c4dba6b4b95d))

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

### Refactoring

* extract `_forEachDecodedBlock` to collapse three near-identical fetch-decompress-visit loops (`readFeatures`, `readWigDataMulti`, `_readBlocksAsArraysMulti`) into one helper; make `groupBlocks` pure (`toSorted` instead of mutating the caller's array, dropping the redundant `lastBlockEnd` bookkeeping); and route both JS summary parsers through a shared `summaryScore()` so they agree with each other and with the wasm parser on the `validCnt === 0` case ([b5276f6](https://github.com/GMOD/bbi-js/commit/b5276f63fce37d43145b770c8529c6cd04cec72c))

# [9.3.0](https://github.com/GMOD/bbi-js/compare/v9.2.1...v9.3.0) (2026-06-26)

### Features

* add `getFeaturesAsArraysMulti`, the multi-region counterpart of `getFeaturesAsArrays` — combines the block-coalescing of `getFeaturesMulti` with typed-array output, sharing one backing set of typed arrays across regions via a `regionOffsets` index ([5d69625](https://github.com/GMOD/bbi-js/commit/5d69625881508201109e5acd996111ee4dda3b38))

### Refactoring

* replace constructor parameter properties with explicit fields in `BlockView` and `BigWigFeature`, for type-strippable TypeScript, and enforce the pattern going forward via the `@typescript-eslint/parameter-properties` lint rule ([b9eb46d](https://github.com/GMOD/bbi-js/commit/b9eb46df904616a01c47f9a68858a1763ab4909b))

## [9.2.1](https://github.com/GMOD/bbi-js/compare/v9.2.0...v9.2.1) (2026-06-19)

### Documentation

* document `getHeader`, the `renameRefSeqs` constructor option, and add a `Feature` type field-reference table (which fields are present on always/BigBed/zoom-data features), carried over from the typedoc branch ([ba33873](https://github.com/GMOD/bbi-js/commit/ba338733b34b1225d429edd215ca19350c00e342))
* rewrite the README for clarity and conciseness — condense the installation and remote-file examples, replace prose parameter descriptions with tables, and trim the CDN-usage section ([cc56799](https://github.com/GMOD/bbi-js/commit/cc567996c44899e1dd5d4dbb5ffaa92e0373ea53))

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

### Chores

* auto-sync the crate's `wasm-bindgen-cli` version to `Cargo.lock` before building, instead of relying on it already matching ([1082edc](https://github.com/GMOD/bbi-js/commit/1082edc6f4d04f4b68a8aa552bf2be1d5a14b2c8))

### Performance Improvements

* rewrite the BigWig/summary wasm parse loops to iterate fixed-size records via `chunks_exact` instead of per-field byte indexing, removing per-field bounds checks from the hot loop (varstep -16%, fixedStep -11%, bedGraph -6%); also drops dead wasm exports, shrinking the wasm bundle 39.6KB -> 33.9KB ([6514b12](https://github.com/GMOD/bbi-js/commit/6514b1277b18f3654245dd9d42c11919754912ff))

## [9.0.17](https://github.com/GMOD/bbi-js/compare/v9.0.16...v9.0.17) (2026-05-19)

### Refactoring

* rename `src/wasm/inflate-wasm-inlined.mjs` back to `.js` — tsc with `allowJs` re-emits the webpack ESM bundle as ESM in `esm/` and as proper CommonJS in `dist/`, so `dist/package.json`'s `"commonjs"` declaration matches what Node actually sees, without leaking a `.mjs` extension into bundlers (e.g. Jest) that don't transform `.mjs` under `node_modules` ([2f228a4](https://github.com/GMOD/bbi-js/commit/2f228a4699d9b1cb00098b9c046539237768a335))

## [9.0.16](https://github.com/GMOD/bbi-js/compare/v9.0.15...v9.0.16) (2026-05-18)

### Bug Fixes

* remove a stale workflow query-string link from the CI badge in the README ([272b50b](https://github.com/GMOD/bbi-js/commit/272b50b0074dcd167005b255e88c931e86e5670a))
* update the CI badge to point at `publish.yml`, the workflow that now actually runs the tests since publish and test were merged into it ([2279f9a](https://github.com/GMOD/bbi-js/commit/2279f9a4d39d5e4b4d0af737fb66f855efdf95f4))

### Features

* restore `any` as `BigWigFeature.get`'s fallback return type, matching JBrowse's `Feature.get(name): any`, so `BigWigFeature` stays structurally assignable to `Feature` without a cast ([e04150b](https://github.com/GMOD/bbi-js/commit/e04150b687978afe2ce8d09d3510ad5f59625a04))

## [9.0.15](https://github.com/GMOD/bbi-js/compare/v9.0.14...v9.0.15) (2026-05-18)

### Chores

* rename the merged publish/test workflow back to `publish.yml` — npm trusted publishing pins to the exact workflow file path via the OIDC `job_workflow_ref` claim, and deleting `publish.yml` in the previous merge had broken that trust binding ([97ccf97](https://github.com/GMOD/bbi-js/commit/97ccf978bb76326ef1ec563e43b8d76e55b00054))
* regenerate the tracked wasm bundle against a newer webpack, which omits an unused `__webpack_exports__` declaration, resyncing the committed bytes with what actually published in 9.0.14 ([b3220f7](https://github.com/GMOD/bbi-js/commit/b3220f77aae29f5e00222082378f5c667b35f95e))

## [9.0.14](https://github.com/GMOD/bbi-js/compare/v9.0.13...v9.0.14) (2026-05-18)

### Chores

* merge the publish workflow into `push.yml` as a job gated on `needs: test` plus a tag-ref guard, so a tag can no longer ship without lint/build/test/`test:pack` passing first ([0a1afe9](https://github.com/GMOD/bbi-js/commit/0a1afe9024f2451520707c5c1046e0642fecd491))

## [9.0.13](https://github.com/GMOD/bbi-js/compare/v9.0.12...v9.0.13) (2026-05-18)

### Refactoring

* let tsc emit wasm build artifacts via `allowJs` instead of the previous manual `cp` step plus a `dist/wasm/package.json` submodule trick — `src/wasm/*.{mjs,js,d.ts}` now compiles straight into `esm/wasm/`/`dist/wasm/`; the webpack output is renamed from `.js` to `.mjs` so Node parses it as ESM regardless of the parent `package.json`'s `"type"`; and `src/wasm/` is un-gitignored so consumers and CI no longer need `cargo`/`wasm-bindgen` just to materialize the bundle ([e36b6e9](https://github.com/GMOD/bbi-js/commit/e36b6e9783dec4df16ae1331b39e78b0532f1cf7))

## [9.0.12](https://github.com/GMOD/bbi-js/compare/v9.0.11...v9.0.12) (2026-05-18)

### Bug Fixes

* **published package was broken:** the wasm-inlined decompression bundle (`src/wasm/inflate-wasm-inlined.js`) was gitignored, so it never reached the published `esm/`/`dist/` output — importing `@gmod/bbi@9.0.11` failed with `Can't resolve './wasm/inflate-wasm-inlined.js'`. Fixed by tracking the bundle in git and copying it into both build outputs, plus a pack-and-import smoke test (`pnpm test:pack`) wired into CI and `preversion` so this class of break can't ship silently again ([6bd5715](https://github.com/GMOD/bbi-js/commit/6bd571583e07413be9464dfb7963797fda53de10))
* fix a duplicate-type bug where `crate/src/wrapper.ts`'s wasm-internal `BigWigFeatureArrays`/`SummaryFeatureArrays` types structurally diverged from the public types of the same name in `src/types.ts` (missing the `isSummary` tag) — renamed the wasm-internal types to `WasmBigWigArrays`/`WasmSummaryArrays` so `types.ts` stays the single source for the discriminated public shape; also fixed `tsconfig.lint.json`'s `rootDir`, which had silently made ESLint's type-aware rules skip every file under `test/` ([5f7311b](https://github.com/GMOD/bbi-js/commit/5f7311bc4e6a79cf0a0728bf0627d8067f6415ca))

### Chores

* have `publish.yml` run lint and the unit tests before `npm publish`, not just build + `test:pack`, since a manual tag push previously bypassed both (only `preversion` ran them, and only for `pnpm version`); align both CI workflows on Node 24.x; and split `pnpm test` (now `vitest --run`, CI/one-shot) from a new `pnpm test:watch` — `pnpm test` had silently watched locally and only worked in CI by accident, via no-TTY detection ([d373dfc](https://github.com/GMOD/bbi-js/commit/d373dfc563924f6bcff3e71f398c06b48ad1fd56))

### Tests

* have `scripts/test-pack.sh` load a real `volvox.bw` fixture in both its ESM and CJS smoke-test modules, so the pack-and-import test actually exercises the inflate path and instantiates the wasm bundle instead of only checking that constructors exist; also fix the CJS `unzip.js` path, whose `require()` of the webpack-emitted ESM bundle was misparsed as CommonJS under `dist/package.json`'s `"type": "commonjs"` — `dist/wasm/` now gets its own `"type": "module"` package.json so Node 22.12+'s `require(ESM)` support loads it correctly ([deecd9b](https://github.com/GMOD/bbi-js/commit/deecd9bb066f9e8994843b8a1c445b71b244286e))
* add `test/array-feature-view.test.ts` covering the public `ArrayFeatureView`/`BigWigFeature` classes' non-summary and summary paths, which had zero coverage despite being public exports ([5f7311b](https://github.com/GMOD/bbi-js/commit/5f7311bc4e6a79cf0a0728bf0627d8067f6415ca))

## [9.0.11](https://github.com/GMOD/bbi-js/compare/v9.0.10...v9.0.11) (2026-05-18)

### Bug Fixes

* fix `uniqueId` collision in `parseBigBedBlock` — offsets were combined by addition, which could produce the same id for two different records; now joined with `-` ([6482626](https://github.com/GMOD/bbi-js/commit/6482626302637535612f13cf7791301c03421fdc))
* propagate `AbortSignal` to chromosome-tree reads in `_readChromosomeTree`, which previously ignored it ([6482626](https://github.com/GMOD/bbi-js/commit/6482626302637535612f13cf7791301c03421fdc))
* summary score returns `0` when `validCnt` is `0` instead of a nonsense fallback value ([6482626](https://github.com/GMOD/bbi-js/commit/6482626302637535612f13cf7791301c03421fdc))
* harden the autoSql decode against a missing null terminator ([03a52d3](https://github.com/GMOD/bbi-js/commit/03a52d38d36eb82371e34dcf550239df2e6c97c5))
* track the hand-written `src/wasm/inflate-wasm-inlined.d.ts` in git — it isn't generated by `build:wasm`, so gitignoring all of `src/wasm/` broke CI's `tsc` step ([da374fc](https://github.com/GMOD/bbi-js/commit/da374fc35365dbf46ee6fccc2a23327c968e55c6))

### Chores

* bump `wasm-bindgen` to `0.2.121` to match the installed CLI ([5dbad98](https://github.com/GMOD/bbi-js/commit/5dbad98b4dc2014f46de076fbbba138256ac69e0))
* derive the CI `wasm-bindgen-cli` version from `Cargo.lock` instead of hardcoding it, preventing drift between the installed CLI and the resolved crate version ([eca31b3](https://github.com/GMOD/bbi-js/commit/eca31b38fd230954151c853dd28e15e2ce4fa0a3))
* bump CI's `wasm-bindgen-cli` to `0.2.118` to match `Cargo.toml` ([9f79b43](https://github.com/GMOD/bbi-js/commit/9f79b432d27c19d3f24f7526ab20c05496486d6a))

### Documentation

* switch the README's publishing example from `npm version` to `pnpm version` to match the rest of the toolchain, and point remaining master-branch codecov badge URLs at `main` ([bb12497](https://github.com/GMOD/bbi-js/commit/bb124977e49989c60deae35a6f95eb50f6e59e8f))

### Refactoring

* make `request` a required parameter in the private `_readBigWigFeaturesAsArrays`/`_readSummaryFeaturesAsArrays` methods, and have `readWigDataAsArrays` handle the no-collection case with a direct ternary, removing dead `request?.foo ?? 0` fallbacks from the wasm call sites ([3c6d19c](https://github.com/GMOD/bbi-js/commit/3c6d19c93679bffda0b875fc930aa1133760f354))
* add `parseSummaryBlockAsArrays` so the uncompressed summary path avoids a `Feature[]` intermediary, matching the compressed path and dropping unneeded allocations; simplify the non-leaf B+ tree binary search in `bigbed.ts` to the standard "find last <= name" pattern ([4992f04](https://github.com/GMOD/bbi-js/commit/4992f0490833091c40bba7d33f991591f5cfd4be))
* simplify the B+ tree binary search's child-index fallback to `Math.max(targetIndex, 0)` ([7542250](https://github.com/GMOD/bbi-js/commit/75422509eec6915914742730c48b090a14ec0730))
* convert the webpack-bundled wasm wrapper from `wrapper.js` to `wrapper.ts` so `tsc` generates `inflate-wasm-inlined.d.ts` instead of hand-maintaining it (a file that had already gone stale once); public API typing now flows from wasm-bindgen's generated `.d.ts` via direct imports ([8822596](https://github.com/GMOD/bbi-js/commit/8822596a89487b8dc6eaa047c477dda3bce06087))

## [9.0.10](https://github.com/GMOD/bbi-js/compare/v9.0.9...v9.0.10) (2026-04-27)

### Bug Fixes

* add non-null assertions for noUncheckedIndexedAccess compliance ([3d67c8c](https://github.com/GMOD/bbi-js/commit/3d67c8cf989a15872b667b094e1d65b5f98ee95a))
* `rTreePromise` now resets itself when the R-tree header read fails, letting `BlockView` recover from a transient error instead of caching the rejected promise and failing every subsequent query ([f584e85](https://github.com/GMOD/bbi-js/commit/f584e8558dc7ed4ea2837dba820142d94664bf61))
* `_readIndices` now forwards `opts` (including the `AbortSignal`) to both of its `bbi.read` calls, which previously ignored it ([f584e85](https://github.com/GMOD/bbi-js/commit/f584e8558dc7ed4ea2837dba820142d94664bf61))
* the uncompressed `readFeatures` path sliced each block up to the next block's start offset instead of `block.offset + block.length`, letting `parseSummaryBlock`/`parseBigBedBlock` read into the gap between blocks ([f584e85](https://github.com/GMOD/bbi-js/commit/f584e8558dc7ed4ea2837dba820142d94664bf61))

### Chores

* enable `noUncheckedIndexedAccess` in `tsconfig.json` for stricter array/object-index type safety ([13b15df](https://github.com/GMOD/bbi-js/commit/13b15dffef9d2f192a427a0b901e9974044147c8))
* swap `eslint-plugin-import` for `eslint-plugin-import-x`, a faster fork with fewer dependencies, and update the eslint config to use its rules ([14eb4c4](https://github.com/GMOD/bbi-js/commit/14eb4c4378debcc5be0517d9a0e6f61a3b17e0a8))
* pin the crate's `wasm-bindgen` dependency to `0.2.118` for consistency with the installed CLI ([9b61a4e](https://github.com/GMOD/bbi-js/commit/9b61a4e5b0a579a7f30bb3e80ad4052a3de5317e))
* remove an unused dependency from `package.json` ([1d7dd6a](https://github.com/GMOD/bbi-js/commit/1d7dd6ac0fbd4a30140bfe6826f63340c3ae2bae))
* standardize `package.json`, `tsconfig.json`, and the build scripts to match the other GMOD packages' conventions: add a `main` field for CommonJS back-compat, drop the redundant `types`/`module` fields, reorder the `pnpm`-based scripts, and align `tsconfig`'s `target`/`lib` settings ([f582f3a](https://github.com/GMOD/bbi-js/commit/f582f3a0539eb28c7fb03aa664370eea2166fe90))

### Documentation

* fix README inaccuracies, note npm trusted publishing, document the `parseBigWig`, `ArrayFeatureView`, and `BigWigFeature` exports, and clarify that publishing is triggered by pushing a git tag ([853031a](https://github.com/GMOD/bbi-js/commit/853031a95c288bec1f240040a321af9232f24681))

### Refactoring

* extract a `parseBlock` helper for the `summary`/`bigwig`/`bigbed` dispatch and a `blocksToTypedArrays` helper for building unzip input offsets/lengths; rename `BlockView`'s `featureCache` to `rTreeNodeCache`; replace `ArrayFeatureView`'s private `_source`/`_refName` getters with public readonly `source`/`refName` properties; and use `??` instead of `||` for the field-offset fallback in `searchExtraIndex` ([f584e85](https://github.com/GMOD/bbi-js/commit/f584e8558dc7ed4ea2837dba820142d94664bf61))

## [9.0.9](https://github.com/GMOD/bbi-js/compare/v9.0.8...v9.0.9) (2026-04-04)

### Features

* change `BigWigFeature`'s generic `get(key: string)` overload return type from `unknown` to `any`, matching JBrowse's `Feature.get(name): any` interface, so `BigWigFeature` stays structurally assignable to `Feature` without a cast ([07a9553](https://github.com/GMOD/bbi-js/commit/07a9553afa3d621b833f73b543c40ea4b67cdd5a))

## [9.0.8](https://github.com/GMOD/bbi-js/compare/v9.0.7...v9.0.8) (2026-04-04)

### Chores

* reorder the CI workflow to build before linting ([8a3feed](https://github.com/GMOD/bbi-js/commit/8a3feed0a908ec612a55151bbdcdb3954768b549))

### Features

* add an exported `BigWigFeature` class that wraps a single record from an `ArrayFeatureView`, offering a `Feature`-shaped `get(key)`/`id()`/`toJSON()` interface for consumers who want per-record objects instead of raw typed arrays ([e2eb02e](https://github.com/GMOD/bbi-js/commit/e2eb02e9b865768efe4255dbd76d17ee65cbc883))

## [9.0.7](https://github.com/GMOD/bbi-js/compare/v9.0.6...v9.0.7) (2026-04-02)

### Chores

* stop committing the generated `src/wasm/` build outputs to git, since they're rebuilt from source via `pnpm build:wasm` before both testing and publishing ([3fd1595](https://github.com/GMOD/bbi-js/commit/3fd159546cecb9a584c9206142e09844329ce15f))

## [9.0.6](https://github.com/GMOD/bbi-js/compare/v9.0.5...v9.0.6) (2026-04-02)

### Chores

* regenerate the compiled wasm bundle from source (no functional change) ([9747983](https://github.com/GMOD/bbi-js/commit/974798340d504d55744f9852635ec58cdb78156b))

## [9.0.5](https://github.com/GMOD/bbi-js/compare/v9.0.4...v9.0.5) (2026-04-02)

### Bug Fixes

* drop the explicit `Promise<...>` return-type annotations on `decompressAndParseBigWigBlocks`/`decompressAndParseSummaryBlocks` that referenced re-exported wasm-generated types, since consumers building with `skipLibCheck:false` could hit type-check failures resolving those types ([e4404f9](https://github.com/GMOD/bbi-js/commit/e4404f912b4f3de8afc1953c0f877688cdf0690c))

### Chores

* add `crate/` to the pnpm workspace and pin `wasm-bindgen-cli@0.2.115` directly in CI via `cargo binstall`, replacing the now-deleted `scripts/build-wasm.sh` version-detection script ([68364ab](https://github.com/GMOD/bbi-js/commit/68364ab7d5b48bfa8102f5f87654e16e11f8665e), [84032a3](https://github.com/GMOD/bbi-js/commit/84032a34ddd0c424f8aa1a2e7a6e1b9356d3e594))
* remove the unused wasm-generated discriminated-union types (`BigWigFeatureArraysWithFlag`/`SummaryFeatureArraysWithFlag`), bump `typescript-eslint`, drop the leftover empty `token` override and `--provenance` flag from the npm-trusted-publishing workflow, and rename README badges from `master` to `main` ([48307fb](https://github.com/GMOD/bbi-js/commit/48307fba41a0fc3d8a04702e8cc9b1707c3cd70c), [448693b](https://github.com/GMOD/bbi-js/commit/448693bdaa96bb37c6ce1add6f882bf122d9952a), [91549ae](https://github.com/GMOD/bbi-js/commit/91549aef18d4444261f22e2ef21014c82bdd0bbe), [87c5316](https://github.com/GMOD/bbi-js/commit/87c531678d6cbd4e0c88a54d2fea27472e3f4af3))

## [9.0.4](https://github.com/GMOD/bbi-js/compare/v9.0.3...v9.0.4) (2026-03-28)

## [9.0.3](https://github.com/GMOD/bbi-js/compare/v9.0.2...v9.0.3) (2026-03-28)

### Chores

* auto-detect the required `wasm-bindgen-cli` version from `Cargo.lock` (via `cargo pkgid`) and install it in the build script, preventing version-mismatch CI failures; bump `wasm-bindgen` to 0.2.115 ([6dfe946](https://github.com/GMOD/bbi-js/commit/6dfe946063ab7fb929c082bbfc520f0d7cef8ab3))
* switch to `cargo-binstall` for fetching `wasm-bindgen-cli` as a prebuilt binary instead of compiling it from source, speeding up CI ([89febe3](https://github.com/GMOD/bbi-js/commit/89febe3a424b9ad19432459903c6d75a94087277))

## [9.0.2](https://github.com/GMOD/bbi-js/compare/v9.0.1...v9.0.2) (2026-03-28)

### Chores

* fix the publish workflow by adding the Rust toolchain (with the `wasm32-unknown-unknown` target) and installing `wasm-bindgen-cli`, which the WASM build step needed during release ([52da72f](https://github.com/GMOD/bbi-js/commit/52da72f328568ce4bfd206dce09ee6d92dc4bd34))

## [9.0.1](https://github.com/GMOD/bbi-js/compare/v9.0.0...v9.0.1) (2026-03-28)

### Chores

* add a `publish.yml` GitHub Actions workflow that publishes to npm via trusted publishing (OIDC) instead of a long-lived npm token ([860dec8](https://github.com/GMOD/bbi-js/commit/860dec8c4909b26681a44ae6236df5b2968f8705))
* migrate the project to pnpm, TypeScript 6, and eslint-plugin-unicorn v64, update TypeScript and other dependencies, pin eslint to v9, tighten `@typescript-eslint/no-explicit-any` from off to warn and replace `ArrayFeatureView.get`'s `any` return type with a real union, and drop the unused `engines` field, `codecov.yml`, and a stray profiling script ([797efc6](https://github.com/GMOD/bbi-js/commit/797efc66e893cd0716a74dc55536f73be01e534f), [a46dfa7](https://github.com/GMOD/bbi-js/commit/a46dfa7d703cbe40da454ff143bbb864db52ac20), [987a0af](https://github.com/GMOD/bbi-js/commit/987a0af157e92f023d380c69d491df6b4734b380), [862907e](https://github.com/GMOD/bbi-js/commit/862907e2e7484a0dbce40b3f3ef20b4170358c49), [7c448ea](https://github.com/GMOD/bbi-js/commit/7c448ea6bf0a6705514504361170dbe35457174d), [d47de52](https://github.com/GMOD/bbi-js/commit/d47de524bcd80f77c4542743aba8c38205c03b28))

### Documentation

* add `CONTRIBUTING.md` documenting the local build/lint/test/release workflow ([abe6d4d](https://github.com/GMOD/bbi-js/commit/abe6d4d19df8214fba44dae05c38d266e0c513b4))

# [9.0.0](https://github.com/GMOD/bbi-js/compare/v8.1.2...v9.0.0) (2026-03-20)

### BREAKING CHANGES

* drop the `rxjs` dependency and remove the `getFeatureStream()` method from both `BigWig` and `BigBed` — it returned an RxJS `Observable` of `Feature[]` chunks for large queries; `getFeatures()` covers the same data as a plain promise, and the internal block-reading path (`BlockView.readFeatures`/`readWigData`) now returns data directly instead of pushing through an RxJS `Observer`, so streaming callers must switch to `getFeatures()` and there is no longer an RxJS peer dependency to install ([a365733](https://github.com/GMOD/bbi-js/commit/a365733fbe19e2e16ed499d26a89c109d69632ae))

### Chores

* drop the unused `pako-esm2` dependency alongside `rxjs`; add ad-hoc wasm/array profiling scripts under `scripts/` (excluded from lint) ([a365733](https://github.com/GMOD/bbi-js/commit/a365733fbe19e2e16ed499d26a89c109d69632ae))

### Performance Improvements

* serialize the wasm parsers' results (`parse_bigwig_block`, `parse_summary_block`, `decompress_and_parse_bigwig`, `decompress_and_parse_summary`) with `bytemuck::cast_slice` bulk byte-copies instead of looping over each `i32`/`f32` element and writing its bytes individually, speeding up data crossing the JS/wasm boundary ([a365733](https://github.com/GMOD/bbi-js/commit/a365733fbe19e2e16ed499d26a89c109d69632ae))
* cache `BlockView` instances per `(rTreeOffset, blockType)` in a new `BBI.getOrCreateBlockView` instead of constructing a fresh one on every `getFeatures`/`getFeaturesAsArrays` call, and have `getFeaturesAsArrays` read typed arrays straight from the view via `readWigDataAsArrays` instead of first building an array of `Feature` objects through `getFeatures()` and converting it ([a365733](https://github.com/GMOD/bbi-js/commit/a365733fbe19e2e16ed499d26a89c109d69632ae))

### Refactoring

* rewrite `block-view.ts`'s block-fetching/parsing path to return promises and plain arrays directly instead of pushing through an RxJS `Observer`, and make the typed-array reading helpers (renamed to `_readBigWigFeaturesAsArrays`/`_readSummaryFeaturesAsArrays`) private, reached only via `readWigDataAsArrays` ([a365733](https://github.com/GMOD/bbi-js/commit/a365733fbe19e2e16ed499d26a89c109d69632ae))

### Tests

* swap several small benchmark/test fixtures for a 4.2MB `variable_step_large.bw` file to better represent real-world query sizes ([a365733](https://github.com/GMOD/bbi-js/commit/a365733fbe19e2e16ed499d26a89c109d69632ae))

## [8.1.2](https://github.com/GMOD/bbi-js/compare/v8.1.1...v8.1.2) (2026-03-20)

### Bug Fixes

* validate the cirTree magic number (`0x2468ace0`) when reading the R-tree block index and throw a descriptive error naming the file offset, instead of silently continuing to parse a corrupt or unsupported index as if it were valid; added a regression test loading a real `pvalues.bw` fixture across multiple zoom scales to cover the code path ([30f630d](https://github.com/GMOD/bbi-js/commit/30f630d7a2ec5b0c2ce070dd23ad71d29cbd9ae0))

### Chores

* add typed overloads to `ArrayFeatureView.get` for its per-key return types; bump eslint/typescript-eslint/vitest/webpack devDependencies ([30f630d](https://github.com/GMOD/bbi-js/commit/30f630d7a2ec5b0c2ce070dd23ad71d29cbd9ae0))

### Documentation

* rewrite the README around the `url`/`RemoteFile` constructor options (dropping stale `require()`/`node-fetch` examples) and add an `example/` folder with a Node ESM script and a browser demo that imports `@gmod/bbi` from the esm.sh CDN, for trying the library without npm ([9045d1e](https://github.com/GMOD/bbi-js/commit/9045d1e3f20309e025bcc71f42092b4bf639a6c8))

## [8.1.1](https://github.com/GMOD/bbi-js/compare/v8.1.0...v8.1.1) (2026-01-06)

### Bug Fixes

* re-export the `BigWigHeaderWithRefNames` type (the actual return type of `getHeader()`) from the package root — it was defined in `types.ts` but never re-exported from `index.ts`, so TypeScript consumers had no way to name the type of a header without reaching past the public entry point ([d1d10f5](https://github.com/GMOD/bbi-js/commit/d1d10f501ea3e1990255603dcf1449684f722647))

### Styling

* reformat the canvas-drawing benchmark with Prettier and rebuild the bundled wasm module to match ([d1ae5fb](https://github.com/GMOD/bbi-js/commit/d1ae5fb2c2ad038f2b6f28f61d5c3a533e7fd308))

# [8.1.0](https://github.com/GMOD/bbi-js/compare/v8.0.4...v8.1.0) (2025-12-25)

### Features

* add `ArrayFeatureView`, a zero-copy view over `getFeaturesAsArrays`'s typed-array output — exposes `start(i)`/`end(i)`/`score(i)`/`minScore(i)`/`maxScore(i)`/`get(i, key)` accessors backed directly by the underlying `Int32Array`/`Float32Array` buffers instead of allocating one wrapped `Feature` object per row, aimed at high-throughput consumers like canvas renderers that only need per-row scalar reads ([9ec77b4](https://github.com/GMOD/bbi-js/commit/9ec77b464db1e472af4e42cb73ff33cca5116215))

## [8.0.4](https://github.com/GMOD/bbi-js/compare/v8.0.3...v8.0.4) (2025-12-17)

### Chores

* swap `quick-lru` for the `@jbrowse/quick-lru` fork, updating the import in `bigbed.ts`/`block-view.ts` ([a73232d](https://github.com/GMOD/bbi-js/commit/a73232d2e0b2b562d119a16b6efb98a50c565b7e))

## [8.0.3](https://github.com/GMOD/bbi-js/compare/v8.0.2...v8.0.3) (2025-12-16)

### Chores

* bump deps ([263c471](https://github.com/GMOD/bbi-js/commit/263c471f8c9fe0a70accf1e18d23843424399fc0))

### Features

* add an `isSummary` discriminant field to `BigWigFeatureArrays`/`SummaryFeatureArrays`, and thread it through both the non-wasm and wasm `getFeaturesAsArrays` code paths (including the wasm `.d.ts`) — lets TypeScript narrow the union return type on `result.isSummary` instead of the previous structural `'minScores' in result` check, and updates the README example accordingly ([626de33](https://github.com/GMOD/bbi-js/commit/626de3314978ae46ec8a992e5941bc742d0ea3ba), [095e450](https://github.com/GMOD/bbi-js/commit/095e45016d737fdf7c3071d60eff802a95294a6f))

## [8.0.2](https://github.com/GMOD/bbi-js/compare/v8.0.1...v8.0.2) (2025-12-16)

### Chores

* rebuild the inlined wasm bundle unminified, matching the previous webpack config change ([1c6bc6f](https://github.com/GMOD/bbi-js/commit/1c6bc6fb31df02e33d393a6fe89e1af8c621654f))

### Performance Improvements

* the non-wasm fallback path for `getFeaturesAsArrays` (`parseBigWigBlockAsArrays`) now parses BigWig block records directly into `Int32Array`/`Float32Array` typed arrays, instead of parsing into an intermediate array of `Feature` objects and copying those into typed arrays afterward ([bd771b1](https://github.com/GMOD/bbi-js/commit/bd771b18771780b4882a1de9be9f52c8e2cc56b7))

## [8.0.1](https://github.com/GMOD/bbi-js/compare/v8.0.0...v8.0.1) (2025-12-16)

### Bug Fixes

* fix a regression from the R-tree/B+-tree rewrite: locating a null-terminated key's end via `buffer.indexOf(0, offset)` wasn't bounded to that key's fixed-width slot, so when the byte right after the slot wasn't `0` but a stray null byte turned up further into the buffer, the decoded chromosome-tree or BigBed extraIndex name could run past its slot and pick up trailing garbage; the search is now clamped to `offset + keySize` ([5342301](https://github.com/GMOD/bbi-js/commit/5342301f51bb9c2816e02804dbc2e0bb30331162))

### Chores

* bump `generic-filehandle2` and devDeps, disable webpack minification for the wasm build (for readable stack traces), and misc benchmark/formatting cleanup ([859357f](https://github.com/GMOD/bbi-js/commit/859357fd1a542b09bf1cff3db93d672d7f4762df), [40e0f9a](https://github.com/GMOD/bbi-js/commit/40e0f9ad0098d4a3d2464f192169670c116dc0a6), [5180d9f](https://github.com/GMOD/bbi-js/commit/5180d9fe6785c45edc9cdf6f770a7fc5d1133ff5), [010c53a](https://github.com/GMOD/bbi-js/commit/010c53ab43b1b26fdd3251ff43040544c3bfadc3))

# [8.0.0](https://github.com/GMOD/bbi-js/compare/v7.1.0...v8.0.0) (2025-12-11)

### Chores

* add a `benchmarks/` suite and `scripts/build-both-branches.sh` for comparing a branch's performance against master ([b18378a](https://github.com/GMOD/bbi-js/commit/b18378a2f5b560ecf69611470aa228d5a592d567))
* internal lint cleanup, benchmark-script tweaks, and dependency bumps with no functional changes ([606053f](https://github.com/GMOD/bbi-js/commit/606053fc1b537d6f6b4147abe56bbf6d456e42a6), [dffd6ce](https://github.com/GMOD/bbi-js/commit/dffd6ce761dc980ba5b1d2a3379ef6fab2b85f3c), [ea645d8](https://github.com/GMOD/bbi-js/commit/ea645d87f72f8975dfff5df3676bdbba2f4e3f6f), [e259002](https://github.com/GMOD/bbi-js/commit/e2590029b5735b99cd20c3a6af7b1d8071648a7e))

### Features

* inflate data via WebAssembly instead of the pure-JS `pako`/`pako-esm2` path: a Rust crate compiled to wasm now decompresses a whole group of adjacent blocks in a single batched call (`inflateRawBatch`) instead of one JS call per block, and new `decompressAndParseBigWigBlocks`/`decompressAndParseSummaryBlocks` helpers parse BigWig/summary records directly into `Int32Array`/`Float32Array` typed arrays inside wasm — skipping the intermediate per-feature JS object allocation. This backs a new public `getFeaturesAsArrays(refName, start, end, opts)` API that returns `{ starts, ends, scores }` (plus `minScores`/`maxScores` for zoomed/summary data) instead of an array of `Feature` objects, cutting both decompression and GC overhead for large reads ([3c3b91e](https://github.com/GMOD/bbi-js/commit/3c3b91e675d9795d2aaeb14bb4039cdecd76969c))

### Performance Improvements

* rewrite the R-tree traversal in `block-view.ts` to push directly onto `blocksToFetch` instead of building intermediate arrays through chained `.filter()`/`.map()` calls, and rewrite the BigBed extraIndex B+-tree lookup (now `readBPlusTreeNode`) to binary-search each node's sorted keys instead of scanning them linearly ([b18378a](https://github.com/GMOD/bbi-js/commit/b18378a2f5b560ecf69611470aa228d5a592d567))

# [7.1.0](https://github.com/GMOD/bbi-js/compare/v7.0.5...v7.1.0) (2025-11-09)

### Chores

* swap `pako` for `pako-esm2` (passing an explicit second argument to `inflateRaw`), and bump devDeps — vitest 4, `eslint-plugin-unicorn` 62, TS build target raised to `es2022` ([e613103](https://github.com/GMOD/bbi-js/commit/e613103e8ed649ff275f635d719b524d8871eb0c))

### Refactoring

* drop the now-redundant `Number()` conversions on B+/R-tree byte offsets in `bbi.ts`, `bigbed.ts`, and `block-view.ts` — the values were already plain numbers by the time they reached these call sites, so the wrapping calls were dead code ([4c26f31](https://github.com/GMOD/bbi-js/commit/4c26f3168f96d23a8a4bbe922140e73b7b507368))

## [7.0.5](https://github.com/GMOD/bbi-js/compare/v7.0.4...v7.0.5) (2025-06-10)

### Bug Fixes

* drop the `package.json` `browser` field that swapped `unzip.js` for `unzip-pako.js` in bundlers, since that resolution mechanism doesn't apply through the new conditional `exports` map added in 7.0.0 — browser bundles could still end up pulling in `unzip.ts`'s Node `zlib`-based `inflateSync` and fail; `unzip.ts` now always uses `pako`'s `inflateRaw` directly (matching the old browser-only path), removing `unzip-pako.ts` entirely ([009b60d](https://github.com/GMOD/bbi-js/commit/009b60d68258874ca2cccd829243d3ca85e694bb))

### Refactoring

* simplify the `exports` map's `import`/`require` conditions from nested objects (`{"import": {"import": ...}}`) to flat string values ([009b60d](https://github.com/GMOD/bbi-js/commit/009b60d68258874ca2cccd829243d3ca85e694bb))

## [7.0.4](https://github.com/GMOD/bbi-js/compare/v7.0.3...v7.0.4) (2025-06-07)

### Chores

* bump `generic-filehandle2` to `^2.0.10` ([99d0d66](https://github.com/GMOD/bbi-js/commit/99d0d668a1745e9b234cb7b0ab24eaf7eb44631c))

## [7.0.3](https://github.com/GMOD/bbi-js/compare/v7.0.2...v7.0.3) (2025-05-16)

### Bug Fixes

* fix reading chromosome B+ trees from bigtools-generated BigWig files, which place `chromTree` in the middle of the file instead of immediately before `unzoomedDataOffset`; the old reader fetched one contiguous buffer sized as `unzoomedDataOffset - chromTreeOffset` and walked it with offsets relative to that buffer, an assumption that only held for UCSC-tool-generated files, while the new reader fetches each B+ tree node on demand at its absolute file offset (also reading `valSize`, previously left unused, so leaf-node entries are sized correctly) ([52c9235](https://github.com/GMOD/bbi-js/commit/52c923593c617e9d2a80269c6d201f0f61cb8cf6))

## [7.0.2](https://github.com/GMOD/bbi-js/compare/v7.0.1...v7.0.2) (2025-05-13)

### Bug Fixes

* add a `postbuild:es5` step that writes `dist/package.json` with `{"type": "commonjs"}` — needed once the root `package.json` switched to `"type": "module"` in 7.0.0, since without it Node would treat the CJS files under `dist/` as ES modules and fail to load them ([4a803d0](https://github.com/GMOD/bbi-js/commit/4a803d062c8f13d87c37e6e0ddd2c47f56d35da5))

## [7.0.2](https://github.com/GMOD/bbi-js/compare/v7.0.1...v7.0.2) (2025-05-13)

### Bug Fixes

* add a `postbuild:es5` step that writes `dist/package.json` with `{"type": "commonjs"}` — needed once the root `package.json` switched to `"type": "module"` in 7.0.0, since without it Node would treat the CJS files under `dist/` as ES modules and fail to load them ([4a803d0](https://github.com/GMOD/bbi-js/commit/4a803d062c8f13d87c37e6e0ddd2c47f56d35da5))

## [7.0.1](https://github.com/GMOD/bbi-js/compare/v7.0.0...v7.0.1) (2025-04-30)

### Chores

* bump `@gmod/abortable-promise-cache` to `^3.0.1` ([5278877](https://github.com/GMOD/bbi-js/commit/52788774d60c7877c0f7fa9182d8cae612567f39))

# [7.0.0](https://github.com/GMOD/bbi-js/compare/v6.0.3...v7.0.0) (2025-04-30)

### Chores

* bump `generic-filehandle2` to `^2.0.1` ([bfd2a42](https://github.com/GMOD/bbi-js/commit/bfd2a42ff1c87e4cc37c2c679a5cdc5f82ce18de))

### Features

* add a pure-ESM build: `package.json` gains `"type": "module"` plus a conditional `exports` map (`esm/index.js` for `import`, `dist/index.js` for `require`) in place of the old `main`/`module` fields, and all internal relative imports switch to explicit `.ts` extensions (via TypeScript's new `rewriteRelativeImportExtensions`/`allowImportingTsExtensions`) so the ESM output resolves correctly under Node's strict ESM resolution ([f9d8961](https://github.com/GMOD/bbi-js/commit/f9d8961408f633de1cfc3386dad5d3575b456cb8))

## [6.0.3](https://github.com/GMOD/bbi-js/compare/v6.0.2...v6.0.3) (2025-04-11)

### Bug Fixes

* fixed a `RangeError` thrown when reading the B+/R-tree of certain files — `_readChromTree`'s node walk read a 2-byte count field right after the leaf/non-leaf flag without checking that the buffer actually extended that far, so a node landing at the tail of the read buffer overran it; a bounds check now returns early instead of throwing ([cbe4153](https://github.com/GMOD/bbi-js/commit/cbe41538fbbcbb72dffe03dcc66d2a0fca3ae177))

## [6.0.2](https://github.com/GMOD/bbi-js/compare/v6.0.1...v6.0.2) (2025-03-18)

### Chores

* bumped dependencies, including vitest ([1b0bcc4](https://github.com/GMOD/bbi-js/commit/1b0bcc43be749f96d4568e1dd01b84e370a3368d), [2c73ac9](https://github.com/GMOD/bbi-js/commit/2c73ac93654dcbd8b39aabca397ccac87e493f95), [b8e4df8](https://github.com/GMOD/bbi-js/commit/b8e4df8b6c5e20064d6d0078067dfae5bfb3e3c4))

### Refactoring

* extracted the shared `ZoomLevel`/`Feature`/`Statistics`/`RefInfo`/`BigWigHeader`/`RequestOptions` interfaces out of `bbi.ts` into a new `src/types.ts`, added `eslint-plugin-import` with an import-order rule and a new flat `eslint.config.mjs`, and reordered imports across `src/` and `test/` to match ([38be9d6](https://github.com/GMOD/bbi-js/commit/38be9d6f1f910f4e771773953336ee6dcf25002d))
* dropped the `[key: string]: unknown` index signature from `RequestOptions`, tightening the type so callers can no longer pass arbitrary untyped keys through request options ([fe9cc92](https://github.com/GMOD/bbi-js/commit/fe9cc927c3611f64d4275dd02bec740a6111c0d0))

### Styling

* fixed an import-order lint violation in `test/bigwig.test.ts` ([39a3ec5](https://github.com/GMOD/bbi-js/commit/39a3ec53daf806bbf2b5fede07d46cc738d3750d))

## [6.0.1](https://github.com/GMOD/bbi-js/compare/v6.0.0...v6.0.1) (2024-12-12)

### Chores

* bumped dependencies and removed the leftover `jest.config.js` now that tests run on vitest ([9a08d2f](https://github.com/GMOD/bbi-js/commit/9a08d2faabbd9b2b349c87f7ef6d3be5349250e9), [5dc5977](https://github.com/GMOD/bbi-js/commit/5dc5977044f7f0f042fe863766e02274fcf9c334))

# [6.0.0](https://github.com/GMOD/bbi-js/compare/v5.0.2...v6.0.0) (2024-12-12)

### Chores

* bumped dependencies ([f08eebc](https://github.com/GMOD/bbi-js/commit/f08eebcb8becdf1d255a1a3b6adc5436cbe4d7dd))

### Documentation

* updated README.md ([b71f22b](https://github.com/GMOD/bbi-js/commit/b71f22b3ad4ac36d1049ade6dc326dde8f22cbb6))

### Refactoring

* switched the filehandle dependency from `generic-filehandle` to `generic-filehandle2`, reworking every `bbi.read()` call site to use its plain `Uint8Array`-returning signature instead of the old `Buffer.alloc` + `{ buffer }` destructuring pattern, and dropping the `buffer` polyfill dependency entirely; as part of this, big-endian BigWig/BigBed support was removed — `_isBigEndian`/`isBigEndian` are gone and the header parser now throws `'not a BigWig/BigBed file'` for anything that doesn't match the little-endian magic number ([f5d4886](https://github.com/GMOD/bbi-js/commit/f5d4886e8c9c86346e35e7fe68569d8d3b23c29d))

## [5.0.2](https://github.com/GMOD/bbi-js/compare/v5.0.1...v5.0.2) (2024-09-03)

### Bug Fixes

* fixed BigBed feature string decoding (name/`rest` fields): `data.subarray(currOffset, i).toString()` only UTF-8-decodes when `data` is a real Node `Buffer` — on a plain `Uint8Array` (e.g. bundlers/runtimes that don't provide the `buffer` polyfill implicitly, which is why `buffer` was added as an explicit dependency in this same change) `TypedArray#toString` instead returns a comma-separated list of byte values, so string fields came out as garbage; now decoded via `TextDecoder` when available, falling back to `.toString()` only otherwise ([2b23373](https://github.com/GMOD/bbi-js/commit/2b23373e2742ef5686f8f77bfab33be10484e597))

### Chores

* migrated the test suite from Jest to Vitest and the ESLint config from the `FlatCompat`-wrapped `.eslintrc` style to native flat config built on `typescript-eslint` ([2b23373](https://github.com/GMOD/bbi-js/commit/2b23373e2742ef5686f8f77bfab33be10484e597))

## [5.0.1](https://github.com/GMOD/bbi-js/compare/v5.0.0...v5.0.1) (2024-08-09)

### Bug Fixes

* removed the `myToString` helper that decoded the bigWig/bigBed `autoSql` header field with a global `TextDecoder`, using `Buffer#toString` instead — this had required environments without a native `TextDecoder` global (the test suite had to polyfill `window.TextDecoder` from Node's `util` before this) to provide one just to read a header field ([cc57974](https://github.com/GMOD/bbi-js/commit/cc579746f58934698d8b30885c8df54fc2dd869f))

# [5.0.0](https://github.com/GMOD/bbi-js/compare/v4.0.6...v5.0.0) (2024-08-09)

### Refactoring

* replaced the `binary-parser` dependency with hand-written `DataView`/`Buffer` parsing across `bbi.ts`, `bigbed.ts`, `block-view.ts`, and `util.ts` (header fields, R-tree leaf/non-leaf nodes, extra-index records, and wig/bed data blocks are now decoded by explicit offset math instead of a declarative parser), and switched block offsets/lengths from `bigint` to plain `number` since every call site immediately converted them anyway — drops a runtime dependency and its bundle weight ([8b33c64](https://github.com/GMOD/bbi-js/commit/8b33c646de1cb71031860c29ba2a9c9de0a9bf4c))

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
