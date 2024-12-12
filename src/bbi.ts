import { LocalFile, RemoteFile, GenericFilehandle } from 'generic-filehandle2'
import { firstValueFrom, Observable } from 'rxjs'
import { toArray } from 'rxjs/operators'
import { BlockView } from './block-view'

const BIG_WIG_MAGIC = -2003829722
const BIG_BED_MAGIC = -2021002517

export interface ZoomLevel {
  reductionLevel: number
  reserved: number
  dataOffset: number
  indexOffset: number
}

export interface Feature {
  offset?: number
  chromId: number
  start: number
  end: number
  score?: number
  rest?: string // for bigbed line
  minScore?: number // for summary line
  maxScore?: number // for summary line
  summary?: boolean // is summary line
  uniqueId?: string // for bigbed contains uniqueId calculated from file offset
  field?: number // used in bigbed searching
}
export interface Statistics {
  scoreSum: number
  basesCovered: number
  scoreSumSquares: number
  scoreMin: number
  scoreMax: number
}

export interface RefInfo {
  name: string
  id: number
  length: number
}

export interface MainHeader {
  magic: number
  version: number
  autoSql: string
  totalSummary: Statistics
  asOffset: number
  zoomLevels: ZoomLevel[]
  fieldCount: number
  numZoomLevels: number
  unzoomedIndexOffset: number
  totalSummaryOffset: number
  unzoomedDataOffset: number
  definedFieldCount: number
  uncompressBufSize: number
  chromTreeOffset: number
  extHeaderOffset: number
  fileType: string
}
export interface Header extends MainHeader {
  refsByName: Record<string, number>
  refsByNumber: Record<number, RefInfo>
}

export interface RequestOptions {
  signal?: AbortSignal
  headers?: Record<string, string>
  [key: string]: unknown
}

export interface RequestOptions2 extends RequestOptions {
  scale?: number
  basesPerSpan?: number
}

export abstract class BBI {
  protected bbi: GenericFilehandle

  private headerP?: Promise<Header>

  protected renameRefSeqs: (a: string) => string

  public getHeader(opts?: RequestOptions) {
    if (!this.headerP) {
      this.headerP = this._getHeader(opts).catch((e: unknown) => {
        this.headerP = undefined
        throw e
      })
    }
    return this.headerP
  }

  /*
   * @param filehandle - a filehandle from generic-filehandle2
   *
   * @param path - a Local file path as a string
   *
   * @param url - a URL string
   *
   * @param renameRefSeqs - an optional method to rename the internal reference
   * sequences using a mapping function
   */
  public constructor(args: {
    filehandle?: GenericFilehandle
    path?: string
    url?: string
    renameRefSeqs?: (a: string) => string
  }) {
    const { filehandle, renameRefSeqs = s => s, path, url } = args
    this.renameRefSeqs = renameRefSeqs
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

  private async _getHeader(opts?: RequestOptions) {
    const header = await this._getMainHeader(opts)
    const chroms = await this._readChromTree(header, opts)
    return {
      ...header,
      ...chroms,
    }
  }

  private async _getMainHeader(
    opts?: RequestOptions,
    requestSize = 2000,
  ): Promise<MainHeader> {
    const b = await this.bbi.read(requestSize, 0, opts)
    const dataView = new DataView(b.buffer, b.byteOffset, b.length)

    const r1 = dataView.getInt32(0, true)
    if (r1 !== BIG_WIG_MAGIC && r1 !== BIG_BED_MAGIC) {
      throw new Error('not a BigWig/BigBed file')
    }
    let offset = 0
    const magic = dataView.getInt32(offset, true)
    offset += 4
    const version = dataView.getUint16(offset, true)
    offset += 2
    const numZoomLevels = dataView.getUint16(offset, true)
    offset += 2
    const chromTreeOffset = Number(dataView.getBigUint64(offset, true))
    offset += 8
    const unzoomedDataOffset = Number(dataView.getBigUint64(offset, true))
    offset += 8
    const unzoomedIndexOffset = Number(dataView.getBigUint64(offset, true))
    offset += 8
    const fieldCount = dataView.getUint16(offset, true)
    offset += 2
    const definedFieldCount = dataView.getUint16(offset, true)
    offset += 2
    const asOffset = Number(dataView.getBigUint64(offset, true))
    offset += 8
    const totalSummaryOffset = Number(dataView.getBigUint64(offset, true))
    offset += 8
    const uncompressBufSize = dataView.getUint32(offset, true)
    offset += 4
    const extHeaderOffset = Number(dataView.getBigUint64(offset, true))
    offset += 8
    const zoomLevels = [] as ZoomLevel[]
    for (let i = 0; i < numZoomLevels; i++) {
      const reductionLevel = dataView.getUint32(offset, true)
      offset += 4
      const reserved = dataView.getUint32(offset, true)
      offset += 4
      const dataOffset = Number(dataView.getBigUint64(offset, true))
      offset += 8
      const indexOffset = Number(dataView.getBigUint64(offset, true))
      offset += 8
      zoomLevels.push({ reductionLevel, reserved, dataOffset, indexOffset })
    }

    const fileType = magic === BIG_BED_MAGIC ? 'bigbed' : 'bigwig'

    // refetch header if it is too large on first pass,
    // 8*5 is the sizeof the totalSummary struct
    if (asOffset > requestSize || totalSummaryOffset > requestSize - 8 * 5) {
      return this._getMainHeader(opts, requestSize * 2)
    }

    let totalSummary: Statistics
    if (totalSummaryOffset) {
      const b2 = b.subarray(Number(totalSummaryOffset))
      let offset = 0
      const dataView = new DataView(b2.buffer, b2.byteOffset, b2.length)
      const basesCovered = Number(dataView.getBigUint64(offset, true))
      offset += 8
      const scoreMin = dataView.getFloat64(offset, true)
      offset += 8
      const scoreMax = dataView.getFloat64(offset, true)
      offset += 8
      const scoreSum = dataView.getFloat64(offset, true)
      offset += 8
      const scoreSumSquares = dataView.getFloat64(offset, true)
      offset += 8

      totalSummary = {
        scoreMin,
        scoreMax,
        scoreSum,
        scoreSumSquares,
        basesCovered,
      }
    } else {
      throw new Error('no stats')
    }
    const decoder = new TextDecoder('utf8')

    return {
      zoomLevels,
      magic,
      extHeaderOffset,
      numZoomLevels,
      fieldCount,
      totalSummary,
      definedFieldCount,
      uncompressBufSize,
      asOffset,
      chromTreeOffset,
      totalSummaryOffset,
      unzoomedDataOffset,
      unzoomedIndexOffset,
      fileType,
      version,
      autoSql: asOffset
        ? decoder.decode(b.subarray(asOffset, b.indexOf(0, asOffset)))
        : '',
    }
  }

  private async _readChromTree(
    header: MainHeader,
    opts?: { signal?: AbortSignal },
  ) {
    const refsByNumber: Record<number, RefInfo> = []
    const refsByName: Record<string, number> = {}

    let unzoomedDataOffset = header.unzoomedDataOffset
    const chromTreeOffset = header.chromTreeOffset
    while (unzoomedDataOffset % 4 !== 0) {
      unzoomedDataOffset += 1
    }
    const off = unzoomedDataOffset - chromTreeOffset
    const b = await this.bbi.read(off, Number(chromTreeOffset), opts)

    const dataView = new DataView(b.buffer, b.byteOffset, b.length)
    let offset = 0
    //    const magic = dataView.getUint32(offset, true)
    offset += 4
    //   const blockSize = dataView.getUint32(offset, true)
    offset += 4
    const keySize = dataView.getUint32(offset, true)
    offset += 4
    //  const valSize = dataView.getUint32(offset, true)
    offset += 4
    // const itemCount = dataView.getBigUint64(offset, true)
    offset += 8

    const rootNodeOffset = 32
    const decoder = new TextDecoder('utf8')
    const bptReadNode = async (currentOffset: number) => {
      let offset = currentOffset
      if (offset >= b.length) {
        throw new Error('reading beyond end of buffer')
      }
      const isLeafNode = dataView.getUint8(offset)
      offset += 2 //skip 1
      const cnt = dataView.getUint16(offset, true)
      offset += 2
      if (isLeafNode) {
        for (let n = 0; n < cnt; n++) {
          const key = decoder
            .decode(b.subarray(offset, offset + keySize))
            .replaceAll('\0', '')
          offset += keySize
          const refId = dataView.getUint32(offset, true)
          offset += 4
          const refSize = dataView.getUint32(offset, true)
          offset += 4

          refsByName[this.renameRefSeqs(key)] = refId
          refsByNumber[refId] = {
            name: key,
            id: refId,
            length: refSize,
          }
        }
      } else {
        // parse index node
        const nextNodes = []
        for (let n = 0; n < cnt; n++) {
          offset += keySize
          const childOffset = Number(dataView.getBigUint64(offset, true))
          offset += 8
          nextNodes.push(
            bptReadNode(Number(childOffset) - Number(chromTreeOffset)),
          )
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
  protected async getUnzoomedView(opts?: RequestOptions) {
    const { unzoomedIndexOffset, refsByName, uncompressBufSize, fileType } =
      await this.getHeader(opts)
    return new BlockView(
      this.bbi,
      refsByName,
      unzoomedIndexOffset,
      uncompressBufSize > 0,
      fileType,
    )
  }

  /*
   * abstract method - get the view for a given scale
   */
  protected abstract getView(
    scale: number,
    opts?: RequestOptions,
  ): Promise<BlockView>

  /**
   * Gets features from a BigWig file
   *
   * @param refName - The chromosome name
   *
   * @param start - The start of a region
   *
   * @param end - The end of a region
   *
   * @param opts - An object containing basesPerSpan (e.g. pixels per basepair)
   * or scale used to infer the zoomLevel to use
   */
  public async getFeatureStream(
    refName: string,
    start: number,
    end: number,
    opts?: RequestOptions2,
  ) {
    await this.getHeader(opts)
    const chrName = this.renameRefSeqs(refName)
    let view: BlockView
    const { basesPerSpan, scale } = opts || {}

    if (basesPerSpan) {
      view = await this.getView(1 / basesPerSpan, opts)
    } else if (scale) {
      view = await this.getView(scale, opts)
    } else {
      view = await this.getView(1, opts)
    }

    return new Observable<Feature[]>(observer => {
      view
        .readWigData(chrName, start, end, observer, opts)
        .catch((e: unknown) => {
          observer.error(e)
        })
    })
  }

  public async getFeatures(
    refName: string,
    start: number,
    end: number,
    opts?: RequestOptions2,
  ) {
    const ob = await this.getFeatureStream(refName, start, end, opts)

    const ret = await firstValueFrom(ob.pipe(toArray()))
    return ret.flat()
  }
}
