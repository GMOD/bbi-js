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

export async function inflateRawBatch(inputs, inputOffsets, inputLengths) {
  await init()
  const packed = bg.inflate_raw_batch(inputs, inputOffsets, inputLengths)

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
