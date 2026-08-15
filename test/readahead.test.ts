import { LocalFile } from 'generic-filehandle2'
import { expect, test } from 'vitest'

import { FilehandleDouble } from './filehandle-double.ts'
import { BigWig } from '../src/index.ts'
import { forEachWithReadahead } from '../src/util.ts'

import type { FilehandleOptions, GenericFilehandle } from 'generic-filehandle2'

// Records how many reads are outstanding at once. A fixed latency per read is
// what makes the overlap observable at all - LocalFile resolves in the same
// microtask, so a serial loop and a concurrent one look identical against it.
class ConcurrencyProbe extends FilehandleDouble {
  reads = 0
  live = 0
  peak = 0
  private inner: GenericFilehandle
  private latencyMs: number
  constructor(inner: GenericFilehandle, latencyMs = 5) {
    super()
    this.inner = inner
    this.latencyMs = latencyMs
  }
  async read(length: number, position: number, opts?: FilehandleOptions) {
    this.reads++
    this.live++
    this.peak = Math.max(this.peak, this.live)
    try {
      await new Promise(resolve => setTimeout(resolve, this.latencyMs))
      return await this.inner.read(length, position, opts)
    } finally {
      this.live--
    }
  }
}

const wholeGenomeRegions = async (bw: BigWig) => {
  const header = await bw.getHeader()
  return (
    Object.values(header.refsByNumber) as { name: string; length: number }[]
  ).map(r => ({
    refName: r.name,
    start: 0,
    end: Math.min(r.length, 2_000_000),
  }))
}

test('a multi-region read overlaps its block-group fetches', async () => {
  const fh = new ConcurrencyProbe(new LocalFile('test/data/cDC.bw'))
  const bw = new BigWig({ filehandle: fh })
  const regions = await wholeGenomeRegions(bw)

  fh.reads = 0
  fh.peak = 0
  await bw.getFeaturesAsArraysMulti(regions, { basesPerSpan: 1 })

  // enough reads for the overlap to be meaningful, and more than one at a time
  expect(fh.reads).toBeGreaterThan(10)
  expect(fh.peak).toBeGreaterThan(1)
  // bounded: the point is a fixed window, not an unbounded fan-out. The R-tree
  // walk runs one region per _collectBlocks concurrently on top of its own
  // window, so this is not a tight bound - it only has to be far below `reads`.
  expect(fh.peak).toBeLessThanOrEqual(fh.reads)
})

test('read-ahead does not change what a multi-region query returns', async () => {
  const slow = new BigWig({
    filehandle: new ConcurrencyProbe(new LocalFile('test/data/cDC.bw'), 1),
  })
  const plain = new BigWig({ path: 'test/data/cDC.bw' })
  const regions = await wholeGenomeRegions(plain)

  for (const basesPerSpan of [1, 1000]) {
    const a = await slow.getFeaturesAsArraysMulti(regions, { basesPerSpan })
    const b = await plain.getFeaturesAsArraysMulti(regions, { basesPerSpan })
    expect(a.regionOffsets).toEqual(b.regionOffsets)
    expect([...a.starts]).toEqual([...b.starts])
    expect([...a.ends]).toEqual([...b.ends])
    expect([...a.scores]).toEqual([...b.scores])
  }
})

test('forEachWithReadahead uses results in input order', async () => {
  const seen: number[] = []
  // reverse-graded latency, so completion order is the opposite of input order
  await forEachWithReadahead(
    [0, 1, 2, 3, 4, 5, 6, 7],
    4,
    async i => {
      await new Promise(resolve => setTimeout(resolve, (8 - i) * 2))
      return i
    },
    value => {
      seen.push(value)
    },
  )
  expect(seen).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
})

test('forEachWithReadahead rethrows the first failure in input order', async () => {
  const used: number[] = []
  await expect(
    forEachWithReadahead(
      [0, 1, 2, 3],
      4,
      async i => {
        // 2 fails first in wall-clock terms, but 1 fails first in input order
        await new Promise(resolve => setTimeout(resolve, i === 2 ? 0 : 10))
        if (i === 1 || i === 2) {
          throw new Error(`read ${i} failed`)
        }
        return i
      },
      value => {
        used.push(value)
      },
    ),
  ).rejects.toThrow('read 1 failed')
  expect(used).toEqual([0])
})

// A rejection from a read still in flight when an earlier one throws must not
// surface as an unhandled rejection - node turns those into a process-level
// error that has nothing to do with the call that failed.
test('forEachWithReadahead leaves no unhandled rejection behind', async () => {
  const unhandled: unknown[] = []
  const used: number[] = []
  const onUnhandled = (e: unknown) => {
    unhandled.push(e)
  }
  process.on('unhandledRejection', onUnhandled)
  try {
    await expect(
      forEachWithReadahead(
        [0, 1, 2, 3],
        4,
        async i => {
          await new Promise(resolve => setTimeout(resolve, i * 5))
          throw new Error(`read ${i} failed`)
        },
        value => {
          used.push(value)
        },
      ),
    ).rejects.toThrow('read 0 failed')
    await new Promise(resolve => setTimeout(resolve, 50))
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
  expect(used).toEqual([])
  expect(unhandled).toEqual([])
})
