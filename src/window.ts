import RequestWorker from './requestWorker'
/**
 * View into a subset of the data in a BigWig file.
 *
 * Adapted by Robert Buels and Colin Diesh from bigwig.js in the Dalliance Genome
 * Explorer by Thomas Down.
 * @constructs
 */

export default class Window {
  private cirTreeOffset: number
  private cirTreeLength: number
  private cirBlockSize: number
  private bwg: any
  private isSummary: boolean

  constructor(bwg: any, cirTreeOffset: number, cirTreeLength: number, isSummary: boolean) {
    this.bwg = bwg
    if (!(cirTreeOffset >= 0)) throw new Error('invalid cirTreeOffset!')
    if (!(cirTreeLength > 0)) throw new Error('invalid cirTreeLength!')

    this.cirTreeOffset = cirTreeOffset
    this.cirTreeLength = cirTreeLength
    this.cirBlockSize = 0
    this.isSummary = isSummary
  }
  // todo:memoize/lru
  async readWigData(chrName: string, min: number, max: number) {
    const chr = this.bwg.header.refsByName[chrName]
    if (!chr) {
      return []
    }
    const buffer = Buffer.alloc(48)
    await this.bwg.bbi.read(buffer, 0, 48, this.cirTreeOffset).then(() => {
      this.cirBlockSize = buffer.readUInt32LE(4) // TODO little endian?
    })

    const worker = new RequestWorker(this, chr, min, max)

    return Promise.all(worker.cirFobRecur([this.cirTreeOffset + 48], 1)).then((arr: any) =>
      arr.reduce((acc: any, val: any) => acc.concat(val), []),
    )
  }
}
