import RequestWorker from './requestWorker'
import {Observer} from 'rxjs'
import Feature from './feature'
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
  private bbi: any
  private isCompressed: boolean
  private isBigEndian: boolean
  private refsByName: any
  private type: string

  public constructor(
    bbi: any,
    refsByName: any,
    cirTreeOffset: number,
    cirTreeLength: number,
    isBigEndian: boolean,
    isSummary: boolean,
    isCompressed: boolean,
    type: string,
  ) {
    if (!(cirTreeOffset >= 0)) throw new Error('invalid cirTreeOffset!')
    if (!(cirTreeLength > 0)) throw new Error('invalid cirTreeLength!')

    this.cirTreeOffset = cirTreeOffset
    this.cirTreeLength = cirTreeLength
    this.cirBlockSize = 0
    this.isCompressed = isCompressed
    this.refsByName = refsByName
    this.isBigEndian = isBigEndian
    this.bbi = bbi
    this.type = isSummary ? 'summary' : type
  }

  // todo:memoize/lru
  public async readWigData(chrName: string, min: number, max: number, observer: Observer<Feature[]>) {
    const chr = this.refsByName[chrName]
    //console.log('chrName',chrName,this.refsByName)
    if (chr === undefined) {
      return []
    }
    const buffer = Buffer.alloc(48)
    await this.bbi.read(buffer, 0, 48, this.cirTreeOffset).then(() => {
      this.cirBlockSize = buffer.readUInt32LE(4) // TODO little endian?
    })

    const {isBigEndian,isCompressed,cirBlockSize,type} = this

    const worker = new RequestWorker(this.bbi, chr, min, max, observer, {
      isBigEndian,
      isCompressed,
      cirBlockSize,
      type,
    })

    worker.cirFobRecur([this.cirTreeOffset + 48], 1)
  }
}
