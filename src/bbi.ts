import LRU from 'quick-lru'
import { Parser } from '@gmod/binary-parser'
import * as Long from 'long'
import { convert64Bits } from './util'

import BlockView from './blockView'
import LocalFile from './localFile'

const BIG_WIG_MAGIC = -2003829722
const BIG_BED_MAGIC = -2021002517

interface Options {
  filehandle?: any
  path?: string
  renameRefSeqs?: (a: string) => string
}

interface Statistics {
  scoreSum: number
  basesCovered: number
  scoreSumSquares: number
}
interface Header {
  autoSql: string
  totalSummary: Statistics
  zoomLevels: any
  unzoomedIndexOffset: number
  unzoomedDataOffset: number
  uncompressedDataSize: number
  chromTreeOffset: number
  fileSize: number
  refsByName: any
  refsByNumber: any
}

export default class BBIFile {
  private bbi: any
  private header?: Header
  private type: string
  private isBE: boolean
  public renameRefSeq: (a: string) => string

  constructor(options: Options) {
    const { filehandle, renameRefSeqs, path } = options
    this.renameRefSeq = renameRefSeqs || ((s: string): string => s)
    this.type = ''
    this.isBE = false

    if (filehandle) {
      this.bbi = filehandle
    } else if (path) {
      this.bbi = new LocalFile(path)
    } else {
      throw new Error('no file given')
    }
  }

  // todo: memoize
  async getHeader(): Promise<any> {
    const ret = await this.getParsers()
    const buf = Buffer.alloc(2000)
    await this.bbi.read(buf, 0, 2000, 0)
    const res = ret.headerParser.parse(buf)

    const header = res.result
    convert64Bits(header, this.isBE)
    this.type = header.magic === BIG_BED_MAGIC ? 'bigbed' : 'bigwig'

    if (header.asOffset) {
      header.autoSql = buf.slice(header.asOffset, buf.indexOf(0, header.asOffset)).toString('utf8')
    }
    if (header.totalSummaryOffset) {
      const tail = buf.slice(header.totalSummaryOffset)
      header.totalSummary = ret.totalSummaryParser.parse(tail).result
      convert64Bits(header.totalSummary, this.isBE)
    }
    const chroms = await this.readChromTree()
    this.header = { ...header, ...chroms }
    return this.header
  }

  async isBigEndian(): Promise<boolean> {
    const buf = Buffer.allocUnsafe(4)
    await this.bbi.read(buf, 0, 4, 0)
    let ret = buf.readInt32LE(0)
    if (ret === BIG_WIG_MAGIC || ret === BIG_BED_MAGIC) {
      return false
    }
    ret = buf.readInt32BE(0)
    if (ret === BIG_WIG_MAGIC || ret === BIG_BED_MAGIC) {
      return true
    }
    throw new Error('not a BigWig/BigBed file')
  }

  async getParsers(): Promise<any> {
    this.isBE = await this.isBigEndian()

    const le = this.isBigEndian ? 'big' : 'little'
    const headerParser = new Parser()
      .endianess(le)
      .int32('magic')
      .uint16('version')
      .uint16('numZoomLevels')
      .buffer('chromTreeOffset64', { length: 8 })
      .buffer('unzoomedDataOffset64', { length: 8 })
      .buffer('unzoomedIndexOffset64', { length: 8 })
      .uint16('fieldCount')
      .uint16('definedFieldCount')
      .buffer('asOffset64', { length: 8 })
      .buffer('totalSummaryOffset64', { length: 8 })
      .uint32('uncompressBufSize')
      .skip(8) // reserved
      .array('zoomLevels', {
        length: 'numZoomLevels',
        type: new Parser()
          .uint32('reductionLevel')
          .uint32('reserved')
          .buffer('dataOffset64', { length: 8 })
          .buffer('indexOffset64', { length: 8 }),
      })

    const totalSummaryParser = new Parser()
      .endianess(le)
      .buffer('basesCovered64', { length: 8 })
      .double('scoreMin')
      .double('scoreMax')
      .double('scoreSum')
      .double('scoreSumSquares')

    /* istanbul ignore next */
    const chromTreeParser = new Parser()
      .endianess(le)
      .uint32('magic')
      .uint32('blockSize')
      .uint32('keySize')
      .uint32('valSize')
      .buffer('itemCount64', { length: 8 })

    return {
      chromTreeParser,
      totalSummaryParser,
      headerParser,
    }
  }

  async readChromTree(): Promise<any> {
    if (!this.header) {
      throw new Error('need to read header first')
    }
    const refsByNumber: any = {}
    const refsByName: any = {}
    const { header } = this
    const { chromTreeOffset } = header

    let unzoomedDataOffset = header.unzoomedDataOffset
    while (unzoomedDataOffset % 4 !== 0) {
      unzoomedDataOffset += 1
    }

    const data = Buffer.alloc(unzoomedDataOffset - header.chromTreeOffset)
    await this.bbi.read(data, 0, unzoomedDataOffset - header.chromTreeOffset, header.chromTreeOffset)

    const p = await this.getParsers()
    const ret = p.chromTreeParser.parse(data).result
    convert64Bits(ret, this.isBE)

    const rootNodeOffset = 32
    const bptReadNode = (currentOffset: number) => {
      let offset = currentOffset
      if (offset >= data.length) throw new Error('reading beyond end of buffer')
      const isLeafNode = data.readUInt8(offset)
      const cnt = data.readUInt16LE(offset + 2)
      offset += 4
      for (let n = 0; n < cnt; n += 1) {
        if (isLeafNode) {
          let key = ''
          for (let ki = 0; ki < ret.keySize; ki += 1, offset += 1) {
            const charCode = data.readUInt8(offset)
            if (charCode !== 0) {
              key += String.fromCharCode(charCode)
            }
          }
          const refId = data.readUInt32LE(offset)
          const refSize = data.readUInt32LE(offset + 4)
          offset += 8

          const refRec = { name: key, id: refId, length: refSize }
          refsByName[key] = this.renameRefSeq(key)
          refsByNumber[refId] = refRec
        } else {
          // parse index node
          offset += ret.keySize
          let childOffset = Long.fromBytes(Array<number>(data.slice(offset, offset + 8))).toNumber()
          offset += 8
          childOffset -= header.chromTreeOffset
          bptReadNode(childOffset)
        }
      }
    }
    bptReadNode(rootNodeOffset)
    return {
      refsByName,
      refsByNumber,
    }
  }

  //todo: memoize
  getView(scale: number): BlockView {
    if (!this.header) {
      throw new Error('need to read header first')
    }
    const { header } = this
    const { zoomLevels, fileSize } = header
    const basesPerPx = 1 / scale
    // console.log('getting view for '+basesPerSpan+' bases per span');
    let maxLevel = zoomLevels.length
    if (!fileSize) {
      // if we don't know the file size, we can't fetch the highest zoom level :-(
      maxLevel -= 1
    }

    for (let i = maxLevel; i > 0; i -= 1) {
      const zh = zoomLevels[i]
      if (zh && zh.reductionLevel <= 2 * basesPerPx) {
        const indexLength =
          i < zoomLevels.length - 1 ? zoomLevels[i + 1].dataOffset - zh.indexOffset : fileSize - 4 - zh.indexOffset
        return new BlockView(
          this.bbi,
          this.header.refsByName,
          zh.indexOffset,
          indexLength,
          this.isBE,
          true,
          this.header.uncompressedDataSize > 0,
          this.type,
        )
      }
    }
    return this.getUnzoomedView()
  }

  //todo memoize
  private getUnzoomedView(): BlockView {
    if (!this.header) {
      throw new Error('need to read header first')
    }
    let cirLen = 4000
    const nzl = this.header.zoomLevels[0]
    if (nzl) {
      cirLen = nzl.dataOffset - this.header.unzoomedIndexOffset
    }
    return new BlockView(
      this.bbi,
      this.header.refsByName,
      this.header.unzoomedIndexOffset,
      cirLen,
      this.isBE,
      false,
      this.header.uncompressedDataSize > 0,
      this.type,
    )
  }
}
