// executes the README's examples against fixture files so the docs can't drift
import BED from '@gmod/bed'
import { RemoteFile } from 'generic-filehandle2'
import { expect, test } from 'vitest'

import {
  ArrayFeatureView,
  BigBed,
  BigWig,
  BigWigFeature,
  parseBigWig,
} from '../src/index.ts'

test('constructor forms', () => {
  expect(new BigWig({ path: 'test/data/volvox.bw' })).toBeTruthy()
  expect(new BigWig({ url: 'https://example.com/file.bw' })).toBeTruthy()
  expect(
    new BigWig({ filehandle: new RemoteFile('https://example.com/file.bw') }),
  ).toBeTruthy()
})

test('caller-side name mapping example', async () => {
  const bigwig = new BigWig({ path: 'test/data/volvox.bw' })
  const toFileName = (name: string) => name.replace('contig', 'ctg')
  expect(
    (await bigwig.getFeatures(toFileName('contigA'), 0, 100_000)).length,
  ).toBeGreaterThan(0)
})

test('getFeatures / onProgress examples', async () => {
  const bigwig = new BigWig({ path: 'test/data/volvox.bw' })
  const features = await bigwig.getFeatures('ctgA', 0, 100000)
  expect(Object.keys(features[0]!).sort()).toEqual(['end', 'score', 'start'])

  const calls: [number, number][] = []
  await bigwig.getFeatures('ctgA', 0, 100_000, {
    onProgress: (downloaded, total) => calls.push([downloaded, total]),
  })
  expect(calls[0]![0]).toBe(0)
  expect(calls.at(-1)![0]).toBe(calls.at(-1)![1])
})

test('Feature shape examples', async () => {
  const bigwig = new BigWig({ path: 'test/data/volvox.bw' })
  expect((await bigwig.getFeatures('ctgA', 0, 100))[0]).toEqual({
    start: 2,
    end: 3,
    score: 1,
  })
  expect(
    (await bigwig.getFeatures('ctgA', 0, 50000, { basesPerSpan: 10000 }))[0],
  ).toEqual({
    start: 2,
    end: 10242,
    minScore: 1,
    maxScore: 32,
    score: 18.44677734375,
    summary: true,
  })
})

test('getFeaturesMulti example', async () => {
  const bigwig = new BigWig({ path: 'test/data/cDC.bw' })
  const perRegion = await bigwig.getFeaturesMulti([
    { refName: 'chr1', start: 0, end: 1_000_000 },
    { refName: 'chr2', start: 0, end: 1_000_000 },
  ])
  expect(perRegion.length).toBe(2)
})

test('getFeaturesAsArrays examples', async () => {
  const bigwig = new BigWig({ path: 'test/data/volvox.bw' })
  const result = await bigwig.getFeaturesAsArrays('ctgA', 0, 100000)
  expect(result.isSummary).toBe(false)
  expect(result.starts.length).toBeGreaterThan(0)
  const summary = await bigwig.getFeaturesAsArrays('ctgA', 0, 100000, {
    scale: 0.01,
  })
  expect(summary.isSummary).toBe(true)
})

test('getFeaturesAsArraysMulti example', async () => {
  const bigwig = new BigWig({ path: 'test/data/volvox.bw' })
  const multi = await bigwig.getFeaturesAsArraysMulti([
    { refName: 'ctgA', start: 0, end: 1000 },
    { refName: 'ctgA', start: 5000, end: 6000 },
  ])
  expect(multi.regionOffsets).toEqual([0, 998, 1998])
  const secondRegionStarts = multi.starts.subarray(
    multi.regionOffsets[1],
    multi.regionOffsets[2],
  )
  expect(secondRegionStarts.length).toBe(1000)
})

test('getRegionByteSize example', async () => {
  const bigwig = new BigWig({ path: 'test/data/volvox.bw' })
  const bytes = await bigwig.getRegionByteSize('ctgA', 0, 100_000)
  expect(bytes).toBeGreaterThan(0)
})

test('BigBed typed-array readers throw as documented', async () => {
  const bb = new BigBed({ path: 'test/data/hg18.bb' })
  await expect(bb.getFeaturesAsArrays('chr7', 0, 1000)).rejects.toThrow()
  // but the shared BBI readers work
  expect(await bb.getRegionByteSize('chr7', 0, 100000)).toBeGreaterThan(0)
  expect(
    (await bb.getFeaturesMulti([{ refName: 'chr7', start: 0, end: 100000 }]))
      .length,
  ).toBe(1)
})

test('@gmod/bed example and documented JSON', async () => {
  const file = new BigBed({ path: './test/data/hg18.bb' })
  const { autoSql } = await file.getHeader()
  const feats = await file.getFeatures('chr7', 0, 100000)
  expect(feats[0]).toEqual({
    start: 54028,
    end: 73584,
    rest: 'uc003sii.2\t0\t-\t54028\t54028\t255,0,0\t.\tAL137655',
    uniqueId: 'bb-1083-0',
  })
  const parser = new BED({ autoSql })
  const lines = feats.map(({ start, end, rest, uniqueId }) =>
    parser.parseLine(`chr7\t${start}\t${end}\t${rest}`, { uniqueId }),
  )
  expect(lines[0]).toEqual({
    chrom: 'chr7',
    chromStart: 54028,
    chromEnd: 73584,
    name: 'uc003sii.2',
    score: 0,
    strand: -1,
    thickStart: 54028,
    thickEnd: 54028,
    reserved: '255,0,0',
    spID: 'AL137655',
    uniqueId: 'bb-1083-0',
  })
})

test('parseBigWig example', async () => {
  const file = new BigWig({ path: 'test/data/volvox.bw' })
  const results = await parseBigWig(file)
  expect(results.length).toBeGreaterThan(0)
  for (const { starts, ends, scores } of results) {
    expect(starts.length).toBe(ends.length)
    expect(starts.length).toBe(scores.length)
  }
})

test('ArrayFeatureView / BigWigFeature examples', async () => {
  const file = new BigWig({ path: 'test/data/volvox.bw' })
  const arrays = await file.getFeaturesAsArrays('ctgA', 0, 100000)
  const view = new ArrayFeatureView(arrays, 'mySource', 'ctgA')
  expect(view.length).toBeGreaterThan(0)
  expect(view.start(0)).toBe(view.get(0, 'start'))
  expect(view.score(0)).toBe(view.get(0, 'score'))

  const feature = new BigWigFeature(view, 0)
  expect(feature.get('score')).toBe(view.score(0))
  expect(feature.get('refName')).toBe('ctgA')
  expect(feature.toJSON()).toMatchObject({
    start: view.start(0),
    end: view.end(0),
    refName: 'ctgA',
    source: 'mySource',
  })
})
