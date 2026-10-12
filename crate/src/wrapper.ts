import wasmData from '../pkg/inflate_wasm_bg.wasm'
import * as bg from '../pkg/inflate_wasm_bg.js'
import {
  decompress_and_parse_bigwig,
  decompress_and_parse_summary,
  inflate_raw_batch,
} from '../pkg/inflate_wasm.js'

let wasm: WebAssembly.Exports | null = null
let initPromise: Promise<WebAssembly.Exports> | null = null

async function init(): Promise<WebAssembly.Exports> {
  if (wasm) {
    return wasm
  }
  if (!initPromise) {
    initPromise = (async () => {
      const response = await fetch(wasmData)
      const bytes = await response.arrayBuffer()
      const { instance } = await WebAssembly.instantiate(bytes, {
        './inflate_wasm_bg.js': bg,
      })
      bg.__wbg_set_wasm(instance.exports)
      wasm = instance.exports
      return wasm
    })()
  }
  return initPromise
}

export interface BatchResult {
  data: Uint8Array
  offsets: number[]
}

export interface WasmBigWigArrays {
  starts: Int32Array
  ends: Int32Array
  scores: Float32Array
}

export interface WasmSummaryArrays {
  starts: Int32Array
  ends: Int32Array
  scores: Float32Array
  minScores: Float32Array
  maxScores: Float32Array
}

export async function inflateRawBatch(
  inputs: Uint8Array,
  inputOffsets: Uint32Array,
  inputLengths: Uint32Array,
  maxOutputSize: number,
): Promise<BatchResult> {
  await init()
  const packed = inflate_raw_batch(
    inputs,
    inputOffsets,
    inputLengths,
    maxOutputSize,
  )

  const view = new DataView(packed.buffer, packed.byteOffset, packed.byteLength)
  const numBlocks = view.getUint32(0, true)
  const offsetsStart = 4
  const dataStart = offsetsStart + (numBlocks + 1) * 4

  const offsets = new Array<number>(numBlocks + 1)
  for (let i = 0; i <= numBlocks; i++) {
    offsets[i] = view.getUint32(offsetsStart + i * 4, true)
  }

  const data = packed.subarray(dataStart)

  return { data, offsets }
}

// The fused parsers pack [count: u32] then one count-long 4-byte column per
// field, in the order the unpackers below read them
function readColumns(packed: Uint8Array) {
  const count = new DataView(
    packed.buffer,
    packed.byteOffset,
    packed.byteLength,
  ).getUint32(0, true)
  const columnOffset = (i: number) => packed.byteOffset + 4 + i * count * 4
  return {
    int32: (i: number) => new Int32Array(packed.buffer, columnOffset(i), count),
    float32: (i: number) =>
      new Float32Array(packed.buffer, columnOffset(i), count),
  }
}

function unpackBigWigFeatures(packed: Uint8Array): WasmBigWigArrays {
  const { int32, float32 } = readColumns(packed)
  return { starts: int32(0), ends: int32(1), scores: float32(2) }
}

function unpackSummaryFeatures(packed: Uint8Array): WasmSummaryArrays {
  const { int32, float32 } = readColumns(packed)
  return {
    starts: int32(0),
    ends: int32(1),
    scores: float32(2),
    minScores: float32(3),
    maxScores: float32(4),
  }
}

export async function decompressAndParseBigWig(
  inputs: Uint8Array,
  inputOffsets: Uint32Array,
  inputLengths: Uint32Array,
  maxBlockSize: number,
  reqStart: number,
  reqEnd: number,
): Promise<WasmBigWigArrays> {
  await init()
  const packed = decompress_and_parse_bigwig(
    inputs,
    inputOffsets,
    inputLengths,
    maxBlockSize,
    reqStart,
    reqEnd,
  )
  return unpackBigWigFeatures(packed)
}

export async function decompressAndParseSummary(
  inputs: Uint8Array,
  inputOffsets: Uint32Array,
  inputLengths: Uint32Array,
  maxBlockSize: number,
  reqChrId: number,
  reqStart: number,
  reqEnd: number,
): Promise<WasmSummaryArrays> {
  await init()
  const packed = decompress_and_parse_summary(
    inputs,
    inputOffsets,
    inputLengths,
    maxBlockSize,
    reqChrId,
    reqStart,
    reqEnd,
  )
  return unpackSummaryFeatures(packed)
}
