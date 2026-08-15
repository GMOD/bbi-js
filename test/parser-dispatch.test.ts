import { beforeEach, expect, test, vi } from 'vitest'

import { BigBed, BigWig } from '../src/index.ts'

import type * as Unzip from '../src/unzip.ts'

// parser-parity.test.ts proves the parsers agree on the records. That is exactly
// what makes a misroute invisible: if the fused wasm call stopped firing and
// every read fell back to the JS array parser, every assertion in that file
// still passes, the wasm work silently stops happening, and
// docs/parser-selection.md becomes fiction. This asserts the other half — which
// parser a given call actually reaches — by counting the calls into unzip.ts,
// the seam every wasm entry point goes through.
const calls = vi.hoisted(() => ({
  inflateRawBatch: 0,
  fusedBigWig: 0,
  fusedSummary: 0,
}))

vi.mock('../src/unzip.ts', async importOriginal => {
  const actual = await importOriginal<typeof Unzip>()
  return {
    ...actual,
    unzipBatch: (...args: Parameters<typeof actual.unzipBatch>) => {
      calls.inflateRawBatch++
      return actual.unzipBatch(...args)
    },
    decompressAndParseBigWigBlocks: (
      ...args: Parameters<typeof actual.decompressAndParseBigWigBlocks>
    ) => {
      calls.fusedBigWig++
      return actual.decompressAndParseBigWigBlocks(...args)
    },
    decompressAndParseSummaryBlocks: (
      ...args: Parameters<typeof actual.decompressAndParseSummaryBlocks>
    ) => {
      calls.fusedSummary++
      return actual.decompressAndParseSummaryBlocks(...args)
    },
  }
})

beforeEach(() => {
  calls.inflateRawBatch = 0
  calls.fusedBigWig = 0
  calls.fusedSummary = 0
})

// Which entry points ran, not how many times: the count is the number of block
// groups a query happens to coalesce into, which is a property of the fixture.
const wasmUsed = () =>
  Object.entries(calls)
    .filter(([, n]) => n > 0)
    .map(([name]) => name)
    .sort()

// A query that overlaps no blocks reaches no parser at all and would satisfy
// every "no wasm" expectation below by doing nothing, so each case asserts it
// actually produced features.
const nonEmpty = (n: number) => {
  expect(n).toBeGreaterThan(0)
}

const BASE = { basesPerSpan: 1 }
const ZOOM = { basesPerSpan: 10_000 }
const REGIONS = [
  { refName: 'ctgA', start: 0, end: 1000 },
  { refName: 'ctgA', start: 5000, end: 6000 },
]

const compressed = () => new BigWig({ path: 'test/data/volvox.bw' })
const uncompressed = () => new BigWig({ path: 'test/data/uncompressed.bw' })

test('typed arrays, one region, compressed: fused wasm parse', async () => {
  const r = await compressed().getFeaturesAsArrays('ctgA', 0, 50_000, BASE)
  nonEmpty(r.starts.length)
  expect(wasmUsed()).toEqual(['fusedBigWig'])
})

test('typed arrays, one region, zoomed, compressed: fused summary parse', async () => {
  const r = await compressed().getFeaturesAsArrays('ctgA', 0, 50_000, ZOOM)
  nonEmpty(r.starts.length)
  expect(r.isSummary).toBe(true)
  expect(wasmUsed()).toEqual(['fusedSummary'])
})

// One region routes back onto the single-region reader rather than through the
// multi machinery, so it keeps the fused call the multi path cannot use.
test('typed arrays, Multi with one region: still fused', async () => {
  const r = await compressed().getFeaturesAsArraysMulti([REGIONS[0]!], BASE)
  nonEmpty(r.starts.length)
  expect(wasmUsed()).toEqual(['fusedBigWig'])
})

// The fused entry points carry a single coord filter, which cannot serve two
// regions, so these inflate raw and parse per region tag in JS.
test('typed arrays, two regions: raw inflate, no fused parse', async () => {
  const r = await compressed().getFeaturesAsArraysMulti(REGIONS, BASE)
  nonEmpty(r.starts.length)
  expect(wasmUsed()).toEqual(['inflateRawBatch'])
})

test('typed arrays, two regions, zoomed: raw inflate, no fused parse', async () => {
  const r = await compressed().getFeaturesAsArraysMulti(REGIONS, ZOOM)
  nonEmpty(r.starts.length)
  expect(r.isSummary).toBe(true)
  expect(wasmUsed()).toEqual(['inflateRawBatch'])
})

test.each([
  ['getFeatures', (b: BigWig) => b.getFeatures('ctgA', 0, 50_000, BASE)],
  ['getFeatures zoomed', (b: BigWig) => b.getFeatures('ctgA', 0, 50_000, ZOOM)],
  ['getFeaturesMulti', (b: BigWig) => b.getFeaturesMulti(REGIONS, BASE)],
] as const)(
  'objects, compressed: %s inflates but never fuses',
  async (_, run) => {
    const features = await run(compressed())
    nonEmpty(features.flat().length)
    expect(wasmUsed()).toEqual(['inflateRawBatch'])
  },
)

// uncompressBufSize is 0, so there is nothing to inflate and no path reaches
// wasm — including the one that would otherwise fuse, since the fused entry
// points are the decompressor.
test.each([
  [
    'arrays',
    async (b: BigWig) =>
      (await b.getFeaturesAsArrays('ctgA', 0, 50_000, BASE)).starts.length,
  ],
  [
    'arrays zoomed',
    async (b: BigWig) =>
      (await b.getFeaturesAsArrays('ctgA', 0, 50_000, ZOOM)).starts.length,
  ],
  [
    'arrays multi',
    async (b: BigWig) =>
      (await b.getFeaturesAsArraysMulti(REGIONS, BASE)).starts.length,
  ],
  [
    'objects',
    async (b: BigWig) => (await b.getFeatures('ctgA', 0, 50_000, BASE)).length,
  ],
] as const)('uncompressed file, %s: no wasm at all', async (_, run) => {
  nonEmpty(await run(uncompressed()))
  expect(wasmUsed()).toEqual([])
})

test('BigBed objects: inflates, and the typed-array readers reject it', async () => {
  const bb = new BigBed({ path: 'test/data/volvox.bb' })
  nonEmpty((await bb.getFeatures('ctgA', 0, 50_000)).length)
  expect(wasmUsed()).toEqual(['inflateRawBatch'])
  await expect(bb.getFeaturesAsArrays('ctgA', 0, 50_000)).rejects.toThrow(
    /not supported for BigBed/,
  )
})

// The fifth public entry into the parsers, and the only one that parses with no
// coord filter: it reads whole blocks and filters by name afterwards.
test('searchExtraIndex: object path, inflate only', async () => {
  const bb = new BigBed({ path: 'test/data/chr22_with_name_index.bb' })
  await bb.readIndices()
  nonEmpty((await bb.searchExtraIndex('ENST00000467796.2')).length)
  expect(wasmUsed()).toEqual(['inflateRawBatch'])
})
