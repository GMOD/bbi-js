import wasmData from '../../src/wasm/inflate_wasm_bg.wasm'
import * as bg from '../../src/wasm/inflate_wasm_bg.js'
import {
  decompress_and_parse_bigwig,
  decompress_and_parse_summary,
  inflate_raw,
  inflate_raw_batch,
  inflate_raw_unknown_size,
} from '../../src/wasm/inflate_wasm.js'

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

export async function inflateRaw(
  input: Uint8Array,
  outputSize: number,
): Promise<Uint8Array> {
  await init()
  return inflate_raw(input, outputSize)
}

export async function inflateRawUnknownSize(
  input: Uint8Array,
): Promise<Uint8Array> {
  await init()
  return inflate_raw_unknown_size(input)
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

function unpackBigWigFeatures(packed: Uint8Array): WasmBigWigArrays {
  const view = new DataView(packed.buffer, packed.byteOffset, packed.byteLength)
  const count = view.getUint32(0, true)

  if (count === 0) {
    return {
      starts: new Int32Array(0),
      ends: new Int32Array(0),
      scores: new Float32Array(0),
    }
  }

  const startsOffset = 4
  const endsOffset = startsOffset + count * 4
  const scoresOffset = endsOffset + count * 4

  return {
    starts: new Int32Array(
      packed.buffer,
      packed.byteOffset + startsOffset,
      count,
    ),
    ends: new Int32Array(packed.buffer, packed.byteOffset + endsOffset, count),
    scores: new Float32Array(
      packed.buffer,
      packed.byteOffset + scoresOffset,
      count,
    ),
  }
}

function unpackSummaryFeatures(packed: Uint8Array): WasmSummaryArrays {
  const view = new DataView(packed.buffer, packed.byteOffset, packed.byteLength)
  const count = view.getUint32(0, true)

  if (count === 0) {
    return {
      starts: new Int32Array(0),
      ends: new Int32Array(0),
      scores: new Float32Array(0),
      minScores: new Float32Array(0),
      maxScores: new Float32Array(0),
    }
  }

  const startsOffset = 4
  const endsOffset = startsOffset + count * 4
  const scoresOffset = endsOffset + count * 4
  const minScoresOffset = scoresOffset + count * 4
  const maxScoresOffset = minScoresOffset + count * 4

  return {
    starts: new Int32Array(
      packed.buffer,
      packed.byteOffset + startsOffset,
      count,
    ),
    ends: new Int32Array(packed.buffer, packed.byteOffset + endsOffset, count),
    scores: new Float32Array(
      packed.buffer,
      packed.byteOffset + scoresOffset,
      count,
    ),
    minScores: new Float32Array(
      packed.buffer,
      packed.byteOffset + minScoresOffset,
      count,
    ),
    maxScores: new Float32Array(
      packed.buffer,
      packed.byteOffset + maxScoresOffset,
      count,
    ),
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
