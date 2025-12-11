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
