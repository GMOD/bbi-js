import type { BigWigFeatureArrays, SummaryFeatureArrays } from './types.ts'

export class ArrayFeatureView {
  public readonly starts: Int32Array
  public readonly ends: Int32Array
  public readonly scores: Float32Array
  public readonly minScores: Float32Array | undefined
  public readonly maxScores: Float32Array | undefined
  public readonly isSummary: boolean
  private _source: string
  private _refName: string

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
    this._source = source
    this._refName = refName
  }

  get length() {
    return this.starts.length
  }

  get source() {
    return this._source
  }

  get refName() {
    return this._refName
  }

  start(i: number) {
    return this.starts[i]!
  }

  end(i: number) {
    return this.ends[i]!
  }

  score(i: number) {
    return this.scores[i]!
  }

  minScore(i: number) {
    return this.minScores?.[i]
  }

  maxScore(i: number) {
    return this.maxScores?.[i]
  }

  id(i: number) {
    return `${this._source}:${this._refName}:${this.starts[i]}-${this.ends[i]}`
  }

  get(i: number, key: string) {
    switch (key) {
      case 'start':
        return this.starts[i]
      case 'end':
        return this.ends[i]
      case 'score':
        return this.scores[i]
      case 'refName':
        return this._refName
      case 'source':
        return this._source
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
