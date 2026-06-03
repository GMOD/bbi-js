import type { BigWigFeatureArrays, SummaryFeatureArrays } from './types.ts'

/**
 * Single-feature view into an `ArrayFeatureView`. Exposes a JBrowse-compatible
 * `Feature`-style `get(key)` interface and a `toJSON()` method.
 *
 * Valid keys for `get()`: `start`, `end`, `score`, `refName`, `source`,
 * `summary`, `minScore`, `maxScore`.
 */
export class BigWigFeature {
  constructor(
    private view: ArrayFeatureView,
    private i: number,
  ) {}

  /** @internal */
  get(key: 'refName' | 'source'): string
  /** @internal */
  get(key: 'start' | 'end' | 'score'): number
  /** @internal */
  get(key: 'minScore' | 'maxScore'): number | undefined
  /** @internal */
  get(key: 'summary'): boolean
  /**
   * Returns the value of `key` for this feature.
   * Valid keys: `start`, `end`, `score`, `refName`, `source`, `summary`,
   * `minScore`, `maxScore`.
   */
  // any (not unknown) so this stays structurally assignable to jbrowse's
  // Feature interface, which has `get(name: string): any` as its fallback.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(key: string): any
  get(key: string) {
    return this.view.get(this.i, key)
  }

  /** @internal */
  id() {
    return this.view.id(this.i)
  }

  /** Returns a plain-object representation of this feature. */
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

/**
 * Wraps a `BigWigFeatureArrays` or `SummaryFeatureArrays` result and exposes
 * a JBrowse-compatible `Feature`-style interface. Use `view.get(i, key)` to
 * read individual feature fields, or iterate with `view.length`.
 */
export class ArrayFeatureView {
  public readonly starts: Int32Array
  public readonly ends: Int32Array
  public readonly scores: Float32Array
  public readonly minScores: Float32Array | undefined
  public readonly maxScores: Float32Array | undefined
  public readonly isSummary: boolean
  public readonly source: string
  public readonly refName: string

  /**
   * @param arrays - typed arrays result from `getFeaturesAsArrays`
   * @param source - source identifier (e.g. track name) attached to each feature
   * @param refName - chromosome name attached to each feature
   */
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

  /** Number of features in this view. */
  get length() {
    return this.starts.length
  }

  /** @internal */
  start(i: number): number {
    return this.starts[i]!
  }

  /** @internal */
  end(i: number): number {
    return this.ends[i]!
  }

  /** @internal */
  score(i: number): number {
    return this.scores[i]!
  }

  /** @internal */
  minScore(i: number): number | undefined {
    return this.minScores?.[i]
  }

  /** @internal */
  maxScore(i: number): number | undefined {
    return this.maxScores?.[i]
  }

  /** @internal */
  id(i: number) {
    return `${this.source}:${this.refName}:${this.starts[i]}-${this.ends[i]}`
  }

  get(i: number, key: 'refName' | 'source'): string
  get(i: number, key: 'start' | 'end' | 'score'): number
  get(i: number, key: 'minScore' | 'maxScore'): number | undefined
  get(i: number, key: 'summary'): boolean
  /**
   * Returns the value of `key` for feature at index `i`.
   * Valid keys: `start`, `end`, `score`, `refName`, `source`, `summary`,
   * `minScore`, `maxScore`.
   */
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
