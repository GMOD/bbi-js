import {
  inflateRawUnknownSize,
  inflateRawBatch,
} from './wasm/inflate-wasm-inlined.js'

export async function unzip(input: Uint8Array) {
  return inflateRawUnknownSize(input.subarray(2))
}

export interface UnzipBatchResult {
  data: Uint8Array
  offsets: number[]
}

export async function unzipBatch(
  data: Uint8Array,
  blocks: { offset: number; length: number }[],
): Promise<UnzipBatchResult> {
  const inputOffsets = new Uint32Array(blocks.length)
  const inputLengths = new Uint32Array(blocks.length)

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!
    inputOffsets[i] = block.offset + 2
    inputLengths[i] = block.length - 2
  }

  return inflateRawBatch(data, inputOffsets, inputLengths)
}
