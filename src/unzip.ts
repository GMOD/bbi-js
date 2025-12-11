import { inflateRawUnknownSize } from './wasm/inflate-wasm-inlined.js'

export async function unzip(input: Uint8Array) {
  return inflateRawUnknownSize(input.subarray(2))
}
