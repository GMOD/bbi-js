import type { BigWigFeatureArrays, SummaryFeatureArrays } from './types.ts'

export class BigWigFeature {
  constructor(
    private view: ArrayFeatureView,
    private i: number,
  ) {}

  get(key: 'refName' | 'source'): string
  get(key: 'start' | 'end' | 'score'): number
  get(key: 'minScore' | 'maxScore'): number | undefined
  get(key: 'summary'): boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(key: string): any
  get(key: string) {
    return this.view.get(this.i, key)
  }

  id() {
    return this.view.id(this.i)
  }

  toJSON() {
    const { view, i } = this
    return {
      start: view.start(i),
      end: view.end(i),
      score: view.score(i),
      refName: view.refName,
      source: view.source,
      uniqueId: view.id(i),
      summary: view.isSummary,
      minScore: view.minScore(i),
      maxScore: view.maxScore(i),
    }
  }
}

export class ArrayFeatureView {
  public readonly starts: Int32Array
  public readonly ends: Int32Array
  public readonly scores: Float32Array
  public readonly minScores: Float32Array | undefined
  public readonly maxScores: Float32Array | undefined
  public readonly isSummary: boolean
  public readonly source: string
  public readonly refName: string

  constructor(
    arrays: BigWigFeatureArrays | SummaryFeatureArrays,
    source: string,
    refName: string,
  ) {
    this.starts = arrays.starts
    this.ends = arrays.ends
    this.scores = arrays.scores
    this.isSummary = arrays.isSummary
    this.minScores = arrays.isSummary ? arrays.minScores : undefined
    this.maxScores = arrays.isSummary ? arrays.maxScores : undefined
    this.source = source
    this.refName = refName
  }

  get length() {
    return this.starts.length
  }

  start(i: number) {
    return this.starts[i]
  }

  end(i: number) {
    return this.ends[i]
  }

  score(i: number) {
    return this.scores[i]
  }

  minScore(i: number) {
    return this.minScores?.[i]
  }

  maxScore(i: number) {
    return this.maxScores?.[i]
  }

  id(i: number) {
    return `${this.source}:${this.refName}:${this.starts[i]}-${this.ends[i]}`
  }

  get(i: number, key: 'refName' | 'source'): string
  get(
    i: number,
    key: 'start' | 'end' | 'score' | 'minScore' | 'maxScore',
  ): number | undefined
  get(i: number, key: 'summary'): boolean

  get(i: number, key: string): string | number | boolean | undefined
  get(i: number, key: string) {
    switch (key) {
      case 'start':
        return this.starts[i]
      case 'end':
        return this.ends[i]
      case 'score':
        return this.scores[i]
      case 'refName':
        return this.refName
      case 'source':
        return this.source
      case 'minScore':
        return this.minScores?.[i]
      case 'maxScore':
        return this.maxScores?.[i]
      case 'summary':
        return this.isSummary
      default:
        return undefined
    }
  }
}
