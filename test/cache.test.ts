import { SharedBudget } from '@gmod/shared-read-cache'
import { LocalFile } from 'generic-filehandle2'
import { afterEach, expect, test, vi } from 'vitest'

import { FilehandleDouble } from './filehandle-double.ts'
import { BigWig } from '../src/index.ts'

import type { FilehandleOptions } from 'generic-filehandle2'

class CountingFile extends FilehandleDouble {
  reads: number[] = []
  private file: LocalFile

  constructor(path: string) {
    super()
    this.file = new LocalFile(path)
  }

  read(length: number, position: number, opts?: FilehandleOptions) {
    this.reads.push(position)
    return this.file.read(length, position, opts)
  }
}

async function indexReads(bw: BigWig, file: CountingFile) {
  const { unzoomedIndexOffset } = await bw.getHeader()
  file.reads = []
  await bw.getFeatures('ctgA', 0, 1000)
  return file.reads.filter(position => position >= unzoomedIndexOffset).length
}

afterEach(() => {
  vi.useRealTimers()
})

test('index nodes join a shared budget weighed in bytes', async () => {
  const budget = new SharedBudget(Infinity)
  const file = new CountingFile('test/data/volvox.bw')
  const bw = new BigWig({ filehandle: file, cacheBudget: budget })
  await bw.getFeatures('ctgA', 0, 1000)
  // the 48-byte R-tree header and at least one node: an entry count would be 2
  expect(budget.total).toBeGreaterThan(48)
})

test('a budget lowered under the index evicts it, and the next query re-reads', async () => {
  const budget = new SharedBudget(Infinity)
  const file = new CountingFile('test/data/volvox.bw')
  const bw = new BigWig({ filehandle: file, cacheBudget: budget })
  await bw.getFeatures('ctgA', 0, 1000)
  expect(await indexReads(bw, file)).toBe(0)
  budget.limit = 0
  expect(await indexReads(bw, file)).toBeGreaterThan(0)
})

test('an index node nothing reads for the idle timeout is dropped', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  const file = new CountingFile('test/data/volvox.bw')
  const bw = new BigWig({ filehandle: file, cacheIdleTimeoutMs: 60_000 })
  await bw.getFeatures('ctgA', 0, 1000)
  vi.advanceTimersByTime(30_000)
  expect(await indexReads(bw, file)).toBe(0)
  vi.advanceTimersByTime(120_000)
  expect(await indexReads(bw, file)).toBeGreaterThan(0)
})

test('nodes idle out after three minutes by default', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  const file = new CountingFile('test/data/volvox.bw')
  const bw = new BigWig({ filehandle: file })
  await bw.getFeatures('ctgA', 0, 1000)
  vi.advanceTimersByTime(2 * 60_000)
  expect(await indexReads(bw, file)).toBe(0)
  vi.advanceTimersByTime(4 * 60_000)
  expect(await indexReads(bw, file)).toBeGreaterThan(0)
})

test('clearing the cache credits its bytes back to the budget', async () => {
  const budget = new SharedBudget(Infinity)
  const file = new CountingFile('test/data/volvox.bw')
  const bw = new BigWig({ filehandle: file, cacheBudget: budget })
  await bw.getFeatures('ctgA', 0, 1000)
  bw.clearCache()
  expect(budget.total).toBe(0)
  expect(await indexReads(bw, file)).toBeGreaterThan(0)
})
