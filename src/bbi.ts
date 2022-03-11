import { Parser } from '@gmod/binary-parser'
import { LocalFile, RemoteFile, GenericFilehandle } from 'generic-filehandle'
import { Observable, Observer } from 'rxjs'
import { reduce } from 'rxjs/operators'
import AbortablePromiseCache from 'abortable-promise-cache'
import QuickLRU from 'quick-lru'
import { BlockView } from './blockView'

const BIG_WIG_MAGIC = -2003829722
const BIG_BED_MAGIC = -2021002517

export interface Feature {
  start: number
  end: number
  score: number
  rest?: string // for bigbed line
  minScore?: number // for summary line
  maxScore?: number // for summary line
  summary?: boolean // is summary line
  uniqueId?: string // for bigbed contains uniqueId calculated from file offset
  field?: number // used in bigbed searching
}
interface Statistics {
  scoreSum: number
  basesCovered: number
  scoreSumSquares: number
}

interface RefInfo {
  name: string
  id: number
  length: number
}
export interface Header {
  autoSql: string
  totalSummary: Statistics
  zoomLevels: any
  unzoomedIndexOffset: number
  unzoomedDataOffset: number
  definedFieldCount: number
  uncompressBufSize: number
  chromTreeOffset: number
  fileSize: number
  extHeaderOffset: number
  isBigEndian: boolean
  fileType: string
  refsByName: { [key: string]: number }
  refsByNumber: { [key: number]: RefInfo }
}

/* get the compiled parsers for different sections of the bigwig file
 *
 * @param isBE - is big endian, typically false
 * @return an object with compiled parsers
 */
function getParsers(isBE: boolean): any {
  const le = isBE ? 'big' : 'little'
  const headerParser = new Parser()
    .endianess(le)
    .int32('magic')
    .uint16('version')
    .uint16('numZoomLevels')
    .uint64('chromTreeOffset')
    .uint64('unzoomedDataOffset')
    .uint64('unzoomedIndexOffset')
    .uint16('fieldCount')
    .uint16('definedFieldCount')
    .uint64('asOffset') // autoSql offset, used in bigbed
    .uint64('totalSummaryOffset')
    .uint32('uncompressBufSize')
    .uint64('extHeaderOffset') // name index offset, used in bigbed
    .array('zoomLevels', {
      length: 'numZoomLevels',
      type: new Parser()
        .uint32('reductionLevel')
        .uint32('reserved')
        .uint64('dataOffset')
        .uint64('indexOffset'),
    })

  const totalSummaryParser = new Parser()
    .endianess(le)
    .uint64('basesCovered')
    .double('scoreMin')
    .double('scoreMax')
    .double('scoreSum')
    .double('scoreSumSquares')

  const chromTreeParser = new Parser()
    .endianess(le)
    .uint32('magic')
    .uint32('blockSize')
    .uint32('keySize')
    .uint32('valSize')
    .uint64('itemCount')

  const isLeafNode = new Parser()
    .endianess(le)
    .uint8('isLeafNode')
    .skip(1)
    .uint16('cnt')

  return {
    chromTreeParser,
    totalSummaryParser,
    headerParser,
    isLeafNode,
  }
}

export interface RequestOptions {
  signal?: AbortSignal
  headers?: Record<string, string>
  [key: string]: unknown
}

export abstract class BBI {
  protected bbi: GenericFilehandle

  protected headerCache = new AbortablePromiseCache({
    cache: new QuickLRU({ maxSize: 1 }),
    fill: async (params: any, signal?: AbortSignal) => {
      return this._getHeader({ ...params, signal })
    },
  })

  protected renameRefSeqs: (a: string) => string

  /* fetch and parse header information from a bigwig or bigbed file
   * @param abortSignal - abort the operation, can be null
   * @return a Header object
   */
  public getHeader(opts: RequestOptions | AbortSignal = {}) {
    const options = 'aborted' in opts ? { signal: opts } : opts
    return this.headerCache.get(
      JSON.stringify(options),
      options,
      options.signal,
    )
  }

  /*
   * @param filehandle - a filehandle from generic-filehandle or implementing something similar to the node10 fs.promises API
   * @param path - a Local file path as a string
   * @param url - a URL string
   * @param renameRefSeqs - an optional method to rename the internal reference sequences using a mapping function
   */
  public constructor(
    options: {
      filehandle?: GenericFilehandle
      path?: string
      url?: string
      renameRefSeqs?: (a: string) => string
    } = {},
  ) {
    const { filehandle, renameRefSeqs, path, url } = options
    this.renameRefSeqs = renameRefSeqs || ((s: string): string => s)
    if (filehandle) {
      this.bbi = filehandle
    } else if (url) {
      this.bbi = new RemoteFile(url)
    } else if (path) {
      this.bbi = new LocalFile(path)
    } else {
      throw new Error('no file given')
    }
  }

  private async _getHeader(opts: RequestOptions) {
    const header = await this._getMainHeader(opts)
    const chroms = await this._readChromTree(header, opts)
    return { ...header, ...chroms }
  }

  private async _getMainHeader(
    opts: RequestOptions,
    requestSize = 2000,
  ): Promise<Header> {
    const { buffer } = await this.bbi.read(
      Buffer.alloc(requestSize),
      0,
      requestSize,
      0,
      opts,
    )
    const isBigEndian = this._isBigEndian(buffer)
    const ret = getParsers(isBigEndian)
    const header = ret.headerParser.parse(buffer).result
    header.fileType = header.magic === BIG_BED_MAGIC ? 'bigbed' : 'bigwig'
    if (
      header.asOffset > requestSize ||
      header.totalSummaryOffset > requestSize
    ) {
      return this._getMainHeader(opts, requestSize * 2)
    }
    if (header.asOffset) {
      header.autoSql = buffer
        .slice(header.asOffset, buffer.indexOf(0, header.asOffset))
        .toString('utf8')
    }
    if (header.totalSummaryOffset > requestSize) {
      return this._getMainHeader(opts, requestSize * 2)
    }
    if (header.totalSummaryOffset) {
      const tail = buffer.slice(header.totalSummaryOffset)
      header.totalSummary = ret.totalSummaryParser.parse(tail).result
    }
    return { ...header, isBigEndian }
  }

  private _isBigEndian(buffer: Buffer): boolean {
    let ret = buffer.readInt32LE(0)
    if (ret === BIG_WIG_MAGIC || ret === BIG_BED_MAGIC) {
      return false
    }
    ret = buffer.readInt32BE(0)
    if (ret === BIG_WIG_MAGIC || ret === BIG_BED_MAGIC) {
      return true
    }
    throw new Error('not a BigWig/BigBed file')
  }

  // todo: add progress if long running
  private async _readChromTree(header: Header, opts: { signal?: AbortSignal }) {
    const isBE = header.isBigEndian
    const le = isBE ? 'big' : 'little'
    const refsByNumber: {
      [key: number]: { name: string; id: number; length: number }
    } = []
    const refsByName: { [key: string]: number } = {}
    const { chromTreeOffset } = header
    let { unzoomedDataOffset } = header

    while (unzoomedDataOffset % 4 !== 0) {
      unzoomedDataOffset += 1
    }

    const { buffer: data } = await this.bbi.read(
      Buffer.alloc(unzoomedDataOffset - chromTreeOffset),
      0,
      unzoomedDataOffset - chromTreeOffset,
      chromTreeOffset,
      opts,
    )

    const p = getParsers(isBE)
    const { keySize } = p.chromTreeParser.parse(data).result
    const leafNodeParser = new Parser()
      .endianess(le)
      .string('key', { stripNull: true, length: keySize })
      .uint32('refId')
      .uint32('refSize')
    const nonleafNodeParser = new Parser()
      .endianess(le)
      .skip(keySize)
      .uint64('childOffset')
    const rootNodeOffset = 32
    const bptReadNode = async (currentOffset: number): Promise<void> => {
      let offset = currentOffset
      if (offset >= data.length) {
        throw new Error('reading beyond end of buffer')
      }
      const ret = p.isLeafNode.parse(data.slice(offset))
      const { isLeafNode, cnt } = ret.result
      offset += ret.offset
      if (isLeafNode) {
        for (let n = 0; n < cnt; n += 1) {
          const leafRet = leafNodeParser.parse(data.slice(offset))
          offset += leafRet.offset
          const { key, refId, refSize } = leafRet.result
          const refRec = { name: key, id: refId, length: refSize }
          refsByName[this.renameRefSeqs(key)] = refId
          refsByNumber[refId] = refRec
        }
      } else {
        // parse index node
        const nextNodes = []
        for (let n = 0; n < cnt; n += 1) {
          const nonleafRet = nonleafNodeParser.parse(data.slice(offset))
          let { childOffset } = nonleafRet.result
          offset += nonleafRet.offset
          childOffset -= chromTreeOffset
          nextNodes.push(bptReadNode(childOffset))
        }
        await Promise.all(nextNodes)
      }
    }
    await bptReadNode(rootNodeOffset)
    return {
      refsByName,
      refsByNumber,
    }
  }

  /*
   * fetches the "unzoomed" view of the bigwig data. this is the default for bigbed
   * @param abortSignal - a signal to optionally abort this operation
   */
  protected async getUnzoomedView(opts: RequestOptions): Promise<BlockView> {
    const {
      unzoomedIndexOffset,
      zoomLevels,
      refsByName,
      uncompressBufSize,
      isBigEndian,
      fileType,
    } = await this.getHeader(opts)
    const nzl = zoomLevels[0]
    const cirLen = nzl ? nzl.dataOffset - unzoomedIndexOffset : 4000
    return new BlockView(
      this.bbi,
      refsByName,
      unzoomedIndexOffset,
      cirLen,
      isBigEndian,
      uncompressBufSize > 0,
      fileType,
    )
  }

  /*
   * abstract method - get the view for a given scale
   */
  protected abstract getView(
    scale: number,
    opts: RequestOptions,
  ): Promise<BlockView>

  /**
   * Gets features from a BigWig file
   *
   * @param refName - The chromosome name
   * @param start - The start of a region
   * @param end - The end of a region
   * @param opts - An object containing basesPerSpan (e.g. pixels per basepair) or scale used to infer the zoomLevel to use
   */
  public async getFeatureStream(
    refName: string,
    start: number,
    end: number,
    opts: RequestOptions & { scale?: number; basesPerSpan?: number } = {
      scale: 1,
    },
  ): Promise<Observable<Feature[]>> {
    await this.getHeader(opts)
    const chrName = this.renameRefSeqs(refName)
    let view: BlockView

    if (opts.basesPerSpan) {
      view = await this.getView(1 / opts.basesPerSpan, opts)
    } else if (opts.scale) {
      view = await this.getView(opts.scale, opts)
    } else {
      view = await this.getView(1, opts)
    }

    if (!view) {
      throw new Error('unable to get block view for data')
    }
    return new Observable((observer: Observer<Feature[]>): void => {
      view.readWigData(chrName, start, end, observer, opts)
    })
  }

  public async getFeatures(
    refName: string,
    start: number,
    end: number,
    opts: RequestOptions & { scale?: number; basesPerSpan?: number } = {
      scale: 1,
    },
  ): Promise<Feature[]> {
    const ob = await this.getFeatureStream(refName, start, end, opts)

    const ret = await ob
      .pipe(reduce((acc, curr) => acc.concat(curr)))
      .toPromise()
    return ret || []
  }
}
