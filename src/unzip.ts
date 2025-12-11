import {
  decompressAndParseBigWig,
  decompressAndParseSummary,
  inflateRawBatch,
  parseBigWigBlock as wasmParseBigWigBlock,
  parseSummaryBlock as wasmParseSummaryBlock,
} from './wasm/inflate-wasm-inlined.js'

import type {
  BigWigFeatureArrays,
  SummaryFeatureArrays,
} from './wasm/inflate-wasm-inlined.js'

function unpackBigWigResult(result: Uint8Array): BigWigFeatureArrays {
  const view = new DataView(result.buffer, result.byteOffset, result.byteLength)
  const count = view.getUint32(0, true)
  const starts = new Int32Array(result.buffer, result.byteOffset + 4, count)
  const ends = new Int32Array(
    result.buffer,
    result.byteOffset + 4 + count * 4,
    count,
  )
  const scores = new Float32Array(
    result.buffer,
    result.byteOffset + 4 + count * 8,
    count,
  )
  return { starts, ends, scores }
}

function unpackSummaryResult(result: Uint8Array): SummaryFeatureArrays {
  const view = new DataView(result.buffer, result.byteOffset, result.byteLength)
  const count = view.getUint32(0, true)
  const starts = new Int32Array(result.buffer, result.byteOffset + 4, count)
  const ends = new Int32Array(
    result.buffer,
    result.byteOffset + 4 + count * 4,
    count,
  )
  const scores = new Float32Array(
    result.buffer,
    result.byteOffset + 4 + count * 8,
    count,
  )
  const minScores = new Float32Array(
    result.buffer,
    result.byteOffset + 4 + count * 12,
    count,
  )
  const maxScores = new Float32Array(
    result.buffer,
    result.byteOffset + 4 + count * 16,
    count,
  )
  return { starts, ends, scores, minScores, maxScores }
}

export function parseBigWigBlockAsArrays(
  data: Uint8Array,
  reqStart: number,
  reqEnd: number,
): BigWigFeatureArrays {
  const result = wasmParseBigWigBlock(data, reqStart, reqEnd)
  return unpackBigWigResult(result)
}

export function parseSummaryBlockAsArrays(
  data: Uint8Array,
  reqChrId: number,
  reqStart: number,
  reqEnd: number,
): SummaryFeatureArrays {
  const result = wasmParseSummaryBlock(data, reqChrId, reqStart, reqEnd)
  return unpackSummaryResult(result)
}

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
