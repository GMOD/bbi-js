import { Parser } from '@gmod/binary-parser'
import * as Long from 'long'
import BlockView from './blockView'
import LocalFile from './localFile'
import { abortBreakPoint, checkAbortSignal } from './util'

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
  uncompressBufSize: number
  chromTreeOffset: number
  fileSize: number
}

interface ChromTree {
  refsByName: any
  refsByNumber: any
}

export default abstract class BBIFile {
  private bbi: any
  private fileType: string
  protected renameRefSeqs: (a: string) => string

  public constructor(options: Options) {
    const { filehandle, renameRefSeqs, path } = options
    this.renameRefSeqs = renameRefSeqs || ((s: string): string => s)
    this.fileType = ''
    if (filehandle) {
      this.bbi = filehandle
    } else if (path) {
      this.bbi = new LocalFile(path)
    } else {
      throw new Error('no file given')
    }
  }

  public async initData(abortSignal?: AbortSignal): Promise<any> {
    const header = await this.getHeader(abortSignal)
    const isBE = await this.isBigEndian(abortSignal)
    const chroms = await this.readChromTree(abortSignal)
    return { header, chroms, isBE }
  }

  // todo: memoize
  public async getHeader(abortSignal?: AbortSignal): Promise<Header> {
    const ret = await this.getParsers(await this.isBigEndian())
    const buf = Buffer.alloc(2000)
    await this.bbi.read(buf, 0, 2000, 0, abortSignal)
    const header = ret.headerParser.parse(buf).result
    this.fileType = header.magic === BIG_BED_MAGIC ? 'bigbed' : 'bigwig'

    if (header.asOffset) {
      header.autoSql = buf.slice(header.asOffset, buf.indexOf(0, header.asOffset)).toString('utf8')
    }
    if (header.totalSummaryOffset) {
      const tail = buf.slice(header.totalSummaryOffset)
      header.totalSummary = ret.totalSummaryParser.parse(tail).result
    }
    return header
  }

  private async isBigEndian(abortSignal?: AbortSignal): Promise<boolean> {
    const buf = Buffer.allocUnsafe(4)
    await this.bbi.read(buf, 0, 4, 0, abortSignal)
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

  private getParsers(isBE: boolean): any {
    const le = isBE ? 'big' : 'little'
    /* istanbul ignore next */
    const headerParser = new Parser()
      .endianess(le)
      .int32('magic')
      .uint16('version')
      .uint16('numZoomLevels')
      .buffer('chromTreeOffset', {
        length: 8,
        formatter: function(buf: any): number {
          return Long.fromBytes(buf, true, this.endian === 'le').toNumber()
        },
      })
      .buffer('unzoomedDataOffset', {
        length: 8,
        formatter: function(buf: any): number {
          return Long.fromBytes(buf, true, this.endian === 'le').toNumber()
        },
      })
      .buffer('unzoomedIndexOffset', {
        length: 8,
        formatter: function(buf: any): number {
          return Long.fromBytes(buf, true, this.endian === 'le').toNumber()
        },
      })
      .uint16('fieldCount')
      .uint16('definedFieldCount')
      .buffer('asOffset', {
        length: 8,
        formatter: function(buf: any): number {
          return Long.fromBytes(buf, true, this.endian === 'le').toNumber()
        },
      })
      .buffer('totalSummaryOffset', {
        length: 8,
        formatter: function(buf: any): number {
          return Long.fromBytes(buf, true, this.endian === 'le').toNumber()
        },
      })
      .uint32('uncompressBufSize')
      .skip(8) // reserved
      .array('zoomLevels', {
        length: 'numZoomLevels',
        type: new Parser()
          .uint32('reductionLevel')
          .uint32('reserved')
          .buffer('dataOffset', {
            length: 8,
            formatter: function(buf: any): number {
              return Long.fromBytes(buf, true, this.endian === 'le').toNumber()
            },
          })
          .buffer('indexOffset', {
            length: 8,
            formatter: function(buf: any): number {
              return Long.fromBytes(buf, true, this.endian === 'le').toNumber()
            },
          }),
      })

    /* istanbul ignore next */
    const totalSummaryParser = new Parser()
      .endianess(le)
      .buffer('basesCovered', {
        length: 8,
        formatter: function(buf: any): number {
          return Long.fromBytes(buf, true, this.endian === 'le').toNumber()
        },
      })
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
      .buffer('itemCount', {
        length: 8,
        formatter: function(buf: any): number {
          return Long.fromBytes(buf, true, this.endian === 'le').toNumber()
        },
      })

    return {
      chromTreeParser,
      totalSummaryParser,
      headerParser,
    }
  }

  private async readChromTree(abortSignal?: AbortSignal): Promise<ChromTree> {
    const header = await this.getHeader()
    const isBE = await this.isBigEndian()
    const refsByNumber: any = {}
    const refsByName: any = {}
    const { chromTreeOffset } = header
    let { unzoomedDataOffset } = header

    while (unzoomedDataOffset % 4 !== 0) {
      unzoomedDataOffset += 1
    }

    const data = Buffer.alloc(unzoomedDataOffset - chromTreeOffset)
    await this.bbi.read(data, 0, unzoomedDataOffset - chromTreeOffset, chromTreeOffset, abortSignal)

    const p = await this.getParsers(isBE)
    const ret = p.chromTreeParser.parse(data).result

    const rootNodeOffset = 32
    const bptReadNode = async (currentOffset: number): Promise<void> => {
      let offset = currentOffset
      if (offset >= data.length) throw new Error('reading beyond end of buffer')
      const isLeafNode = data.readUInt8(offset)
      const cnt = data.readUInt16LE(offset + 2)
      offset += 4
      for (let n = 0; n < cnt; n += 1) {
        await abortBreakPoint(abortSignal)
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
          refsByName[this.renameRefSeqs(key)] = refId
          refsByNumber[refId] = refRec
        } else {
          // parse index node
          offset += ret.keySize
          const bytes = data.slice(offset, offset + 8) as unknown
          let childOffset = Long.fromBytes(bytes as number[]).toNumber()
          offset += 8
          childOffset -= chromTreeOffset
          await bptReadNode(childOffset)
        }
      }
    }
    await bptReadNode(rootNodeOffset)
    return {
      refsByName,
      refsByNumber,
    }
  }

  //todo: memoize
  protected async getView(scale: number, abortSignal?: AbortSignal): Promise<BlockView> {
    const { header, chroms, isBE } = await this.initData(abortSignal)
    const { zoomLevels, fileSize } = header
    const basesPerPx = 1 / scale
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
          chroms.refsByName,
          zh.indexOffset,
          indexLength,
          isBE,
          header.uncompressBufSize > 0,
          'summary',
        )
      }
    }
    return this.getUnzoomedView(abortSignal)
  }

  //todo memoize
  private async getUnzoomedView(abortSignal?: AbortSignal): Promise<BlockView> {
    const { header, chroms, isBE } = await this.initData(abortSignal)
    let cirLen = 4000
    const nzl = header.zoomLevels[0]
    if (nzl) {
      cirLen = nzl.dataOffset - header.unzoomedIndexOffset
    }
    return new BlockView(
      this.bbi,
      chroms.refsByName,
      header.unzoomedIndexOffset,
      cirLen,
      isBE,
      header.uncompressBufSize > 0,
      this.fileType,
    )
  }
}
