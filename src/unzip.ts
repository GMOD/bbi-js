import {
  decompressAndParseBigWig,
  decompressAndParseSummary,
  inflateRawBatch,
} from './wasm/inflate-wasm-inlined.js'

import type { Block } from './util.ts'

export interface UnzipBatchResult {
  data: Uint8Array
  offsets: number[]
}

function blocksToTypedArrays(blocks: Block[]) {
  const inputOffsets = new Uint32Array(blocks.length)
  const inputLengths = new Uint32Array(blocks.length)
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!
    inputOffsets[i] = block.offset
    inputLengths[i] = block.length
  }
  return { inputOffsets, inputLengths }
}

export async function unzipBatch(
  data: Uint8Array,
  blocks: Block[],
  maxOutputSize: number,
): Promise<UnzipBatchResult> {
  const { inputOffsets, inputLengths } = blocksToTypedArrays(blocks)
  return inflateRawBatch(data, inputOffsets, inputLengths, maxOutputSize)
}

export async function decompressAndParseBigWigBlocks(
  data: Uint8Array,
  blocks: Block[],
  maxOutputSize: number,
  reqStart: number,
  reqEnd: number,
) {
  const { inputOffsets, inputLengths } = blocksToTypedArrays(blocks)
  return decompressAndParseBigWig(
    data,
    inputOffsets,
    inputLengths,
    maxOutputSize,
    reqStart,
    reqEnd,
  )
}

export async function decompressAndParseSummaryBlocks(
  data: Uint8Array,
  blocks: Block[],
  maxOutputSize: number,
  reqChrId: number,
  reqStart: number,
  reqEnd: number,
) {
  const { inputOffsets, inputLengths } = blocksToTypedArrays(blocks)
  return decompressAndParseSummary(
    data,
    inputOffsets,
    inputLengths,
    maxOutputSize,
    reqChrId,
    reqStart,
    reqEnd,
  )
}
