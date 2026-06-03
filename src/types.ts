/** A zoom level entry from the BigWig file header. */
export interface ZoomLevel {
  reductionLevel: number
  dataOffset: number
  indexOffset: number
}

/** A single feature returned by `getFeatures`. */
export interface Feature {
  /** @internal */
  offset?: number
  /** @internal */
  chromId?: number
  /** 0-based half-open start coordinate. */
  start: number
  /** 0-based half-open end coordinate. */
  end: number
  /** Signal score (BigWig) or BED score (BigBed). */
  score?: number
  /** Raw tab-delimited BED columns 4+ (BigBed only). */
  rest?: string
  /** Minimum score in a summary interval (zoom data only). */
  minScore?: number
  /** Maximum score in a summary interval (zoom data only). */
  maxScore?: number
  /** True when the feature comes from a zoom/summary level. */
  summary?: boolean
  /** Stable ID derived from the file offset; used to deduplicate exact copies (BigBed only). */
  uniqueId?: string
  /** Extra-index column that matched during a `searchExtraIndex` call (BigBed only). */
  field?: number
}

/** Summary statistics stored in the BigWig file header. */
export interface Statistics {
  scoreSum: number
  basesCovered: number
  scoreSumSquares: number
  scoreMin: number
  scoreMax: number
}

/** Chromosome metadata from the BigWig/BigBed header. */
export interface RefInfo {
  name: string
  id: number
  length: number
}

/** Raw parsed BigWig/BigBed file header (without chromosome maps). */
export interface BigWigHeader {
  magic: number
  version: number
  /** autoSql schema string (BigBed only; empty string for BigWig). */
  autoSql: string
  totalSummary: Statistics
  asOffset: number
  zoomLevels: ZoomLevel[]
  fieldCount: number
  numZoomLevels: number
  unzoomedIndexOffset: number
  totalSummaryOffset: number
  unzoomedDataOffset: number
  definedFieldCount: number
  uncompressBufSize: number
  chromosomeTreeOffset: number
  extHeaderOffset: number
  fileType: string
}

/** BigWig/BigBed file header including chromosome name and ID maps. Returned by `getHeader()`. */
export interface BigWigHeaderWithRefNames extends BigWigHeader {
  /** Map from chromosome name → internal integer ID. */
  refsByName: Record<string, number>
  /** Map from internal integer ID → `RefInfo`. */
  refsByNumber: Record<number, RefInfo>
}

/** Options accepted by all data-fetching methods. */
export interface RequestOptions {
  signal?: AbortSignal
  headers?: Record<string, string>
}

/** Options for `getFeatures` / `getFeaturesMulti` / `getFeaturesAsArrays`. */
export interface RequestOptions2 extends RequestOptions {
  /**
   * Pixels per base pair — selects the zoom level whose
   * `reductionLevel <= 2 / scale`. Omit for base-resolution data.
   */
  scale?: number
  /** Bases per pixel — inverse of `scale`. Use one or the other. */
  basesPerSpan?: number
}

/** Typed-array result for base-resolution BigWig features (`isSummary: false`). */
export interface BigWigFeatureArrays {
  starts: Int32Array
  ends: Int32Array
  scores: Float32Array
  isSummary: false
}

/** Typed-array result for zoom/summary BigWig features (`isSummary: true`). */
export interface SummaryFeatureArrays {
  starts: Int32Array
  ends: Int32Array
  scores: Float32Array
  minScores: Float32Array
  maxScores: Float32Array
  isSummary: true
}
