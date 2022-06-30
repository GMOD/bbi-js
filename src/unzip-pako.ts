import { unzlibSync } from 'fflate'

export function unzip(input: Buffer) {
  return unzlibSync(input)
}
