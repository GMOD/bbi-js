import { inflateRaw } from '@progress/pako-esm'

export function unzip(input: Uint8Array) {
  return inflateRaw(input.subarray(2))
}
