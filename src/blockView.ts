import RequestWorker from './requestWorker'
import { Observer } from 'rxjs'
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
  private bbi: any
  private isCompressed: boolean
  private isBigEndian: boolean
  private refsByName: any
  private blockType: string

  public constructor(
    bbi: any,
    refsByName: any,
    cirTreeOffset: number,
    cirTreeLength: number,
    isBigEndian: boolean,
    isCompressed: boolean,
    blockType: string,
  ) {
    if (!(cirTreeOffset >= 0)) throw new Error('invalid cirTreeOffset!')
    if (!(cirTreeLength > 0)) throw new Error('invalid cirTreeLength!')

    this.cirTreeOffset = cirTreeOffset
    this.cirTreeLength = cirTreeLength
    this.isCompressed = isCompressed
    this.refsByName = refsByName
    this.isBigEndian = isBigEndian
    this.bbi = bbi
    this.blockType = blockType
  }

  // todo:memoize/lru
  public async readWigData(
    chrName: string,
    min: number,
    max: number,
    observer: Observer<Feature[]>,
    abortSignal?: AbortSignal,
  ): Promise<void> {
    const { refsByName, bbi, cirTreeOffset, isBigEndian, isCompressed, blockType } = this
    const chr = refsByName[chrName]
    if (chr === undefined) {
      observer.complete()
    }
    const buffer = Buffer.alloc(48)
    await bbi.read(buffer, 0, 48, cirTreeOffset, abortSignal)
    const cirBlockSize = isBigEndian ? buffer.readUInt32BE(4) : buffer.readUInt32LE(4)

    const worker = new RequestWorker(bbi, chr, min, max, observer, {
      isBigEndian,
      isCompressed,
      cirBlockSize,
      blockType,
      abortSignal,
    })

    worker.cirFobRecur([cirTreeOffset + 48], 1)
  }
}
