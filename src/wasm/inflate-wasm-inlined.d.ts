export function inflateRaw(
  input: Uint8Array,
  outputSize: number,
): Promise<Uint8Array>
export function inflateRawUnknownSize(input: Uint8Array): Promise<Uint8Array>

export interface BatchResult {
  data: Uint8Array
  offsets: number[]
}
export function inflateRawBatch(
  inputs: Uint8Array,
  inputOffsets: Uint32Array,
  inputLengths: Uint32Array,
  maxOutputSize: number,
): Promise<BatchResult>

export interface BigWigFeatureArrays {
  starts: Int32Array
  ends: Int32Array
  scores: Float32Array
}

export interface SummaryFeatureArrays {
  starts: Int32Array
  ends: Int32Array
  scores: Float32Array
  minScores: Float32Array
  maxScores: Float32Array
}

export function decompressAndParseBigWig(
  inputs: Uint8Array,
  inputOffsets: Uint32Array,
  inputLengths: Uint32Array,
  maxBlockSize: number,
  reqStart: number,
  reqEnd: number,
): Promise<BigWigFeatureArrays>

export function decompressAndParseSummary(
  inputs: Uint8Array,
  inputOffsets: Uint32Array,
  inputLengths: Uint32Array,
  maxBlockSize: number,
  reqChrId: number,
  reqStart: number,
  reqEnd: number,
): Promise<SummaryFeatureArrays>

export function parseBigWigBlock(
  data: Uint8Array,
  reqStart: number,
  reqEnd: number,
): BigWigFeatureArrays

export function parseSummaryBlock(
  data: Uint8Array,
  reqChrId: number,
  reqStart: number,
  reqEnd: number,
): SummaryFeatureArrays
