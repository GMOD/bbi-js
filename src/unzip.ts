import {
  decompressAndParseBigWig,
  decompressAndParseSummary,
  inflateRawBatch,
} from './wasm/inflate-wasm-inlined.js'

import type {
  BigWigFeatureArrays,
  SummaryFeatureArrays,
} from './wasm/inflate-wasm-inlined.js'



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

export async function decompressAndParseBigWigBlocks(
  data: Uint8Array,
  blocks: { offset: number; length: number }[],
  maxOutputSize: number,
  reqStart: number,
  reqEnd: number,
): Promise<BigWigFeatureArrays> {
  const inputOffsets = new Uint32Array(blocks.length)
  const inputLengths = new Uint32Array(blocks.length)

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!
    inputOffsets[i] = block.offset
    inputLengths[i] = block.length
  }

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
  blocks: { offset: number; length: number }[],
  maxOutputSize: number,
  reqChrId: number,
  reqStart: number,
  reqEnd: number,
): Promise<SummaryFeatureArrays> {
  const inputOffsets = new Uint32Array(blocks.length)
  const inputLengths = new Uint32Array(blocks.length)

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!
    inputOffsets[i] = block.offset
    inputLengths[i] = block.length
  }

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

export type { BigWigFeatureArrays, SummaryFeatureArrays } from './types.ts'