import { inflateRaw } from 'pako-esm2'

export function unzip(input: Uint8Array) {
  return inflateRaw(input.subarray(2), undefined)
}
