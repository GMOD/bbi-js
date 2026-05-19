#!/usr/bin/env bash
# Smoke-test the published artifact shape by packing and importing.
#
# tsc only copies .ts -> .js, so non-ts assets (e.g. src/wasm/*.js) are easy
# to leave out of esm/ and dist/. Plain `pnpm test` runs against src/ and
# misses this. This script:
#   1. `npm pack`s the package
#   2. installs the tarball into a scratch dir
#   3. imports `@gmod/bbi` from both the ESM and CJS entry points
#   4. instantiates the public API to force the wasm-bundle module to load
#
# Any missing-asset / bad-export bug shows up as a non-zero exit here.

set -euo pipefail

PKG_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

cd "$PKG_DIR"
TARBALL="$(npm pack --silent --pack-destination "$SCRATCH")"

cd "$SCRATCH"
cat >package.json <<'JSON'
{
  "name": "bbi-pack-test",
  "version": "0.0.0",
  "private": true,
  "type": "module"
}
JSON
npm install --silent --no-audit --no-fund "./$TARBALL" >/dev/null

cat >smoke.mjs <<'JS'
import { BigWig, BigBed, ArrayFeatureView, BigWigFeature, parseBigWig } from '@gmod/bbi'
if (typeof BigWig !== 'function') throw new Error('BigWig missing from ESM entry')
if (typeof BigBed !== 'function') throw new Error('BigBed missing from ESM entry')
if (typeof ArrayFeatureView !== 'function') throw new Error('ArrayFeatureView missing')
if (typeof BigWigFeature !== 'function') throw new Error('BigWigFeature missing')
if (typeof parseBigWig !== 'function') throw new Error('parseBigWig missing')
// Force the unzip module (which imports ./wasm/inflate-wasm-inlined.js) to load.
// Instantiating BigWig pulls bigwig.js -> bbi.js -> unzip.js.
new BigWig({ filehandle: { read: () => { throw new Error('not called') } } })
console.log('esm import + wasm-bundle load ok')
JS

cat >smoke.cjs <<'JS'
const { BigWig, BigBed, ArrayFeatureView, BigWigFeature, parseBigWig } = require('@gmod/bbi')
if (typeof BigWig !== 'function') throw new Error('BigWig missing from CJS entry')
if (typeof BigBed !== 'function') throw new Error('BigBed missing from CJS entry')
if (typeof ArrayFeatureView !== 'function') throw new Error('ArrayFeatureView missing')
if (typeof BigWigFeature !== 'function') throw new Error('BigWigFeature missing')
if (typeof parseBigWig !== 'function') throw new Error('parseBigWig missing')
new BigWig({ filehandle: { read: () => { throw new Error('not called') } } })
console.log('cjs import + wasm-bundle load ok')
JS

node smoke.mjs
node smoke.cjs
