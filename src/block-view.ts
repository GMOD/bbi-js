import AbortablePromiseCache from '@gmod/abortable-promise-cache'
import QuickLRU from '@jbrowse/quick-lru'

import { mergeRanges } from './range.ts'
import {
  decompressAndParseBigWigBlocks,
  decompressAndParseSummaryBlocks,
  unzipBatch,
} from './unzip.ts'
import { decoder, getDataView, groupBlocks } from './util.ts'

import type { Feature, ProgressCallback } from './types.ts'
import type {
  BigWigFeatureArrays,
  BigWigFeatureArraysMulti,
  SummaryFeatureArrays,
  SummaryFeatureArraysMulti,
} from './unzip.ts'
import type { Block } from './util.ts'
import type { GenericFilehandle } from 'generic-filehandle2'

const CIR_TREE_MAGIC = 0x2468ace0

interface CoordRequest {
  chrId: number
  start: number
  end: number
}

// One block can serve several query regions (overlapping ranges surface the
// same on-disk block). Each tag records which region wants the block and the
// coord filter to apply when parsing it for that region.
interface RegionTag {
  regionIndex: number
  request: CoordRequest
}

interface CollectedBlocksMulti {
  blockByOffset: Map<number, Block>
  tagsByOffset: Map<number, RegionTag[]>
}

interface Options {
  signal?: AbortSignal
  request?: CoordRequest
  onProgress?: ProgressCallback
}

// Track block-download progress for a fetch loop. Total bytes are known up front
// (block byte sizes come from the R-tree index), so this reports a determinate
// fraction: call the returned fn with each fetched group's byte length.
function blockProgress(
  groups: { length: number }[],
  onProgress: ProgressCallback | undefined,
) {
  let total = 0
  for (const group of groups) {
    total += group.length
  }
  let downloaded = 0
  onProgress?.(0, total)
  return (length: number) => {
    downloaded += length
    onProgress?.(downloaded, total)
  }
}

// half-open [start,end) intersection: feature [s1,e1) overlaps query [s2,e2)
// iff s1 < e2 && e1 > s2. Must match the wasm parse path (crate/src/lib.rs).
function coordFilter(s1: number, e1: number, s2: number, e2: number): boolean {
  return s1 < e2 && e1 > s2
}

// Mean score over the valid bases of a summary interval. When validCnt is 0
// there are no valid bases and sumData is likewise 0, so returning sumData
// matches the wasm summary parser (crate/src/lib.rs) and keeps the JS and wasm
// parse paths bit-identical. Shared by both JS summary parsers below so they
// can't drift from each other either.
function summaryScore(sumData: number, validCnt: number): number {
  return validCnt ? sumData / validCnt : sumData
}

function parseSummaryBlock(b: Uint8Array, request?: CoordRequest) {
  const features: Feature[] = []
  let offset = 0
  const dataView = getDataView(b)
  while (offset < b.byteLength) {
    const chromId = dataView.getUint32(offset, true)
    offset += 4
    const start = dataView.getUint32(offset, true)
    offset += 4
    const end = dataView.getUint32(offset, true)
    offset += 4
    const validCnt = dataView.getUint32(offset, true)
    offset += 4
    const minScore = dataView.getFloat32(offset, true)
    offset += 4
    const maxScore = dataView.getFloat32(offset, true)
    offset += 4
    const sumData = dataView.getFloat32(offset, true)
    offset += 8

    if (
      !request ||
      (chromId === request.chrId &&
        coordFilter(start, end, request.start, request.end))
    ) {
      features.push({
        start,
        end,
        maxScore,
        minScore,
        summary: true,
        score: summaryScore(sumData, validCnt),
      })
    }
  }
  return features
}

function parseBigBedBlock(
  data: Uint8Array,
  blockOffset: number,
  request?: CoordRequest,
) {
  const items: Feature[] = []
  let currOffset = 0
  const dataView = getDataView(data)
  while (currOffset < data.byteLength) {
    const recordStart = currOffset
    const chromId = dataView.getUint32(currOffset, true)
    currOffset += 4
    const start = dataView.getInt32(currOffset, true)
    currOffset += 4
    const end = dataView.getInt32(currOffset, true)
    currOffset += 4
    const nullPos = data.indexOf(0, currOffset)
    const restEnd = nullPos === -1 ? data.length : nullPos
    const rest = decoder.decode(data.subarray(currOffset, restEnd))
    currOffset = restEnd + 1
    if (
      !request ||
      (chromId === request.chrId &&
        coordFilter(start, end, request.start, request.end))
    ) {
      items.push({
        start,
        end,
        rest,
        // blockOffset is the block's byte offset in the file (unique per block)
        // and recordStart is the record's offset within the block, so the pair
        // is globally unique across the file
        uniqueId: `bb-${blockOffset}-${recordStart}`,
      })
    }
  }
  return items
}

function parseBigWigBlock(buffer: Uint8Array, req?: CoordRequest) {
  const dataView = getDataView(buffer)
  const blockStart = dataView.getInt32(4, true)
  const itemStep = dataView.getUint32(12, true)
  const itemSpan = dataView.getUint32(16, true)
  const blockType = dataView.getUint8(20)
  const itemCount = dataView.getUint16(22, true)
  let offset = 24
  const items: Feature[] = []
  switch (blockType) {
    case 1: {
      for (let i = 0; i < itemCount; i++) {
        const start = dataView.getInt32(offset, true)
        offset += 4
        const end = dataView.getInt32(offset, true)
        offset += 4
        const score = dataView.getFloat32(offset, true)
        offset += 4
        if (!req || coordFilter(start, end, req.start, req.end)) {
          items.push({ start, end, score })
        }
      }
      break
    }
    case 2: {
      for (let i = 0; i < itemCount; i++) {
        const start = dataView.getInt32(offset, true)
        offset += 4
        const score = dataView.getFloat32(offset, true)
        offset += 4
        const end = start + itemSpan
        if (!req || coordFilter(start, end, req.start, req.end)) {
          items.push({ score, start, end })
        }
      }
      break
    }
    case 3: {
      for (let i = 0; i < itemCount; i++) {
        const score = dataView.getFloat32(offset, true)
        offset += 4
        const start = blockStart + i * itemStep
        const end = start + itemSpan
        if (!req || coordFilter(start, end, req.start, req.end)) {
          items.push({ score, start, end })
        }
      }
      break
    }
  }
  return items
}

function parseBigWigBlockAsArrays(
  buffer: Uint8Array,
  req: CoordRequest,
): { starts: Int32Array; ends: Int32Array; scores: Float32Array } {
  const dataView = getDataView(buffer)
  const blockStart = dataView.getInt32(4, true)
  const itemStep = dataView.getUint32(12, true)
  const itemSpan = dataView.getUint32(16, true)
  const blockType = dataView.getUint8(20)
  const itemCount = dataView.getUint16(22, true)

  const starts = new Int32Array(itemCount)
  const ends = new Int32Array(itemCount)
  const scores = new Float32Array(itemCount)

  const reqStart = req.start
  const reqEnd = req.end
  let idx = 0

  switch (blockType) {
    case 1: {
      let offset = 24
      for (let i = 0; i < itemCount; i++) {
        const start = dataView.getInt32(offset, true)
        const end = dataView.getInt32(offset + 4, true)
        if (start < reqEnd && end > reqStart) {
          starts[idx] = start
          ends[idx] = end
          scores[idx] = dataView.getFloat32(offset + 8, true)
          idx++
        }
        offset += 12
      }
      break
    }
    case 2: {
      let offset = 24
      for (let i = 0; i < itemCount; i++) {
        const start = dataView.getInt32(offset, true)
        const end = start + itemSpan
        if (start < reqEnd && end > reqStart) {
          starts[idx] = start
          ends[idx] = end
          scores[idx] = dataView.getFloat32(offset + 4, true)
          idx++
        }
        offset += 8
      }
      break
    }
    case 3: {
      let offset = 24
      for (let i = 0; i < itemCount; i++) {
        const start = blockStart + i * itemStep
        const end = start + itemSpan
        if (start < reqEnd && end > reqStart) {
          starts[idx] = start
          ends[idx] = end
          scores[idx] = dataView.getFloat32(offset, true)
          idx++
        }
        offset += 4
      }
      break
    }
  }

  if (idx < itemCount) {
    return {
      starts: starts.subarray(0, idx),
      ends: ends.subarray(0, idx),
      scores: scores.subarray(0, idx),
    }
  }
  return { starts, ends, scores }
}

function parseSummaryBlockAsArrays(
  b: Uint8Array,
  request: CoordRequest,
): {
  starts: Int32Array
  ends: Int32Array
  scores: Float32Array
  minScores: Float32Array
  maxScores: Float32Array
} {
  const dataView = getDataView(b)
  const maxItems = Math.floor(b.byteLength / 32)
  const starts = new Int32Array(maxItems)
  const ends = new Int32Array(maxItems)
  const scores = new Float32Array(maxItems)
  const minScores = new Float32Array(maxItems)
  const maxScores = new Float32Array(maxItems)
  let idx = 0
  let offset = 0
  while (offset < b.byteLength) {
    const chromId = dataView.getUint32(offset, true)
    offset += 4
    const start = dataView.getUint32(offset, true)
    offset += 4
    const end = dataView.getUint32(offset, true)
    offset += 4
    const validCnt = dataView.getUint32(offset, true)
    offset += 4
    const minScore = dataView.getFloat32(offset, true)
    offset += 4
    const maxScore = dataView.getFloat32(offset, true)
    offset += 4
    const sumData = dataView.getFloat32(offset, true)
    offset += 8
    if (
      chromId === request.chrId &&
      coordFilter(start, end, request.start, request.end)
    ) {
      starts[idx] = start
      ends[idx] = end
      scores[idx] = summaryScore(sumData, validCnt)
      minScores[idx] = minScore
      maxScores[idx] = maxScore
      idx++
    }
  }
  if (idx < maxItems) {
    return {
      starts: starts.subarray(0, idx),
      ends: ends.subarray(0, idx),
      scores: scores.subarray(0, idx),
      minScores: minScores.subarray(0, idx),
      maxScores: maxScores.subarray(0, idx),
    }
  }
  return { starts, ends, scores, minScores, maxScores }
}

// Concatenate parsed per-block-group chunks into a single typed array. Returns
// the lone chunk directly when possible to avoid an extra copy.
function concatTypedArray<T extends Int32Array | Float32Array>(
  chunks: T[],
  totalCount: number,
  Ctor: new (length: number) => T,
): T {
  if (chunks.length === 1) {
    return chunks[0]!
  }
  const out = new Ctor(totalCount)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

interface BigWigChunk {
  starts: Int32Array
  ends: Int32Array
  scores: Float32Array
}
type SummaryChunk = BigWigChunk & {
  minScores: Float32Array
  maxScores: Float32Array
}

function concatBigWigChunks(chunks: BigWigChunk[]): BigWigFeatureArrays {
  const totalCount = chunks.reduce((n, chunk) => n + chunk.starts.length, 0)
  return {
    starts: concatTypedArray(
      chunks.map(c => c.starts),
      totalCount,
      Int32Array,
    ),
    ends: concatTypedArray(
      chunks.map(c => c.ends),
      totalCount,
      Int32Array,
    ),
    scores: concatTypedArray(
      chunks.map(c => c.scores),
      totalCount,
      Float32Array,
    ),
    isSummary: false as const,
  }
}

function concatSummaryChunks(chunks: SummaryChunk[]): SummaryFeatureArrays {
  const totalCount = chunks.reduce((n, chunk) => n + chunk.starts.length, 0)
  return {
    starts: concatTypedArray(
      chunks.map(c => c.starts),
      totalCount,
      Int32Array,
    ),
    ends: concatTypedArray(
      chunks.map(c => c.ends),
      totalCount,
      Int32Array,
    ),
    scores: concatTypedArray(
      chunks.map(c => c.scores),
      totalCount,
      Float32Array,
    ),
    minScores: concatTypedArray(
      chunks.map(c => c.minScores),
      totalCount,
      Float32Array,
    ),
    maxScores: concatTypedArray(
      chunks.map(c => c.maxScores),
      totalCount,
      Float32Array,
    ),
    isSummary: true as const,
  }
}

// Pack the start/end/score arrays shared by every region into one backing
// buffer each, recording each region's slice boundary in regionOffsets. A
// single allocation per array instead of one object-with-arrays per region.
// Regions are laid out in input order; regionOffsets has length regionCount + 1.
function packRegions(chunksByRegion: BigWigChunk[][]) {
  let totalCount = 0
  for (const chunks of chunksByRegion) {
    for (const chunk of chunks) {
      totalCount += chunk.starts.length
    }
  }
  const starts = new Int32Array(totalCount)
  const ends = new Int32Array(totalCount)
  const scores = new Float32Array(totalCount)
  const regionOffsets = [0]
  let offset = 0
  for (const chunks of chunksByRegion) {
    for (const chunk of chunks) {
      starts.set(chunk.starts, offset)
      ends.set(chunk.ends, offset)
      scores.set(chunk.scores, offset)
      offset += chunk.starts.length
    }
    regionOffsets.push(offset)
  }
  return { starts, ends, scores, regionOffsets, totalCount }
}

function concatBigWigChunksMulti(
  chunksByRegion: BigWigChunk[][],
): BigWigFeatureArraysMulti {
  const { starts, ends, scores, regionOffsets } = packRegions(chunksByRegion)
  return { starts, ends, scores, regionOffsets, isSummary: false }
}

function concatSummaryChunksMulti(
  chunksByRegion: SummaryChunk[][],
): SummaryFeatureArraysMulti {
  const { starts, ends, scores, regionOffsets, totalCount } =
    packRegions(chunksByRegion)
  const minScores = new Float32Array(totalCount)
  const maxScores = new Float32Array(totalCount)
  let offset = 0
  for (const chunks of chunksByRegion) {
    for (const chunk of chunks) {
      minScores.set(chunk.minScores, offset)
      maxScores.set(chunk.maxScores, offset)
      offset += chunk.starts.length
    }
  }
  return {
    starts,
    ends,
    scores,
    minScores,
    maxScores,
    regionOffsets,
    isSummary: true,
  }
}

function emptyBigWigArrays(): BigWigFeatureArrays {
  return {
    starts: new Int32Array(0),
    ends: new Int32Array(0),
    scores: new Float32Array(0),
    isSummary: false,
  }
}

function emptySummaryArrays(): SummaryFeatureArrays {
  return {
    starts: new Int32Array(0),
    ends: new Int32Array(0),
    scores: new Float32Array(0),
    minScores: new Float32Array(0),
    maxScores: new Float32Array(0),
    isSummary: true,
  }
}

function parseBlock(
  blockType: string,
  data: Uint8Array,
  blockOffset: number,
  request?: CoordRequest,
): Feature[] {
  switch (blockType) {
    case 'summary':
      return parseSummaryBlock(data, request)
    case 'bigwig':
      return parseBigWigBlock(data, request)
    case 'bigbed':
      return parseBigBedBlock(data, blockOffset, request)
    default:
      console.warn(`Don't know what to do with ${blockType}`)
      return []
  }
}

/**
 * View into a subset of the data in a BigWig file.
 *
 * Adapted by Robert Buels and Colin Diesh from bigwig.js in the Dalliance
 * Genome Explorer by Thomas Down.
 */

export class BlockView {
  // R-tree index header cache - R-trees are spatial data structures used to
  // efficiently query genomic intervals by chromosome and position
  private rTreePromise?: Promise<Uint8Array>

  private rTreeNodeCache = new AbortablePromiseCache<Block, Uint8Array>({
    cache: new QuickLRU({ maxSize: 1000 }),

    fill: async ({ length, offset }, signal) =>
      this.bbi.read(length, offset, { signal }),
  })

  private bbi: GenericFilehandle
  private refsByName: Record<string, number>
  // Offset to the R-tree index in the file - this is part of the "cirTree"
  // (combined ID R-tree), which combines a B+ tree for chromosome names
  // with an R-tree for efficient spatial queries
  private rTreeOffset: number
  private uncompressBufSize: number
  private blockType: string

  public constructor(
    bbi: GenericFilehandle,
    refsByName: Record<string, number>,
    rTreeOffset: number,
    uncompressBufSize: number,
    blockType: string,
  ) {
    if (!(rTreeOffset >= 0)) {
      throw new Error('invalid rTreeOffset!')
    }
    this.bbi = bbi
    this.refsByName = refsByName
    this.rTreeOffset = rTreeOffset
    this.uncompressBufSize = uncompressBufSize
    this.blockType = blockType
  }

  private async _collectBlocks(
    chrName: string,
    start: number,
    end: number,
    opts?: Options,
  ): Promise<{ blocks: Block[]; chrId: number } | undefined> {
    const chrId = this.refsByName[chrName]
    if (chrId === undefined) {
      return undefined
    }
    if (!this.rTreePromise) {
      // pass only signal, not onProgress: bbi reports determinate
      // block-download progress itself via blockProgress, so the filehandle must
      // not also fire onProgress for this small R-tree header read (matches the
      // other block reads here, which likewise pass only signal)
      this.rTreePromise = this.bbi
        .read(48, this.rTreeOffset, { signal: opts?.signal })
        .catch((e: unknown) => {
          this.rTreePromise = undefined
          throw e
        })
    }
    const buffer = await this.rTreePromise
    const dataView = getDataView(buffer)
    const magic = dataView.getUint32(0, true)
    if (magic !== CIR_TREE_MAGIC) {
      throw new Error(
        `invalid cirTree magic: 0x${magic.toString(16)} (expected 0x${CIR_TREE_MAGIC.toString(16)}) at offset ${this.rTreeOffset}, file may be corrupt or unsupported`,
      )
    }
    const rTreeBlockSize = dataView.getUint32(4, true)
    // Upper bound on size, based on a completely full leaf node.
    const maxRTreeBlockSpan = 4 + rTreeBlockSize * 32

    const blockIntersectsQuery = (
      startChrom: number,
      startBase: number,
      endChrom: number,
      endBase: number,
    ) =>
      (startChrom < chrId || (startChrom === chrId && startBase <= end)) &&
      (endChrom > chrId || (endChrom === chrId && endBase >= start))

    const blocks: Block[] = []
    let currentOffsets = [this.rTreeOffset + 48]

    while (currentOffsets.length > 0) {
      const spans = mergeRanges(
        currentOffsets.map(o => ({ min: o, max: o + maxRTreeBlockSpan })),
      )
      const nextOffsets: number[] = []
      for (const { min, max } of spans) {
        const length = max - min
        const offset = min
        const resultBuffer = await this.rTreeNodeCache.get(
          `${length}_${offset}`,
          { length, offset },
          opts?.signal,
        )
        for (const element of currentOffsets) {
          if (min <= element && element <= max) {
            const data = resultBuffer.subarray(element - offset)
            const dv = getDataView(data)
            const isLeaf = dv.getUint8(0)
            const count = dv.getUint16(2, true)
            if (isLeaf === 1 || isLeaf === 0) {
              const entrySize = isLeaf === 1 ? 32 : 24
              let nodeOffset = 4
              for (let i = 0; i < count; i++) {
                const startChrom = dv.getUint32(nodeOffset, true)
                const startBase = dv.getUint32(nodeOffset + 4, true)
                const endChrom = dv.getUint32(nodeOffset + 8, true)
                const endBase = dv.getUint32(nodeOffset + 12, true)
                if (
                  blockIntersectsQuery(startChrom, startBase, endChrom, endBase)
                ) {
                  const childOrBlockOffset = Number(
                    dv.getBigUint64(nodeOffset + 16, true),
                  )
                  if (isLeaf === 1) {
                    const blockSize = Number(
                      dv.getBigUint64(nodeOffset + 24, true),
                    )
                    blocks.push({
                      offset: childOrBlockOffset,
                      length: blockSize,
                    })
                  } else {
                    nextOffsets.push(childOrBlockOffset)
                  }
                }
                nodeOffset += entrySize
              }
            }
          }
        }
      }
      currentOffsets = nextOffsets
    }

    return { blocks, chrId }
  }

  public async readWigData(
    chrName: string,
    start: number,
    end: number,
    opts?: Options,
  ): Promise<Feature[]> {
    const collected = await this._collectBlocks(chrName, start, end, opts)
    if (!collected) {
      return []
    }
    const { blocks, chrId } = collected
    return this.readFeatures(blocks, {
      ...opts,
      request: { chrId, start, end },
    })
  }

  // Collect the R-tree blocks for every region and dedupe them by file offset:
  // a block surfaced by multiple (overlapping) regions is fetched once but
  // tagged with each region that wants it, so it gets parsed per region. The
  // caller groups the deduped union so physically adjacent blocks from
  // different regions coalesce into a single read.
  private async _collectBlocksMulti(
    regions: { refName: string; start: number; end: number }[],
    opts: Options,
  ): Promise<CollectedBlocksMulti> {
    const blockByOffset = new Map<number, Block>()
    const tagsByOffset = new Map<number, RegionTag[]>()
    for (let regionIndex = 0; regionIndex < regions.length; regionIndex++) {
      const { refName, start, end } = regions[regionIndex]!
      const collected = await this._collectBlocks(refName, start, end, opts)
      if (collected) {
        const request = { chrId: collected.chrId, start, end }
        for (const block of collected.blocks) {
          const tags = tagsByOffset.get(block.offset)
          if (tags) {
            tags.push({ regionIndex, request })
          } else {
            blockByOffset.set(block.offset, block)
            tagsByOffset.set(block.offset, [{ regionIndex, request }])
          }
        }
      }
    }
    return { blockByOffset, tagsByOffset }
  }

  public async readWigDataMulti(
    regions: { refName: string; start: number; end: number }[],
    opts: Options = {},
  ): Promise<Feature[][]> {
    const results: Feature[][] = regions.map(() => [])
    const { blockByOffset, tagsByOffset } = await this._collectBlocksMulti(
      regions,
      opts,
    )

    const { blockType } = this
    await this._forEachDecodedBlock(
      [...blockByOffset.values()],
      opts.signal,
      opts.onProgress,
      (data, blockOffset) => {
        const tags = tagsByOffset.get(blockOffset)
        if (tags) {
          for (const { regionIndex, request } of tags) {
            const features = parseBlock(blockType, data, blockOffset, request)
            for (const f of features) {
              results[regionIndex]!.push(f)
            }
          }
        }
      },
    )
    return results
  }

  public async readWigDataAsArrays(
    chrName: string,
    start: number,
    end: number,
    opts?: Options,
  ): Promise<BigWigFeatureArrays | SummaryFeatureArrays> {
    const collected = await this._collectBlocks(chrName, start, end, opts)
    if (this.blockType === 'summary') {
      return collected
        ? this._readSummaryFeaturesAsArrays(
            collected.blocks,
            { chrId: collected.chrId, start, end },
            opts,
          )
        : emptySummaryArrays()
    }
    return collected
      ? this._readBigWigFeaturesAsArrays(
          collected.blocks,
          { chrId: collected.chrId, start, end },
          opts,
        )
      : emptyBigWigArrays()
  }

  // Multi-region typed-array read. Same block dedupe/coalesce strategy as
  // readWigDataMulti, but parses each block into typed-array chunks and packs
  // all regions into one backing set of arrays (see *Multi return types). Unlike
  // the single-region path it can't use the fused decompress+parse wasm call
  // (that filters by one coord range), so it decompresses raw then parses each
  // block per region in JS.
  public async readWigDataAsArraysMulti(
    regions: { refName: string; start: number; end: number }[],
    opts: Options = {},
  ): Promise<BigWigFeatureArraysMulti | SummaryFeatureArraysMulti> {
    const collected = await this._collectBlocksMulti(regions, opts)
    if (this.blockType === 'summary') {
      const chunksByRegion = await this._readBlocksAsArraysMulti(
        collected,
        regions.length,
        (data, request) => parseSummaryBlockAsArrays(data, request),
        opts,
      )
      return concatSummaryChunksMulti(chunksByRegion)
    }
    const chunksByRegion = await this._readBlocksAsArraysMulti(
      collected,
      regions.length,
      (data, request) => parseBigWigBlockAsArrays(data, request),
      opts,
    )
    return concatBigWigChunksMulti(chunksByRegion)
  }

  // Fetch the deduped block union, decompress each group, and parse every block
  // into a typed-array chunk for each region that tagged it. Empty chunks are
  // dropped. Returns one chunk list per region, in input order.
  private async _readBlocksAsArraysMulti<T extends BigWigChunk>(
    collected: CollectedBlocksMulti,
    regionCount: number,
    parseChunk: (data: Uint8Array, request: CoordRequest) => T,
    opts: Options,
  ): Promise<T[][]> {
    const { blockByOffset, tagsByOffset } = collected
    const chunksByRegion: T[][] = Array.from({ length: regionCount }, () => [])
    await this._forEachDecodedBlock(
      [...blockByOffset.values()],
      opts.signal,
      opts.onProgress,
      (data, blockOffset) => {
        const tags = tagsByOffset.get(blockOffset)
        if (tags) {
          for (const { regionIndex, request } of tags) {
            const chunk = parseChunk(data, request)
            if (chunk.starts.length > 0) {
              chunksByRegion[regionIndex]!.push(chunk)
            }
          }
        }
      },
    )
    return chunksByRegion
  }

  // Fetch each block group, decompress it (when compressed), and hand each
  // block's decoded bytes plus its file offset to `visit`. Shared by every
  // decompress-then-parse-in-JS reader (single-region, multi-region, and the
  // typed-array multi path). The single-region typed-array path is separate
  // because it fuses decompress+parse in one wasm call.
  private async _forEachDecodedBlock(
    blocks: Block[],
    signal: AbortSignal | undefined,
    onProgress: ProgressCallback | undefined,
    visit: (data: Uint8Array, blockOffset: number) => void,
  ): Promise<void> {
    const { uncompressBufSize } = this
    const blockGroups = groupBlocks(blocks)
    const report = blockProgress(blockGroups, onProgress)
    for (const blockGroup of blockGroups) {
      const data = await this.bbi.read(blockGroup.length, blockGroup.offset, {
        signal,
      })
      report(blockGroup.length)
      const groupOffset = blockGroup.offset
      const subBlocks = blockGroup.blocks

      if (uncompressBufSize > 0) {
        const localBlocks = subBlocks.map(block => ({
          offset: block.offset - groupOffset,
          length: block.length,
        }))
        const { data: decompressedData, offsets } = await unzipBatch(
          data,
          localBlocks,
          uncompressBufSize,
        )
        for (let i = 0; i < subBlocks.length; i++) {
          visit(
            decompressedData.subarray(offsets[i], offsets[i + 1]),
            subBlocks[i]!.offset,
          )
        }
      } else {
        for (const block of subBlocks) {
          const start = block.offset - groupOffset
          visit(data.subarray(start, start + block.length), block.offset)
        }
      }
    }
  }

  public async readFeatures(
    blocks: { offset: number; length: number }[],
    opts: Options = {},
  ): Promise<Feature[]> {
    const { blockType } = this
    const { signal, request, onProgress } = opts
    const allFeatures: Feature[] = []
    await this._forEachDecodedBlock(
      blocks,
      signal,
      onProgress,
      (data, blockOffset) => {
        const features = parseBlock(blockType, data, blockOffset, request)
        for (const f of features) {
          allFeatures.push(f)
        }
      },
    )
    return allFeatures
  }

  // Fetch each block group, then either batch-decompress+parse the whole group
  // (compressed) or parse each block individually (uncompressed). Returns the
  // non-empty per-group chunks; empty chunks are dropped so callers can sum
  // lengths and concatenate directly. The chunk shape T is inferred from the
  // parse functions, which the bigwig/summary callers supply.
  private async _readBlocksAsArrays<T>(
    blocks: Block[],
    signal: AbortSignal | undefined,
    parseGroup: (data: Uint8Array, localBlocks: Block[]) => Promise<T>,
    parseSingleBlock: (blockData: Uint8Array) => T,
    count: (chunk: T) => number,
    onProgress?: ProgressCallback,
  ): Promise<T[]> {
    const chunks: T[] = []
    const blockGroups = groupBlocks(blocks)
    const report = blockProgress(blockGroups, onProgress)
    for (const blockGroup of blockGroups) {
      const data = await this.bbi.read(blockGroup.length, blockGroup.offset, {
        signal,
      })
      report(blockGroup.length)
      const localBlocks = blockGroup.blocks.map(block => ({
        offset: block.offset - blockGroup.offset,
        length: block.length,
      }))

      if (this.uncompressBufSize > 0) {
        const chunk = await parseGroup(data, localBlocks)
        if (count(chunk) > 0) {
          chunks.push(chunk)
        }
      } else {
        for (const block of localBlocks) {
          const blockData = data.subarray(
            block.offset,
            block.offset + block.length,
          )
          const chunk = parseSingleBlock(blockData)
          if (count(chunk) > 0) {
            chunks.push(chunk)
          }
        }
      }
    }
    return chunks
  }

  private async _readBigWigFeaturesAsArrays(
    blocks: Block[],
    request: CoordRequest,
    opts: Options = {},
  ): Promise<BigWigFeatureArrays> {
    const chunks = await this._readBlocksAsArrays(
      blocks,
      opts.signal,
      (data, localBlocks) =>
        decompressAndParseBigWigBlocks(
          data,
          localBlocks,
          this.uncompressBufSize,
          request.start,
          request.end,
        ),
      blockData => parseBigWigBlockAsArrays(blockData, request),
      chunk => chunk.starts.length,
      opts.onProgress,
    )
    return concatBigWigChunks(chunks)
  }

  private async _readSummaryFeaturesAsArrays(
    blocks: Block[],
    request: CoordRequest,
    opts: Options = {},
  ): Promise<SummaryFeatureArrays> {
    const chunks = await this._readBlocksAsArrays(
      blocks,
      opts.signal,
      (data, localBlocks) =>
        decompressAndParseSummaryBlocks(
          data,
          localBlocks,
          this.uncompressBufSize,
          request.chrId,
          request.start,
          request.end,
        ),
      blockData => parseSummaryBlockAsArrays(blockData, request),
      chunk => chunk.starts.length,
      opts.onProgress,
    )
    return concatSummaryChunks(chunks)
  }
}
