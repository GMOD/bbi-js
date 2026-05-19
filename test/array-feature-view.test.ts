import { expect, test } from 'vitest'

import { ArrayFeatureView, BigWig, BigWigFeature } from '../src/index.ts'

test('ArrayFeatureView + BigWigFeature wrap getFeaturesAsArrays (non-summary)', async () => {
  const ti = new BigWig({ path: 'test/data/volvox.bw' })
  const arrays = await ti.getFeaturesAsArrays('ctgA', 0, 50)
  expect(arrays.isSummary).toBe(false)

  const view = new ArrayFeatureView(arrays, 'volvox', 'ctgA')
  expect(view.length).toBe(arrays.starts.length)
  expect(view.start(0)).toBe(arrays.starts[0])
  expect(view.end(0)).toBe(arrays.ends[0])
  expect(view.score(0)).toBeCloseTo(arrays.scores[0]!)
  expect(view.minScore(0)).toBeUndefined()
  expect(view.maxScore(0)).toBeUndefined()

  const f = new BigWigFeature(view, 0)
  expect(f.get('refName')).toBe('ctgA')
  expect(f.get('source')).toBe('volvox')
  expect(f.get('start')).toBe(view.start(0))
  expect(f.get('summary')).toBe(false)
  expect(f.toJSON()).toMatchObject({
    refName: 'ctgA',
    source: 'volvox',
    summary: false,
  })
})

test('ArrayFeatureView wraps summary arrays', async () => {
  const ti = new BigWig({ path: 'test/data/cow.bw' })
  const arrays = await ti.getFeaturesAsArrays('GK000001.2', 2000000, 2100000, {
    scale: 0.00001,
  })
  expect(arrays.isSummary).toBe(true)

  const view = new ArrayFeatureView(arrays, 'cow', 'GK000001.2')
  expect(view.length).toBeGreaterThan(0)
  expect(view.minScore(0)).toBeTypeOf('number')
  expect(view.maxScore(0)).toBeTypeOf('number')
  expect(view.get(0, 'minScore')).toBe(view.minScore(0))
  expect(new BigWigFeature(view, 0).get('summary')).toBe(true)
})
