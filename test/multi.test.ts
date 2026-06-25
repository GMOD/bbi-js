import { LocalFile } from 'generic-filehandle2'
import { expect, test } from 'vitest'

import { BigWig } from '../src/index.ts'

import type { GenericFilehandle } from 'generic-filehandle2'

// wraps a filehandle to count read() calls so we can assert that multi-region
// queries coalesce on-disk-adjacent blocks into fewer reads
class CountingFile {
  reads = 0
  bytes = 0
  offsets: number[] = []
  private inner: GenericFilehandle
  constructor(inner: GenericFilehandle) {
    this.inner = inner
  }
  read(length: number, position: number, opts?: Record<string, unknown>) {
    this.reads++
    this.bytes += length
    this.offsets.push(position)
    return this.inner.read(length, position, opts)
  }
  readFile(opts?: Record<string, unknown>) {
    return this.inner.readFile(opts)
  }
  stat() {
    return this.inner.stat()
  }
  close() {
    return Promise.resolve()
  }
}

test('getFeaturesMulti matches per-region getFeatures', async () => {
  const bw = new BigWig({ path: 'test/data/cDC.bw' })
  const header = await bw.getHeader()
  const regions = (Object.values(header.refsByNumber) as { name: string; length: number }[]).map(
    r => ({ refName: r.name, start: 0, end: r.length }),
  )
  const scale = 1000 / 250_000_000

  const multi = await bw.getFeaturesMulti(regions, { scale })
  const loop = []
  for (const r of regions) {
    loop.push(await bw.getFeatures(r.refName, r.start, r.end, { scale }))
  }

  expect(multi.length).toBe(regions.length)
  for (let i = 0; i < regions.length; i++) {
    expect(multi[i]).toStrictEqual(loop[i])
  }
})

test('getFeaturesMulti coalesces whole-genome reads', async () => {
  const fhLoop = new CountingFile(new LocalFile('test/data/cDC.bw'))
  const bwLoop = new BigWig({ filehandle: fhLoop })
  const headerLoop = await bwLoop.getHeader()
  const regions = (
    Object.values(headerLoop.refsByNumber) as { name: string; length: number }[]
  ).map(r => ({ refName: r.name, start: 0, end: r.length }))
  const scale = 1000 / 250_000_000

  const afterHeaderLoop = fhLoop.reads
  for (const r of regions) {
    await bwLoop.getFeatures(r.refName, r.start, r.end, { scale })
  }
  const loopReads = fhLoop.reads - afterHeaderLoop

  const fhMulti = new CountingFile(new LocalFile('test/data/cDC.bw'))
  const bwMulti = new BigWig({ filehandle: fhMulti })
  await bwMulti.getHeader()
  const afterHeaderMulti = fhMulti.reads
  await bwMulti.getFeaturesMulti(regions, { scale })
  const multiReads = fhMulti.reads - afterHeaderMulti

  // multi-region must issue strictly fewer reads for a whole-genome overview
  expect(multiReads).toBeLessThan(loopReads)
  // and the per-chromosome loop should issue at least ~1 read per chromosome
  expect(loopReads).toBeGreaterThanOrEqual(regions.length)
})

test('getFeaturesMulti handles overlapping regions without double-fetch', async () => {
  const fh = new CountingFile(new LocalFile('test/data/cDC.bw'))
  const bw = new BigWig({ filehandle: fh })
  await bw.getHeader()
  const regions = [
    { refName: 'chr1', start: 1_000_000, end: 3_000_000 },
    { refName: 'chr1', start: 2_000_000, end: 4_000_000 }, // overlaps previous
    { refName: 'chr2', start: 0, end: 5_000_000 },
  ]
  const scale = 1 / 5000

  const offsetsBefore = fh.offsets.length
  const multi = await bw.getFeaturesMulti(regions, { scale })
  const multiOffsets = fh.offsets.slice(offsetsBefore)

  // each region bucket must equal an independent getFeatures for that region
  for (let i = 0; i < regions.length; i++) {
    const r = regions[i]!
    const truth = await bw.getFeatures(r.refName, r.start, r.end, { scale })
    expect(multi[i]).toStrictEqual(truth)
  }
  // a block shared by the two overlapping regions is fetched once, not twice
  expect(new Set(multiOffsets).size).toBe(multiOffsets.length)
})

test('getFeaturesMulti is order-independent', async () => {
  const bw = new BigWig({ path: 'test/data/cDC.bw' })
  const scale = 1 / 20000
  // scrambled chromosome order plus a non-monotonic same-chrom pair
  const regions = [
    { refName: 'chr5', start: 10_000_000, end: 20_000_000 },
    { refName: 'chr1', start: 50_000_000, end: 60_000_000 },
    { refName: 'chr1', start: 0, end: 10_000_000 },
    { refName: 'chr22', start: 1_000_000, end: 5_000_000 },
    { refName: 'chr2', start: 30_000_000, end: 40_000_000 },
  ]

  const fhScrambled = new CountingFile(new LocalFile('test/data/cDC.bw'))
  const bwScrambled = new BigWig({ filehandle: fhScrambled })
  await bwScrambled.getHeader()
  const before = fhScrambled.reads
  const multi = await bwScrambled.getFeaturesMulti(regions, { scale })
  const scrambledReads = fhScrambled.reads - before

  // buckets stay aligned to input order and match independent getFeatures
  for (let i = 0; i < regions.length; i++) {
    const r = regions[i]!
    expect(multi[i]).toStrictEqual(
      await bw.getFeatures(r.refName, r.start, r.end, { scale }),
    )
  }

  // coalescing depends only on file offset, so pre-sorting the input must not
  // change the number of reads
  const sorted = [...regions].sort((a, b) =>
    a.refName === b.refName
      ? a.start - b.start
      : a.refName.localeCompare(b.refName),
  )
  const fhSorted = new CountingFile(new LocalFile('test/data/cDC.bw'))
  const bwSorted = new BigWig({ filehandle: fhSorted })
  await bwSorted.getHeader()
  const beforeSorted = fhSorted.reads
  await bwSorted.getFeaturesMulti(sorted, { scale })
  expect(fhSorted.reads - beforeSorted).toBe(scrambledReads)
})

test('getFeaturesMulti handles unknown refName and empty input', async () => {
  const bw = new BigWig({ path: 'test/data/cDC.bw' })
  const scale = 1 / 1000
  const res = await bw.getFeaturesMulti(
    [
      { refName: 'chr1', start: 0, end: 100000 },
      { refName: 'nonexistent', start: 0, end: 100 },
    ],
    { scale },
  )
  expect(res.length).toBe(2)
  expect(res[1]).toStrictEqual([])
  expect(await bw.getFeaturesMulti([], { scale })).toStrictEqual([])
})
