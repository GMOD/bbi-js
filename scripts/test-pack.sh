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
FIXTURE="$PKG_DIR/test/data/volvox.bw"

cd "$SCRATCH"
cat >package.json <<'JSON'
{
  "name": "bbi-pack-test",
  "version": "0.0.0",
  "private": true,
  "type": "module"
}
JSON
npm install --silent --no-audit --no-fund generic-filehandle2 "./$TARBALL" >/dev/null

# Read a real bigwig fixture end-to-end. This is the part that actually
# exercises the wasm bundle: getHeader() doesn't, but getFeatures() runs
# through the inflate path and instantiates the wasm module.
cat >smoke.mjs <<JS
import { BigWig, BigBed, ArrayFeatureView, BigWigFeature, parseBigWig } from '@gmod/bbi'
import { LocalFile } from 'generic-filehandle2'
for (const [name, fn] of Object.entries({ BigWig, BigBed, ArrayFeatureView, BigWigFeature, parseBigWig })) {
  if (typeof fn !== 'function') throw new Error(\`\${name} missing from ESM entry\`)
}
const bw = new BigWig({ filehandle: new LocalFile('$FIXTURE') })
const feats = await bw.getFeatures('ctgA', 0, 100)
if (!Array.isArray(feats) || feats.length === 0) throw new Error('no features returned (ESM)')
console.log(\`esm: \${feats.length} features ok\`)
JS

cat >smoke.cjs <<JS
const { BigWig, BigBed, ArrayFeatureView, BigWigFeature, parseBigWig } = require('@gmod/bbi')
;(async () => {
  const { LocalFile } = await import('generic-filehandle2')
  for (const [name, fn] of Object.entries({ BigWig, BigBed, ArrayFeatureView, BigWigFeature, parseBigWig })) {
    if (typeof fn !== 'function') throw new Error(\`\${name} missing from CJS entry\`)
  }
  const bw = new BigWig({ filehandle: new LocalFile('$FIXTURE') })
  const feats = await bw.getFeatures('ctgA', 0, 100)
  if (!Array.isArray(feats) || feats.length === 0) throw new Error('no features returned (CJS)')
  console.log(\`cjs: \${feats.length} features ok\`)
})().catch(e => { console.error(e); process.exit(1) })
JS

node smoke.mjs
node smoke.cjs
