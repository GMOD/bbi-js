import { expect, test } from 'vitest'

import { BigWig } from '../src/index.ts'

function recorder() {
  const calls: [number, number][] = []
  return {
    calls,
    onProgress: (downloaded: number, total: number) => {
      calls.push([downloaded, total])
    },
  }
}

test('onProgress starts at 0 and finishes at the total', async () => {
  const bw = new BigWig({ path: 'test/data/volvox.bw' })
  const { calls, onProgress } = recorder()
  await bw.getFeatures('ctgA', 0, 50000, { onProgress })

  expect(calls.length).toBeGreaterThan(1)
  const total = calls[0]![1]
  expect(total).toBeGreaterThan(0)
  expect(calls[0]).toEqual([0, total])
  expect(calls.at(-1)).toEqual([total, total])
  // monotonically increasing, never past the total, total never changes
  for (let i = 1; i < calls.length; i++) {
    expect(calls[i]![1]).toBe(total)
    expect(calls[i]![0]).toBeGreaterThanOrEqual(calls[i - 1]![0])
    expect(calls[i]![0]).toBeLessThanOrEqual(total)
  }
})

// A query that reaches no blocks used to report nothing at all for an unknown
// refName but (0, 0) for an in-range empty region, so a caller driving a
// progress bar never saw it complete.
test.each([
  ['unknown refName', 'nonexistent', 0, 1000],
  ['region past the end of the ref', 'ctgA', 40_000_000, 40_001_000],
  ['degenerate range', 'ctgA', 5000, 5000],
] as const)('onProgress reports (0, 0) for %s', async (_name, ref, s, e) => {
  const bw = new BigWig({ path: 'test/data/volvox.bw' })
  const { calls, onProgress } = recorder()
  const feats = await bw.getFeatures(ref, s, e, { onProgress })
  expect(feats).toEqual([])
  expect(calls).toEqual([[0, 0]])
})

test('onProgress behaves the same for the typed-array and multi readers', async () => {
  const bw = new BigWig({ path: 'test/data/volvox.bw' })

  const arrays = recorder()
  await bw.getFeaturesAsArrays('ctgA', 0, 50000, {
    onProgress: arrays.onProgress,
  })
  const arraysTotal = arrays.calls[0]![1]
  expect(arraysTotal).toBeGreaterThan(0)
  expect(arrays.calls.at(-1)).toEqual([arraysTotal, arraysTotal])

  const multi = recorder()
  await bw.getFeaturesMulti(
    [
      { refName: 'ctgA', start: 0, end: 50000 },
      { refName: 'nonexistent', start: 0, end: 1000 },
    ],
    { onProgress: multi.onProgress },
  )
  const multiTotal = multi.calls[0]![1]
  expect(multiTotal).toBe(arraysTotal)
  expect(multi.calls.at(-1)).toEqual([multiTotal, multiTotal])
})
