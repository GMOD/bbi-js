import { unzlibSync } from 'fflate'

export function unzip(input: Buffer) {
  return Buffer.from(unzlibSync(input))
}
