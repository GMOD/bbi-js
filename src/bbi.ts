import { Parser } from '@gmod/binary-parser'
import { LocalFile, RemoteFile, GenericFilehandle } from 'generic-filehandle'
import { Observable, Observer } from 'rxjs'
import { reduce } from 'rxjs/operators'

import { BlockView } from './blockView'
import { abortBreakPoint, AbortError } from './util'

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
  uncompressBufSize: number
  chromTreeOffset: number
  fileSize: number
  extHeaderOffset: number
  isBigEndian: boolean
  fileType: string
  refsByName: Map<string, number>
  refsByNumber: Map<number, RefInfo>
}

interface ChromTree {
  refsByName: Map<string, number>
  refsByNumber: Map<number, RefInfo>
}

type AbortableCallback = (signal: AbortSignal) => Promise<any>

/* A class that provides memoization for abortable calls */
class AbortAwareCache {
  private cache: Map<AbortableCallback, any> = new Map()

  /*
   * Takes a function that has one argument, abortSignal, that returns a promise
   * and it works by retrying the function if a previous attempt to initialize the parse cache was aborted
   * @param fn - an AbortableCallback
   * @return a memoized version of the AbortableCallback using the AbortAwareCache
   */
  public abortableMemoize(fn: (signal?: AbortSignal) => Promise<any>): (signal?: AbortSignal) => Promise<any> {
    const { cache } = this
    return function abortableMemoizeFn(signal?: AbortSignal): Promise<any> {
      if (!cache.has(fn)) {
        const fnReturn = fn(signal)
        cache.set(fn, fnReturn)
        if (signal) {
          fnReturn.catch(
            (): void => {
              if (signal.aborted) cache.delete(fn)
            },
          )
        }
        return cache.get(fn)
      }
      return cache.get(fn).catch(
        (e: AbortError | DOMException): Promise<any> => {
          if (e.code === 'ERR_ABORTED' || e.name === 'AbortError') {
            return fn(signal)
          }
          throw e
        },
      )
    }
  }
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

export abstract class BBI {
  protected bbi: GenericFilehandle

  protected headerCache: AbortAwareCache

  protected renameRefSeqs: (a: string) => string

  /* fetch and parse header information from a bigwig or bigbed file
   * @param abortSignal - abort the operation, can be null
   * @return a Header object
   */
  public getHeader: (abortSignal?: AbortSignal) => Promise<Header>

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
    this.headerCache = new AbortAwareCache()
    if (filehandle) {
      this.bbi = filehandle
    } else if (url) {
      this.bbi = new RemoteFile(url)
    } else if (path) {
      this.bbi = new LocalFile(path)
    } else {
      throw new Error('no file given')
    }
    this.getHeader = this.headerCache.abortableMemoize(this._getHeader.bind(this))
  }

  private async _getHeader(abortSignal?: AbortSignal): Promise<Header> {
    const isBigEndian = await this._isBigEndian(abortSignal)
    const header = await this._getMainHeader(abortSignal)
    const chroms = await this._readChromTree(abortSignal)
    return { ...header, ...chroms, isBigEndian }
  }

  private async _getMainHeader(abortSignal?: AbortSignal): Promise<Header> {
    const ret = getParsers(await this._isBigEndian())
    const buf = Buffer.alloc(2000)
    await this.bbi.read(buf, 0, 2000, 0, { signal: abortSignal })
    const header = ret.headerParser.parse(buf).result
    header.fileType = header.magic === BIG_BED_MAGIC ? 'bigbed' : 'bigwig'

    if (header.asOffset) {
      header.autoSql = buf.slice(header.asOffset, buf.indexOf(0, header.asOffset)).toString('utf8')
    }
    if (header.totalSummaryOffset) {
      const tail = buf.slice(header.totalSummaryOffset)
      header.totalSummary = ret.totalSummaryParser.parse(tail).result
    }
    return header
  }

  private async _isBigEndian(abortSignal?: AbortSignal): Promise<boolean> {
    const buf = Buffer.allocUnsafe(4)
    await this.bbi.read(buf, 0, 4, 0, { signal: abortSignal })
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

  // todo: add progress if long running
  private async _readChromTree(abortSignal?: AbortSignal): Promise<ChromTree> {
    const header = await this._getMainHeader(abortSignal)
    const isBE = await this._isBigEndian(abortSignal)
    const le = isBE ? 'big' : 'little'
    const refsByNumber: any = {}
    const refsByName: any = {}
    const { chromTreeOffset } = header
    let { unzoomedDataOffset } = header

    while (unzoomedDataOffset % 4 !== 0) {
      unzoomedDataOffset += 1
    }

    const data = Buffer.alloc(unzoomedDataOffset - chromTreeOffset)
    await this.bbi.read(data, 0, unzoomedDataOffset - chromTreeOffset, chromTreeOffset, { signal: abortSignal })

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
      if (offset >= data.length) throw new Error('reading beyond end of buffer')
      const ret = p.isLeafNode.parse(data.slice(offset))
      const { isLeafNode, cnt } = ret.result
      offset += ret.offset
      for (let n = 0; n < cnt; n += 1) {
        // eslint-disable-next-line no-await-in-loop
        await abortBreakPoint(abortSignal)
        if (isLeafNode) {
          const leafRet = leafNodeParser.parse(data.slice(offset))
          offset += leafRet.offset
          const { key, refId, refSize } = leafRet.result
          const refRec = { name: key, id: refId, length: refSize }
          refsByName[this.renameRefSeqs(key)] = refId
          refsByNumber[refId] = refRec
        } else {
          // parse index node
          const nonleafRet = nonleafNodeParser.parse(data.slice(offset))
          let { childOffset } = nonleafRet.result
          offset += nonleafRet.offset
          childOffset -= chromTreeOffset
          bptReadNode(childOffset)
        }
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
  protected async getUnzoomedView(abortSignal?: AbortSignal): Promise<BlockView> {
    const {
      unzoomedIndexOffset,
      zoomLevels,
      refsByName,
      uncompressBufSize,
      isBigEndian,
      fileType,
    } = await this.getHeader(abortSignal)
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
  protected abstract async getView(scale: number, abortSignal?: AbortSignal): Promise<BlockView>

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
    opts: { basesPerSpan?: number; scale?: number; signal?: AbortSignal } = { scale: 1 },
  ): Promise<Observable<Feature[]>> {
    await this.getHeader(opts.signal)
    const chrName = this.renameRefSeqs(refName)
    let view: BlockView

    if (opts.basesPerSpan) {
      view = await this.getView(1 / opts.basesPerSpan, opts.signal)
    } else if (opts.scale) {
      view = await this.getView(opts.scale, opts.signal)
    } else {
      view = await this.getView(1, opts.signal)
    }

    if (!view) {
      throw new Error('unable to get block view for data')
    }
    return new Observable(
      (observer: Observer<Feature[]>): void => {
        view.readWigData(chrName, start, end, observer, opts)
      },
    )
  }

  public async getFeatures(
    refName: string,
    start: number,
    end: number,
    opts: { basesPerSpan?: number; scale?: number; signal?: AbortSignal } = { scale: 1 },
  ): Promise<Feature[]> {
    const ob = await this.getFeatureStream(refName, start, end, opts)
    const ret = await ob.pipe(reduce((acc: Feature[], curr: Feature[]): Feature[] => acc.concat(curr))).toPromise()
    return ret || []
  }
}
