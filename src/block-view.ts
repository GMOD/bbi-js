import AbortablePromiseCache from '@gmod/abortable-promise-cache'
import QuickLRU from '@jbrowse/quick-lru'

import { mergeRanges } from './range.ts'
import {
  decompressAndParseBigWigBlocks,
  decompressAndParseSummaryBlocks,
  unzipBatch,
} from './unzip.ts'
import { decoder, getDataView, groupBlocks } from './util.ts'

import type { Feature } from './types.ts'
import type { BigWigFeatureArrays, SummaryFeatureArrays } from './unzip.ts'
import type { Block } from './util.ts'
import type { GenericFilehandle } from 'generic-filehandle2'

const CIR_TREE_MAGIC = 0x2468ace0

interface CoordRequest {
  chrId: number
  start: number
  end: number
}

interface Options {
  signal?: AbortSignal
  request?: CoordRequest
}

// half-open [start,end) intersection: feature [s1,e1) overlaps query [s2,e2)
// iff s1 < e2 && e1 > s2. Must match the wasm parse path (crate/src/lib.rs).
function coordFilter(s1: number, e1: number, s2: number, e2: number): boolean {
  return s1 < e2 && e1 > s2
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
        score: validCnt ? sumData / validCnt : 0,
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
  req?: CoordRequest,
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

  if (!req) {
    switch (blockType) {
      case 1: {
        let offset = 24
        for (let i = 0; i < itemCount; i++) {
          starts[i] = dataView.getInt32(offset, true)
          ends[i] = dataView.getInt32(offset + 4, true)
          scores[i] = dataView.getFloat32(offset + 8, true)
          offset += 12
        }
        return { starts, ends, scores }
      }
      case 2: {
        let offset = 24
        for (let i = 0; i < itemCount; i++) {
          const start = dataView.getInt32(offset, true)
          starts[i] = start
          ends[i] = start + itemSpan
          scores[i] = dataView.getFloat32(offset + 4, true)
          offset += 8
        }
        return { starts, ends, scores }
      }
      case 3: {
        let offset = 24
        for (let i = 0; i < itemCount; i++) {
          const start = blockStart + i * itemStep
          starts[i] = start
          ends[i] = start + itemSpan
          scores[i] = dataView.getFloat32(offset, true)
          offset += 4
        }
        return { starts, ends, scores }
      }
    }
    return { starts, ends, scores }
  }

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
  request?: CoordRequest,
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
      !request ||
      (chromId === request.chrId &&
        coordFilter(start, end, request.start, request.end))
    ) {
      starts[idx] = start
      ends[idx] = end
      scores[idx] = validCnt ? sumData / validCnt : 0
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

  public constructor(
    private bbi: GenericFilehandle,
    private refsByName: Record<string, number>,
    // Offset to the R-tree index in the file - this is part of the "cirTree"
    // (combined ID R-tree), which combines a B+ tree for chromosome names
    // with an R-tree for efficient spatial queries
    private rTreeOffset: number,
    private uncompressBufSize: number,
    private blockType: string,
  ) {
    if (!(rTreeOffset >= 0)) {
      throw new Error('invalid rTreeOffset!')
    }
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
      this.rTreePromise = this.bbi
        .read(48, this.rTreeOffset, opts)
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
        : {
            starts: new Int32Array(0),
            ends: new Int32Array(0),
            scores: new Float32Array(0),
            minScores: new Float32Array(0),
            maxScores: new Float32Array(0),
            isSummary: true as const,
          }
    }
    return collected
      ? this._readBigWigFeaturesAsArrays(
          collected.blocks,
          { chrId: collected.chrId, start, end },
          opts,
        )
      : {
          starts: new Int32Array(0),
          ends: new Int32Array(0),
          scores: new Float32Array(0),
          isSummary: false as const,
        }
  }

  public async readFeatures(
    blocks: { offset: number; length: number }[],
    opts: Options = {},
  ): Promise<Feature[]> {
    const { blockType, uncompressBufSize } = this
    const { signal, request } = opts
    const blockGroupsToFetch = groupBlocks(blocks)
    const allFeatures: Feature[] = []
    for (const blockGroup of blockGroupsToFetch) {
      const data = await this.bbi.read(blockGroup.length, blockGroup.offset, {
        signal,
      })
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
          const resultData = decompressedData.subarray(
            offsets[i],
            offsets[i + 1],
          )
          const features = parseBlock(
            blockType,
            resultData,
            subBlocks[i]!.offset,
            request,
          )
          for (const f of features) {
            allFeatures.push(f)
          }
        }
      } else {
        for (const block of subBlocks) {
          const start = block.offset - groupOffset
          const resultData = data.subarray(start, start + block.length)
          const features = parseBlock(
            blockType,
            resultData,
            block.offset,
            request,
          )
          for (const f of features) {
            allFeatures.push(f)
          }
        }
      }
    }
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
  ): Promise<T[]> {
    const chunks: T[] = []
    for (const blockGroup of groupBlocks(blocks)) {
      const data = await this.bbi.read(blockGroup.length, blockGroup.offset, {
        signal,
      })
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
    )
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
    )
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
}
