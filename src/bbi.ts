import { LocalFile, RemoteFile } from 'generic-filehandle2'
import { Observable, firstValueFrom } from 'rxjs'
import { toArray } from 'rxjs/operators'

import { BlockView } from './block-view.ts'

import type {
  BigWigFeatureArrays,
  BigWigHeader,
  BigWigHeaderWithRefNames,
  Feature,
  RefInfo,
  RequestOptions2,
  RequestOptions,
  Statistics,
  SummaryFeatureArrays,
  ZoomLevel,
} from './types.ts'
import type { GenericFilehandle } from 'generic-filehandle2'

const BIG_WIG_MAGIC = -2003829722
const BIG_BED_MAGIC = -2021002517

const decoder = new TextDecoder('utf8')

function getDataView(buffer: Uint8Array) {
  return new DataView(buffer.buffer, buffer.byteOffset, buffer.length)
}

export abstract class BBI {
  protected bbi: GenericFilehandle

  private headerP?: Promise<BigWigHeaderWithRefNames>

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
    const chroms = await this._readChromosomeTree(header, opts)
    return {
      ...header,
      ...chroms,
    }
  }

  private async _getMainHeader(
    opts?: RequestOptions,
    requestSize = 2000,
  ): Promise<BigWigHeader> {
    const b = await this.bbi.read(requestSize, 0, opts)
    const dataView = getDataView(b)

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
    // Offset to the B+ tree that maps chromosome names to integer IDs
    const chromosomeTreeOffset = Number(dataView.getBigUint64(offset, true))
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
      zoomLevels.push({
        reductionLevel,
        reserved,
        dataOffset,
        indexOffset,
      })
    }

    const fileType = magic === BIG_BED_MAGIC ? 'bigbed' : 'bigwig'

    // refetch header if it is too large on first pass,
    // 8*5 is the sizeof the totalSummary struct
    if (asOffset > requestSize || totalSummaryOffset > requestSize - 8 * 5) {
      return this._getMainHeader(opts, requestSize * 2)
    }

    let totalSummary: Statistics
    if (totalSummaryOffset) {
      const b2 = b.subarray(totalSummaryOffset)
      let offset = 0
      const dataView = getDataView(b2)
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
      chromosomeTreeOffset,
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

  // Reads the B+ tree that maps chromosome names to integer IDs
  // This is part of the "cirTree" (combined ID R-tree) structure, which uses
  // integer chromosome IDs instead of strings for more efficient spatial indexing
  private async _readChromosomeTree(
    header: BigWigHeader,
    opts?: { signal?: AbortSignal },
  ) {
    const refsByNumber: RefInfo[] = []
    const refsByName = {} as Record<string, number>

    const chromosomeTreeOffset = header.chromosomeTreeOffset

    const dataView = getDataView(
      await this.bbi.read(32, chromosomeTreeOffset, opts),
    )
    let offset = 0
    // const magic = dataView.getUint32(offset, true) // unused
    offset += 4
    // const blockSize = dataView.getUint32(offset, true) // unused
    offset += 4
    const keySize = dataView.getUint32(offset, true)
    offset += 4
    const valSize = dataView.getUint32(offset, true)
    offset += 4
    // const itemCount = dataView.getBigUint64(offset, true) // unused
    offset += 8

    // Recursively traverses the B+ tree to populate chromosome name-to-ID mappings
    const readBPlusTreeNode = async (currentOffset: number) => {
      const b = await this.bbi.read(4, currentOffset)
      const dataView = getDataView(b)
      let offset = 0
      const isLeafNode = dataView.getUint8(offset)
      offset += 1
      // const reserved = dataView.getUint8(offset) // unused
      offset += 1
      const count = dataView.getUint16(offset, true)
      offset += 2

      // Leaf nodes contain the actual chromosome name-to-ID mappings
      if (isLeafNode) {
        const b = await this.bbi.read(
          count * (keySize + valSize),
          currentOffset + offset,
        )
        const dataView = getDataView(b)
        offset = 0

        for (let n = 0; n < count; n++) {
          const keyEnd = b.indexOf(0, offset)
          const effectiveKeyEnd =
            keyEnd !== -1 && keyEnd < offset + keySize
              ? keyEnd
              : offset + keySize
          const key = decoder.decode(b.subarray(offset, effectiveKeyEnd))
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
        // Non-leaf nodes contain pointers to child nodes
        const nextNodes = []
        const dataView = getDataView(
          await this.bbi.read(count * (keySize + 8), currentOffset + offset),
        )
        offset = 0

        for (let n = 0; n < count; n++) {
          offset += keySize
          const childOffset = Number(dataView.getBigUint64(offset, true))
          offset += 8
          nextNodes.push(readBPlusTreeNode(childOffset))
        }
        await Promise.all(nextNodes)
      }
    }
    await readBPlusTreeNode(chromosomeTreeOffset + 32)
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
      uncompressBufSize,
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

    const arrays = await firstValueFrom(ob.pipe(toArray()))
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
    const result = new Array(totalLength)
    let index = 0
    for (const arr of arrays) {
      for (const item of arr) {
        result[index++] = item
      }
    }
    return result
  }

  /**
   * Gets features from a BigWig file as typed arrays (more efficient than getFeatures)
   *
   * @param refName - The chromosome name
   * @param start - The start of a region
   * @param end - The end of a region
   * @param opts - Options including basesPerSpan or scale
   * @returns Promise with typed arrays: starts, ends, scores (and minScores/maxScores for summary data)
   */
  public async getFeaturesAsArrays(
    refName: string,
    start: number,
    end: number,
    opts?: RequestOptions2,
  ): Promise<BigWigFeatureArrays | SummaryFeatureArrays> {
    const features = await this.getFeatures(refName, start, end, opts)
    const count = features.length

    if (count === 0) {
      return {
        starts: new Int32Array(0),
        ends: new Int32Array(0),
        scores: new Float32Array(0),
        isSummary: false as const,
      }
    }

    const hasSummary = features[0]?.summary === true

    if (hasSummary) {
      const starts = new Int32Array(count)
      const ends = new Int32Array(count)
      const scores = new Float32Array(count)
      const minScores = new Float32Array(count)
      const maxScores = new Float32Array(count)

      for (let i = 0; i < count; i++) {
        const f = features[i]!
        starts[i] = f.start
        ends[i] = f.end
        scores[i] = f.score ?? 0
        minScores[i] = f.minScore ?? 0
        maxScores[i] = f.maxScore ?? 0
      }

      return {
        starts,
        ends,
        scores,
        minScores,
        maxScores,
        isSummary: true as const,
      }
    }

    const starts = new Int32Array(count)
    const ends = new Int32Array(count)
    const scores = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const f = features[i]!
      starts[i] = f.start
      ends[i] = f.end
      scores[i] = f.score ?? 0
    }

    return { starts, ends, scores, isSummary: false as const }
  }
}
