export interface ZoomLevel {
  reductionLevel: number
  reserved: number
  dataOffset: number
  indexOffset: number
}

export interface Feature {
  offset?: number
  chromId: number
  start: number
  end: number
  score?: number
  rest?: string // for bigbed line
  minScore?: number // for summary line
  maxScore?: number // for summary line
  summary?: boolean // is summary line
  uniqueId?: string // for bigbed contains uniqueId calculated from file offset
  field?: number // used in bigbed searching
}
export interface Statistics {
  scoreSum: number
  basesCovered: number
  scoreSumSquares: number
  scoreMin: number
  scoreMax: number
}

export interface RefInfo {
  name: string
  id: number
  length: number
}

export interface BigWigHeader {
  magic: number
  version: number
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
  chromTreeOffset: number
  extHeaderOffset: number
  fileType: string
}
export interface BigWigHeaderWithRefNames extends BigWigHeader {
  refsByName: Record<string, number>
  refsByNumber: Record<number, RefInfo>
}

export interface RequestOptions {
  signal?: AbortSignal
  headers?: Record<string, string>
  [key: string]: unknown
}

export interface RequestOptions2 extends RequestOptions {
  scale?: number
  basesPerSpan?: number
}

export interface CoordRequest {
  chrId: number
  start: number
  end: number
}

export interface BlockToFetch {
  offset: number
  length: number
}

export interface Options {
  signal?: AbortSignal
  request?: CoordRequest
}
