import {
  decompressAndParseBigBed,
  decompressAndParseBigWig,
  decompressAndParseSummary,
  inflateRawBatch,
  parseBigBedBlocks,
  parseBigWigBlocks,
  parseSummaryBlocks,
} from './wasm/inflate-wasm-inlined.js'

import type {
  BigBedFeatureArrays as WasmBigBedFeatureArrays,
  BigWigFeatureArrays as WasmBigWigFeatureArrays,
  SummaryFeatureArrays as WasmSummaryFeatureArrays,
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
): Promise<WasmBigWigFeatureArrays> {
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
): Promise<WasmSummaryFeatureArrays> {
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

export async function parseBigWigBlocksWasm(
  data: Uint8Array,
  blocks: { offset: number; length: number }[],
  reqStart: number,
  reqEnd: number,
): Promise<WasmBigWigFeatureArrays> {
  const inputOffsets = new Uint32Array(blocks.length)
  const inputLengths = new Uint32Array(blocks.length)

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!
    inputOffsets[i] = block.offset
    inputLengths[i] = block.length
  }

  return parseBigWigBlocks(data, inputOffsets, inputLengths, reqStart, reqEnd)
}

export async function parseSummaryBlocksWasm(
  data: Uint8Array,
  blocks: { offset: number; length: number }[],
  reqChrId: number,
  reqStart: number,
  reqEnd: number,
): Promise<WasmSummaryFeatureArrays> {
  const inputOffsets = new Uint32Array(blocks.length)
  const inputLengths = new Uint32Array(blocks.length)

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!
    inputOffsets[i] = block.offset
    inputLengths[i] = block.length
  }

  return parseSummaryBlocks(
    data,
    inputOffsets,
    inputLengths,
    reqChrId,
    reqStart,
    reqEnd,
  )
}

export async function decompressAndParseBigBedBlocks(
  data: Uint8Array,
  blocks: { offset: number; length: number }[],
  blockFileOffsets: number[],
  maxOutputSize: number,
  reqChrId: number,
  reqStart: number,
  reqEnd: number,
): Promise<WasmBigBedFeatureArrays> {
  const inputOffsets = new Uint32Array(blocks.length)
  const inputLengths = new Uint32Array(blocks.length)
  const fileOffsets = new Uint32Array(blocks.length)

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!
    inputOffsets[i] = block.offset
    inputLengths[i] = block.length
    fileOffsets[i] = blockFileOffsets[i]!
  }

  return decompressAndParseBigBed(
    data,
    inputOffsets,
    inputLengths,
    fileOffsets,
    maxOutputSize,
    reqChrId,
    reqStart,
    reqEnd,
  )
}

export async function parseBigBedBlocksWasm(
  data: Uint8Array,
  blocks: { offset: number; length: number }[],
  blockFileOffsets: number[],
  reqChrId: number,
  reqStart: number,
  reqEnd: number,
): Promise<WasmBigBedFeatureArrays> {
  const inputOffsets = new Uint32Array(blocks.length)
  const inputLengths = new Uint32Array(blocks.length)
  const fileOffsets = new Uint32Array(blocks.length)

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!
    inputOffsets[i] = block.offset
    inputLengths[i] = block.length
    fileOffsets[i] = blockFileOffsets[i]!
  }

  return parseBigBedBlocks(
    data,
    inputOffsets,
    inputLengths,
    fileOffsets,
    reqChrId,
    reqStart,
    reqEnd,
  )
}

export type {
  BigBedFeatureArrays,
  BigWigFeatureArrays,
  SummaryFeatureArrays,
} from './types.ts'
