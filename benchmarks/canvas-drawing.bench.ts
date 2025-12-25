import { bench, describe } from 'vitest'

import { BigWig, Feature, ArrayFeatureView } from '../src/index.ts'

interface WrappedFeature {
  get: (str: string) => unknown
  id: () => string
  toJSON: () => Feature
}

// Current JBrowse approach - creates wrapper objects with closures
function wrapFeatures(
  feats: Feature[],
  source: string,
  refName: string,
): WrappedFeature[] {
  const wrapped: WrappedFeature[] = []
  for (const data of feats) {
    // @ts-expect-error
    data.source = source
    const uniqueId = `${source}:${refName}:${data.start}-${data.end}`
    // @ts-expect-error
    data.refName = refName
    data.uniqueId = uniqueId
    wrapped.push({
      get: (str: string) => (data as Record<string, unknown>)[str],
      id: () => uniqueId,
      toJSON: () => data,
    })
  }
  return wrapped
}

// Option 1: Feature class with methods - avoids closure overhead
class FeatureWithMethods implements Feature {
  start: number
  end: number
  score?: number
  source?: string
  refName?: string
  uniqueId?: string

  constructor(
    start: number,
    end: number,
    score: number | undefined,
    source: string,
    refName: string,
  ) {
    this.start = start
    this.end = end
    this.score = score
    this.source = source
    this.refName = refName
    this.uniqueId = `${source}:${refName}:${start}-${end}`
  }

  get(key: string) {
    return (this as Record<string, unknown>)[key]
  }

  id() {
    return this.uniqueId!
  }

  toJSON() {
    return this
  }
}

function wrapFeaturesAsClass(
  feats: Feature[],
  source: string,
  refName: string,
): FeatureWithMethods[] {
  const result: FeatureWithMethods[] = []
  for (const f of feats) {
    result.push(
      new FeatureWithMethods(f.start, f.end, f.score, source, refName),
    )
  }
  return result
}

// Option 3: Pre-compute uniqueIds as array
function wrapFeaturesPrecomputeIds(
  feats: Feature[],
  source: string,
  refName: string,
) {
  const prefix = `${source}:${refName}:`
  const uniqueIds: string[] = []
  for (const f of feats) {
    uniqueIds.push(`${prefix}${f.start}-${f.end}`)
  }
  return { features: feats, uniqueIds, source, refName }
}

describe('JBrowse wrapper overhead: volvox.bw', () => {
  const bw = new BigWig({ path: 'test/data/volvox.bw' })
  const refName = 'ctgA'
  const start = 0
  const end = 50001
  const source = 'bigwig-track'

  bench(
    'getFeatures (raw)',
    async () => {
      const features = await bw.getFeatures(refName, start, end)
      let sum = 0
      for (const f of features) {
        sum += f.score ?? 0
      }
      return sum
    },
    { iterations: 50, warmupIterations: 10 },
  )

  bench(
    'getFeatures + wrapper',
    async () => {
      const features = await bw.getFeatures(refName, start, end)
      const wrapped = wrapFeatures(features, source, refName)
      let sum = 0
      for (const f of wrapped) {
        sum += (f.get('score') as number) ?? 0
      }
      return sum
    },
    { iterations: 50, warmupIterations: 10 },
  )

  bench(
    'getFeaturesAsArrays (raw)',
    async () => {
      const arrays = await bw.getFeaturesAsArrays(refName, start, end)
      let sum = 0
      for (let i = 0; i < arrays.scores.length; i++) {
        sum += arrays.scores[i]!
      }
      return sum
    },
    { iterations: 50, warmupIterations: 10 },
  )
})

describe('JBrowse wrapper overhead: fixedStep.bw (many features)', () => {
  const bw = new BigWig({ path: 'test/data/fixedStep.bw' })
  const refName = 'chr1'
  const start = 0
  const end = 1000000
  const source = 'bigwig-track'

  bench(
    'getFeatures (raw)',
    async () => {
      const features = await bw.getFeatures(refName, start, end)
      let sum = 0
      for (const f of features) {
        sum += f.score ?? 0
      }
      return sum
    },
    { iterations: 20, warmupIterations: 5 },
  )

  bench(
    'getFeatures + current wrapper',
    async () => {
      const features = await bw.getFeatures(refName, start, end)
      const wrapped = wrapFeatures(features, source, refName)
      let sum = 0
      for (const f of wrapped) {
        sum += (f.get('score') as number) ?? 0
      }
      return sum
    },
    { iterations: 20, warmupIterations: 5 },
  )

  bench(
    'getFeatures + class wrapper',
    async () => {
      const features = await bw.getFeatures(refName, start, end)
      const wrapped = wrapFeaturesAsClass(features, source, refName)
      let sum = 0
      for (const f of wrapped) {
        sum += f.score ?? 0
      }
      return sum
    },
    { iterations: 20, warmupIterations: 5 },
  )

  bench(
    'getFeaturesAsArrays + ArrayFeatureView',
    async () => {
      const arrays = await bw.getFeaturesAsArrays(refName, start, end)
      const view = new ArrayFeatureView(arrays, source, refName)
      let sum = 0
      for (let i = 0; i < view.length; i++) {
        sum += view.score(i)
      }
      return sum
    },
    { iterations: 20, warmupIterations: 5 },
  )

  bench(
    'getFeaturesAsArrays (raw)',
    async () => {
      const arrays = await bw.getFeaturesAsArrays(refName, start, end)
      let sum = 0
      for (let i = 0; i < arrays.scores.length; i++) {
        sum += arrays.scores[i]!
      }
      return sum
    },
    { iterations: 20, warmupIterations: 5 },
  )
})

describe('Wrapper overhead only (data pre-fetched): fixedStep.bw', async () => {
  const bw = new BigWig({ path: 'test/data/fixedStep.bw' })
  const refName = 'chr1'
  const start = 0
  const end = 1000000
  const source = 'bigwig-track'

  const features = await bw.getFeatures(refName, start, end)
  const arrays = await bw.getFeaturesAsArrays(refName, start, end)

  console.log(
    `Pre-fetched ${features.length} features for wrapper overhead test`,
  )

  bench(
    'iterate Feature[] (raw)',
    () => {
      let sum = 0
      for (const f of features) {
        sum += f.score ?? 0
      }
      return sum
    },
    { iterations: 100, warmupIterations: 20 },
  )

  bench(
    'current: wrap + iterate via get()',
    () => {
      const wrapped = wrapFeatures(features, source, refName)
      let sum = 0
      for (const f of wrapped) {
        sum += (f.get('score') as number) ?? 0
      }
      return sum
    },
    { iterations: 100, warmupIterations: 20 },
  )

  bench(
    'option1: class with methods + get()',
    () => {
      const wrapped = wrapFeaturesAsClass(features, source, refName)
      let sum = 0
      for (const f of wrapped) {
        sum += (f.get('score') as number) ?? 0
      }
      return sum
    },
    { iterations: 100, warmupIterations: 20 },
  )

  bench(
    'option1: class with methods (direct)',
    () => {
      const wrapped = wrapFeaturesAsClass(features, source, refName)
      let sum = 0
      for (const f of wrapped) {
        sum += f.score ?? 0
      }
      return sum
    },
    { iterations: 100, warmupIterations: 20 },
  )

  bench(
    'option2: ArrayFeatureView + get()',
    () => {
      const view = new ArrayFeatureView(arrays, source, refName)
      let sum = 0
      for (let i = 0; i < view.length; i++) {
        sum += (view.get(i, 'score') as number) ?? 0
      }
      return sum
    },
    { iterations: 100, warmupIterations: 20 },
  )

  bench(
    'option2: ArrayFeatureView (direct)',
    () => {
      const view = new ArrayFeatureView(arrays, source, refName)
      let sum = 0
      for (let i = 0; i < view.length; i++) {
        sum += view.score(i)
      }
      return sum
    },
    { iterations: 100, warmupIterations: 20 },
  )

  bench(
    'option3: precompute ids only',
    () => {
      const { features: feats } = wrapFeaturesPrecomputeIds(
        features,
        source,
        refName,
      )
      let sum = 0
      for (const f of feats) {
        sum += f.score ?? 0
      }
      return sum
    },
    { iterations: 100, warmupIterations: 20 },
  )

  bench(
    'iterate typed arrays (baseline)',
    () => {
      let sum = 0
      for (let i = 0; i < arrays.scores.length; i++) {
        sum += arrays.scores[i]!
      }
      return sum
    },
    { iterations: 100, warmupIterations: 20 },
  )
})
