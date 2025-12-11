import { inflateRawBatch } from './wasm/inflate-wasm-inlined.js'

export interface UnzipBatchResult {
  data: Uint8Array
  offsets: number[]
}

export async function unzipBatch(
  data: Uint8Array,
  blocks: { offset: number; length: number }[],
  maxOutputSize: number,
): Promise<UnzipBatchResult> {
  const inputOffsets = new Uint32Array(blocks.length)
  const inputLengths = new Uint32Array(blocks.length)

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!
    inputOffsets[i] = block.offset
    inputLengths[i] = block.length
  }

  return inflateRawBatch(data, inputOffsets, inputLengths, maxOutputSize)
}
