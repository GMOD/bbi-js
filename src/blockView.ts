import RequestWorker from './requestWorker'
/**
 * View into a subset of the data in a BigWig file.
 *
 * Adapted by Robert Buels and Colin Diesh from bigwig.js in the Dalliance Genome
 * Explorer by Thomas Down.
 * @constructs
 */



export default class BlockView {
  private cirTreeOffset: number
  private cirTreeLength: number
  private cirBlockSize: number
  private isSummary: boolean
  private bbi: LocalFile
  private isCompressed: boolean
  private isBigEndian: boolean
  private refsByName: any

  constructor(bbi: any, refsByName: any, cirTreeOffset: number, cirTreeLength: number, isBigEndian: boolean, isSummary: boolean, isCompressed: boolean) {
    if (!(cirTreeOffset >= 0)) throw new Error('invalid cirTreeOffset!')
    if (!(cirTreeLength > 0)) throw new Error('invalid cirTreeLength!')

    this.cirTreeOffset = cirTreeOffset
    this.cirTreeLength = cirTreeLength
    this.cirBlockSize = 0
    this.isSummary = isSummary
    this.isCompressed = isCompressed
    this.refsByName = refsByName
    this.isBigEndian = isBigEndian
    this.bbi = bbi
  }
  // todo:memoize/lru
  async readWigData(chrName: string, min: number, max: number) {
    const chr = this.refsByName[chrName]
    if (!chr) {
      return []
    }
    const buffer = Buffer.alloc(48)
    await this.bbi.read(buffer, 0, 48, this.cirTreeOffset).then(() => {
      this.cirBlockSize = buffer.readUInt32LE(4) // TODO little endian?
    })

    const worker = new RequestWorker(this.bbi, chr, min, max, {
      isBigEndian: this.isBigEndian,
      compressed: this.isCompressed,
      cirBlockSize: this.cirBlockSize,
      type: this.type,
      isSummary: this.isSummary
    })

    return Promise.all(worker.cirFobRecur([this.cirTreeOffset + 48], 1)).then((arr: any) =>
      arr.reduce((acc: any, val: any) => acc.concat(val), []),
    )
  }
}
