import { inflateRaw } from 'pako'

export function unzip(input: Uint8Array) {
  return inflateRaw(input.subarray(2))
}
