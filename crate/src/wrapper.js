import wasmData from '../../src/wasm/inflate_wasm_bg.wasm'
import * as bg from '../../src/wasm/inflate_wasm_bg.js'

let wasm = null
let initPromise = null

async function init() {
  if (wasm) return wasm

  if (!initPromise) {
    initPromise = (async () => {
      const response = await fetch(wasmData)
      const bytes = await response.arrayBuffer()
      const { instance } = await WebAssembly.instantiate(bytes, {
        './inflate_wasm_bg.js': bg,
      })
      wasm = instance.exports
      bg.__wbg_set_wasm(wasm)
      return wasm
    })()
  }

  return initPromise
}

export async function inflateRaw(input, outputSize) {
  await init()
  return bg.inflate_raw(input, outputSize)
}

export async function inflateRawUnknownSize(input) {
  await init()
  return bg.inflate_raw_unknown_size(input)
}

export async function inflateRawBatch(
  inputs,
  inputOffsets,
  inputLengths,
  maxOutputSize,
) {
  await init()
  const packed = bg.inflate_raw_batch(
    inputs,
    inputOffsets,
    inputLengths,
    maxOutputSize,
  )

  const view = new DataView(packed.buffer, packed.byteOffset, packed.byteLength)
  const numBlocks = view.getUint32(0, true)
  const offsetsStart = 4
  const dataStart = offsetsStart + (numBlocks + 1) * 4

  const offsets = new Array(numBlocks + 1)
  for (let i = 0; i <= numBlocks; i++) {
    offsets[i] = view.getUint32(offsetsStart + i * 4, true)
  }

  const data = packed.subarray(dataStart)

  return { data, offsets }
}

function unpackBigWigFeatures(packed) {
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

function unpackSummaryFeatures(packed) {
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
  inputs,
  inputOffsets,
  inputLengths,
  maxBlockSize,
  reqStart,
  reqEnd,
) {
  await init()
  const packed = bg.decompress_and_parse_bigwig(
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
  inputs,
  inputOffsets,
  inputLengths,
  maxBlockSize,
  reqChrId,
  reqStart,
  reqEnd,
) {
  await init()
  const packed = bg.decompress_and_parse_summary(
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

export async function parseBigWigBlocks(
  inputs,
  inputOffsets,
  inputLengths,
  reqStart,
  reqEnd,
) {
  await init()
  const packed = bg.parse_bigwig_blocks(
    inputs,
    inputOffsets,
    inputLengths,
    reqStart,
    reqEnd,
  )
  return unpackBigWigFeatures(packed)
}

export async function parseSummaryBlocks(
  inputs,
  inputOffsets,
  inputLengths,
  reqChrId,
  reqStart,
  reqEnd,
) {
  await init()
  const packed = bg.parse_summary_blocks(
    inputs,
    inputOffsets,
    inputLengths,
    reqChrId,
    reqStart,
    reqEnd,
  )
  return unpackSummaryFeatures(packed)
}
