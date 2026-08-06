import AbortablePromiseCache from '@gmod/abortable-promise-cache'
import QuickLRU from '@jbrowse/quick-lru'
import { LocalFile, RemoteFile } from 'generic-filehandle2'

import { BlockView } from './block-view.ts'
import { decoder, getDataView, getUint64, parseKey } from './util.ts'

import type {
  BigWigFeatureArrays,
  BigWigFeatureArraysMulti,
  BigWigHeader,
  BigWigHeaderWithRefNames,
  BlockType,
  Feature,
  RefInfo,
  RequestOptions2,
  RequestOptions,
  Statistics,
  SummaryFeatureArrays,
  SummaryFeatureArraysMulti,
  ZoomLevel,
} from './types.ts'
import type { GenericFilehandle } from 'generic-filehandle2'

const BIG_WIG_MAGIC = -2003829722
const BIG_BED_MAGIC = -2021002517

export abstract class BBI {
  protected bbi: GenericFilehandle

  // Memoizing a bare promise built from the FIRST caller's signal makes that
  // caller's abort reject every other caller awaiting the same promise - in
  // JBrowse, panning away from one block would fail its still-wanted siblings.
  // This cache aggregates consumers' signals instead (AggregateAbortController),
  // so the read is only aborted once every consumer has aborted, and it evicts
  // on rejection so a failed fetch is retried rather than cached.
  private headerCache = new AbortablePromiseCache<
    undefined,
    BigWigHeaderWithRefNames
  >({
    cache: new QuickLRU({ maxSize: 1 }),
    fill: (_data, signal) => this._getHeader({ signal }),
  })

  /**
   * Returns file header metadata including chromosome list, zoom levels, autoSql
   * definition, and summary statistics.
   *
   * @param opts - optional `RequestOptions` (e.g. `opts.signal` for abort)
   * @returns `Promise<BigWigHeaderWithRefNames>`
   */
  public getHeader(opts?: RequestOptions) {
    return this.headerCache.get('header', undefined, opts?.signal)
  }

  /**
   * @param args.filehandle - a filehandle from generic-filehandle2
   * @param args.path - path to a local file
   * @param args.url - URL of a remote file
   */
  public constructor(args: {
    filehandle?: GenericFilehandle
    path?: string
    url?: string
  }) {
    const { filehandle, path, url } = args
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

    let offset = 0
    const magic = dataView.getInt32(offset, true)
    offset += 4
    if (magic !== BIG_WIG_MAGIC && magic !== BIG_BED_MAGIC) {
      throw new Error('not a BigWig/BigBed file')
    }
    const version = dataView.getUint16(offset, true)
    offset += 2
    const numZoomLevels = dataView.getUint16(offset, true)
    offset += 2
    // Offset to the B+ tree that maps chromosome names to integer IDs
    const chromosomeTreeOffset = getUint64(dataView, offset)
    offset += 8
    const unzoomedDataOffset = getUint64(dataView, offset)
    offset += 8
    const unzoomedIndexOffset = getUint64(dataView, offset)
    offset += 8
    const fieldCount = dataView.getUint16(offset, true)
    offset += 2
    const definedFieldCount = dataView.getUint16(offset, true)
    offset += 2
    const asOffset = getUint64(dataView, offset)
    offset += 8
    const totalSummaryOffset = getUint64(dataView, offset)
    offset += 8
    const uncompressBufSize = dataView.getUint32(offset, true)
    offset += 4
    const extHeaderOffset = getUint64(dataView, offset)
    offset += 8
    const zoomLevels = [] as ZoomLevel[]
    for (let i = 0; i < numZoomLevels; i++) {
      const reductionLevel = dataView.getUint32(offset, true)
      offset += 4
      offset += 4 // reserved
      const dataOffset = getUint64(dataView, offset)
      offset += 8
      const indexOffset = getUint64(dataView, offset)
      offset += 8
      zoomLevels.push({
        reductionLevel,
        dataOffset,
        indexOffset,
      })
    }

    const fileType = magic === BIG_BED_MAGIC ? 'bigbed' : 'bigwig'

    // A short read means we hit EOF, so a larger request can't return more
    // bytes - stop growing to avoid looping on a truncated/corrupt file.
    const reachedEof = b.length < requestSize

    // autoSql is a null-terminated string at asOffset; if the terminator isn't
    // in the buffer yet the string is truncated and we need a larger fetch
    const autoSqlTruncated = asOffset !== 0 && !b.includes(0, asOffset)

    // refetch header if it is too large on first pass,
    // 8*5 is the sizeof the totalSummary struct
    if (
      !reachedEof &&
      (asOffset > requestSize ||
        totalSummaryOffset > requestSize - 8 * 5 ||
        autoSqlTruncated)
    ) {
      return this._getMainHeader(opts, requestSize * 2)
    }

    let totalSummary: Statistics
    if (totalSummaryOffset) {
      // Only reachable on a truncated/corrupt file: the refetch above already
      // grew the request past totalSummaryOffset + 40 unless we hit EOF first,
      // in which case b.length is the whole file. Without this the DataView
      // below throws a bare "Start offset N is outside the bounds of the
      // buffer".
      if (totalSummaryOffset + 8 * 5 > b.length) {
        throw new Error(
          `totalSummary at offset ${totalSummaryOffset} extends past the end of the file (${b.length} bytes), file may be truncated or corrupt`,
        )
      }
      const summaryView = getDataView(b, totalSummaryOffset)
      totalSummary = {
        basesCovered: getUint64(summaryView, 0),
        scoreMin: summaryView.getFloat64(8, true),
        scoreMax: summaryView.getFloat64(16, true),
        scoreSum: summaryView.getFloat64(24, true),
        scoreSumSquares: summaryView.getFloat64(32, true),
      }
    } else {
      throw new Error('no stats')
    }

    let autoSql = ''
    if (asOffset) {
      const nullPos = b.indexOf(0, asOffset)
      const end = nullPos === -1 ? b.length : nullPos
      autoSql = decoder.decode(b.subarray(asOffset, end))
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
      autoSql,
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

    const treeHeader = getDataView(
      await this.bbi.read(32, chromosomeTreeOffset, opts),
    )
    const blockSize = treeHeader.getUint32(4, true)
    const keySize = treeHeader.getUint32(8, true)
    const valSize = treeHeader.getUint32(12, true)
    // Every node holds at most blockSize items, and an internal item (key +
    // 8-byte child offset) is never wider than a leaf item, so this bounds any
    // node. Reading it in one request avoids a second round trip per node just to
    // learn the item count - which doubled the request count on remote files.
    const maxNodeSize = 4 + blockSize * (keySize + Math.max(valSize, 8))

    // Recursively traverses the B+ tree to populate chromosome name-to-ID mappings
    const readBPlusTreeNode = async (currentOffset: number) => {
      const b = await this.bbi.read(maxNodeSize, currentOffset, opts)
      const dataView = getDataView(b)
      const isLeafNode = dataView.getUint8(0)
      const count = dataView.getUint16(2, true)
      let offset = 4

      // Leaf nodes contain the actual chromosome name-to-ID mappings
      if (isLeafNode) {
        for (let n = 0; n < count; n++) {
          const key = parseKey(b, offset, keySize)
          offset += keySize
          const refId = dataView.getUint32(offset, true)
          offset += 4
          const refSize = dataView.getUint32(offset, true)
          offset += 4
          refsByName[key] = refId
          refsByNumber[refId] = { name: key, id: refId, length: refSize }
        }
      } else {
        // Non-leaf nodes contain pointers to child nodes
        const nextNodes = []
        for (let n = 0; n < count; n++) {
          offset += keySize
          const childOffset = getUint64(dataView, offset)
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

  private viewCache = new Map<string, BlockView>()

  protected getOrCreateBlockView(
    refsByName: Record<string, number>,
    rTreeOffset: number,
    uncompressBufSize: number,
    blockType: BlockType,
  ) {
    const key = `${rTreeOffset}_${blockType}`
    let view = this.viewCache.get(key)
    if (!view) {
      view = new BlockView(
        this.bbi,
        refsByName,
        rTreeOffset,
        uncompressBufSize,
        blockType,
      )
      this.viewCache.set(key, view)
    }
    return view
  }

  /*
   * fetches the "unzoomed" view of the bigwig data. this is the default for bigbed
   * @param abortSignal - a signal to optionally abort this operation
   */
  protected async getUnzoomedView(opts?: RequestOptions) {
    const { unzoomedIndexOffset, refsByName, uncompressBufSize, fileType } =
      await this.getHeader(opts)
    return this.getOrCreateBlockView(
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

  private async _getView(opts?: RequestOptions2) {
    const { basesPerSpan, scale } = opts ?? {}
    const viewScale = basesPerSpan ? 1 / basesPerSpan : (scale ?? 1)
    return this.getView(viewScale, opts)
  }

  /**
   * Fetches features for a single region.
   *
   * @param refName - chromosome name as it appears in the file
   * @param start - 0-based half-open start coordinate
   * @param end - 0-based half-open end coordinate
   * @param opts - optional scale/basesPerSpan for zoom level selection and AbortSignal
   * @returns `Promise<Feature[]>` — empty array if refName not found or no features overlap the range
   */
  public async getFeatures(
    refName: string,
    start: number,
    end: number,
    opts?: RequestOptions2,
  ) {
    const view = await this._getView(opts)
    return view.readWigData(refName, start, end, opts)
  }

  /**
   * Cheap compressed-download-size estimate for a region: the sum of the
   * on-disk block lengths the index reports overlapping it, read from the R-tree
   * index alone without downloading or decompressing any feature/data block. An
   * upper bound on the bytes a `getFeatures` call over the same region and zoom
   * (`opts`) would transfer — for gating over-large downloads before they start.
   *
   * @param refName - chromosome name as it appears in the file
   * @param start - 0-based half-open start coordinate
   * @param end - 0-based half-open end coordinate
   * @param opts - same scale/basesPerSpan/AbortSignal options as `getFeatures`,
   *   so the estimate matches the zoom level the fetch would use
   * @returns `Promise<number>` — compressed bytes; 0 if refName not found
   */
  public async getRegionByteSize(
    refName: string,
    start: number,
    end: number,
    opts?: RequestOptions2,
  ): Promise<number> {
    const view = await this._getView(opts)
    return view.getBlockSizeForRange(refName, start, end, opts)
  }

  /**
   * Multi-region counterpart of `getRegionByteSize`. All regions share one zoom
   * level and blocks shared across overlapping regions are counted once (as
   * `getFeaturesMulti` fetches them once).
   *
   * @param regions - array of `{ refName, start, end }` query regions
   * @param opts - same options as `getRegionByteSize`
   * @returns `Promise<number>` — total compressed bytes across the regions
   */
  public async getRegionByteSizeMulti(
    regions: { refName: string; start: number; end: number }[],
    opts?: RequestOptions2,
  ): Promise<number> {
    const view = await this._getView(opts)
    return view.getBlockSizeForRangeMulti(regions, opts)
  }

  /**
   * Fetches features for many regions in a single pass. All regions share one
   * zoom level, and adjacent on-disk blocks are coalesced across region
   * boundaries, reducing range requests for whole-genome overviews.
   *
   * @param regions - array of `{ refName, start, end }` query regions
   * @param opts - same options as `getFeatures`
   * @returns `Promise<Feature[][]>` — one `Feature[]` per input region in the
   *   same order (`result[i]` corresponds to `regions[i]`)
   */
  public async getFeaturesMulti(
    regions: { refName: string; start: number; end: number }[],
    opts?: RequestOptions2,
  ): Promise<Feature[][]> {
    const view = await this._getView(opts)
    return view.readWigDataMulti(regions, opts)
  }

  /**
   * Same query as `getFeatures` but returns typed arrays instead of an array
   * of objects, reducing GC pressure for large datasets.
   *
   * @param refName - chromosome name as it appears in the file
   * @param start - 0-based half-open start coordinate
   * @param end - 0-based half-open end coordinate
   * @param opts - optional scale/basesPerSpan for zoom level selection and AbortSignal
   * @returns `Promise<BigWigFeatureArrays | SummaryFeatureArrays>` — use the
   *   `isSummary` discriminant to distinguish the two shapes
   */
  public async getFeaturesAsArrays(
    refName: string,
    start: number,
    end: number,
    opts?: RequestOptions2,
  ): Promise<BigWigFeatureArrays | SummaryFeatureArrays> {
    const view = await this._getView(opts)
    return view.readWigDataAsArrays(refName, start, end, opts)
  }

  /**
   * Multi-region counterpart of `getFeaturesAsArrays`. All regions share one
   * zoom level and adjacent on-disk blocks coalesce across region boundaries
   * (like `getFeaturesMulti`), but results pack into one backing set of typed
   * arrays instead of one object per region, minimizing allocations.
   *
   * @param regions - array of `{ refName, start, end }` query regions
   * @param opts - same options as `getFeatures`
   * @returns `Promise<BigWigFeatureArraysMulti | SummaryFeatureArraysMulti>` —
   *   use the `isSummary` discriminant to distinguish the two shapes; slice
   *   region `i` with `regionOffsets[i]..regionOffsets[i + 1]`
   */
  public async getFeaturesAsArraysMulti(
    regions: { refName: string; start: number; end: number }[],
    opts?: RequestOptions2,
  ): Promise<BigWigFeatureArraysMulti | SummaryFeatureArraysMulti> {
    const view = await this._getView(opts)
    return view.readWigDataAsArraysMulti(regions, opts)
  }
}
