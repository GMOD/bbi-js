import AbortablePromiseCache from '@gmod/abortable-promise-cache'
import QuickLRU from 'quick-lru'

import Range from './range.ts'
import {
  decompressAndParseBigWigBlocks,
  decompressAndParseSummaryBlocks,
  unzipBatch,
} from './unzip.ts'
import { groupBlocks } from './util.ts'

import type { Feature } from './types.ts'
import type { BigWigFeatureArrays, SummaryFeatureArrays } from './unzip.ts'
import type { GenericFilehandle } from 'generic-filehandle2'
import type { Observer } from 'rxjs'

const decoder = new TextDecoder('utf8')

interface CoordRequest {
  chrId: number
  start: number
  end: number
}

interface ReadData {
  offset: number
  length: number
}

interface Options {
  signal?: AbortSignal
  request?: CoordRequest
}

function coordFilter(s1: number, e1: number, s2: number, e2: number): boolean {
  return s1 < e2 && e1 >= s2
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

  private featureCache = new AbortablePromiseCache<ReadData, Uint8Array>({
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

  public async readWigData(
    chrName: string,
    start: number,
    end: number,
    observer: Observer<Feature[]>,
    opts?: Options,
  ) {
    try {
      const chrId = this.refsByName[chrName]
      if (chrId === undefined) {
        observer.complete()
        return
      }
      const request = { chrId, start, end }
      if (!this.rTreePromise) {
        this.rTreePromise = this.bbi.read(48, this.rTreeOffset, opts)
      }
      const buffer = await this.rTreePromise
      const dataView = new DataView(
        buffer.buffer,
        buffer.byteOffset,
        buffer.length,
      )
      // Maximum number of children per R-tree node - used to calculate memory bounds
      const rTreeBlockSize = dataView.getUint32(4, true)
      const blocksToFetch: ReadData[] = []
      let outstanding = 0

      // R-tree leaf nodes contain the actual data blocks to fetch
      const processLeafNode = (
        dataView: DataView,
        startOffset: number,
        count: number,
      ) => {
        let offset = startOffset
        for (let i = 0; i < count; i++) {
          const startChrom = dataView.getUint32(offset, true)
          offset += 4
          const startBase = dataView.getUint32(offset, true)
          offset += 4
          const endChrom = dataView.getUint32(offset, true)
          offset += 4
          const endBase = dataView.getUint32(offset, true)
          offset += 4
          const blockOffset = Number(dataView.getBigUint64(offset, true))
          offset += 8
          const blockSize = Number(dataView.getBigUint64(offset, true))
          offset += 8
          if (
            blockIntersectsQuery({ startChrom, startBase, endBase, endChrom })
          ) {
            blocksToFetch.push({
              offset: blockOffset,
              length: blockSize,
            })
          }
        }
      }

      // R-tree non-leaf nodes contain pointers to child nodes
      const processNonLeafNode = (
        dataView: DataView,
        startOffset: number,
        count: number,
        level: number,
      ) => {
        const recurOffsets = []
        let offset = startOffset
        for (let i = 0; i < count; i++) {
          const startChrom = dataView.getUint32(offset, true)
          offset += 4
          const startBase = dataView.getUint32(offset, true)
          offset += 4
          const endChrom = dataView.getUint32(offset, true)
          offset += 4
          const endBase = dataView.getUint32(offset, true)
          offset += 4
          const blockOffset = Number(dataView.getBigUint64(offset, true))
          offset += 8
          if (
            blockIntersectsQuery({ startChrom, startBase, endChrom, endBase })
          ) {
            recurOffsets.push(blockOffset)
          }
        }
        if (recurOffsets.length > 0) {
          traverseRTree(recurOffsets, level + 1)
        }
      }

      const processRTreeNode = (
        rTreeBlockData: Uint8Array,
        offset2: number,
        level: number,
      ) => {
        try {
          const data = rTreeBlockData.subarray(offset2)
          const dataView = new DataView(
            data.buffer,
            data.byteOffset,
            data.length,
          )
          let offset = 0

          const isLeaf = dataView.getUint8(offset)
          offset += 2 // 1 skip for reserved byte
          const count = dataView.getUint16(offset, true)
          offset += 2

          if (isLeaf === 1) {
            processLeafNode(dataView, offset, count)
          } else if (isLeaf === 0) {
            processNonLeafNode(dataView, offset, count, level)
          }
        } catch (e) {
          observer.error(e)
        }
      }

      const blockIntersectsQuery = (b: {
        startChrom: number
        startBase: number
        endChrom: number
        endBase: number
      }) => {
        const { startChrom, startBase, endChrom, endBase } = b
        return (
          (startChrom < chrId || (startChrom === chrId && startBase <= end)) &&
          (endChrom > chrId || (endChrom === chrId && endBase >= start))
        )
      }

      const fetchAndProcessRTreeBlocks = async (
        offsets: number[],
        range: Range,
        level: number,
      ) => {
        try {
          const length = range.max - range.min
          const offset = range.min
          const resultBuffer = await this.featureCache.get(
            `${length}_${offset}`,
            { length, offset },
            opts?.signal,
          )
          for (const element of offsets) {
            if (range.contains(element)) {
              processRTreeNode(resultBuffer, element - offset, level)
              outstanding -= 1
              if (outstanding === 0) {
                this.readFeatures(observer, blocksToFetch, {
                  ...opts,
                  request,
                }).catch((e: unknown) => {
                  observer.error(e)
                })
              }
            }
          }
        } catch (e) {
          observer.error(e)
        }
      }
      const traverseRTree = (offsets: number[], level: number) => {
        try {
          outstanding += offsets.length

          // Upper bound on size, based on a completely full leaf node.
          const maxRTreeBlockSpan = 4 + rTreeBlockSize * 32
          let spans = new Range([
            {
              min: offsets[0]!,
              max: offsets[0]! + maxRTreeBlockSpan,
            },
          ])
          for (let i = 1; i < offsets.length; i += 1) {
            const blockSpan = new Range([
              {
                min: offsets[i]!,
                max: offsets[i]! + maxRTreeBlockSpan,
              },
            ])
            spans = spans.union(blockSpan)
          }
          spans.getRanges().forEach(range => {
            fetchAndProcessRTreeBlocks(offsets, range, level).catch(
              (e: unknown) => {
                observer.error(e)
              },
            )
          })
        } catch (e) {
          observer.error(e)
        }
      }

      traverseRTree([this.rTreeOffset + 48], 1)
      return
    } catch (e) {
      observer.error(e)
    }
  }

  private parseSummaryBlock(
    b: Uint8Array,
    startOffset: number,
    request?: CoordRequest,
  ) {
    const features: Feature[] = []
    let offset = startOffset

    const dataView = new DataView(b.buffer, b.byteOffset, b.length)
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
          score: sumData / (validCnt || 1),
        })
      }
    }

    return features
  }

  private parseBigBedBlock(
    data: Uint8Array,
    startOffset: number,
    offset: number,
    request?: CoordRequest,
  ) {
    const items: Feature[] = []
    let currOffset = startOffset
    const dataView = new DataView(data.buffer, data.byteOffset, data.length)
    while (currOffset < data.byteLength) {
      const c2 = currOffset
      const chromId = dataView.getUint32(currOffset, true)
      currOffset += 4
      const start = dataView.getInt32(currOffset, true)
      currOffset += 4
      const end = dataView.getInt32(currOffset, true)
      currOffset += 4
      let i = currOffset
      for (; i < data.length; i++) {
        if (data[i] === 0) {
          break
        }
      }
      const b = data.subarray(currOffset, i)
      const rest = decoder.decode(b)
      currOffset = i + 1
      if (
        !request ||
        (chromId === request.chrId &&
          coordFilter(start, end, request.start, request.end))
      ) {
        items.push({
          start,
          end,
          rest,
          uniqueId: `bb-${offset + c2}`,
        })
      }
    }

    return items
  }

  private parseBigWigBlock(
    buffer: Uint8Array,
    startOffset: number,
    req?: CoordRequest,
  ) {
    const b = buffer.subarray(startOffset)

    const dataView = new DataView(b.buffer, b.byteOffset, b.length)
    let offset = 0
    offset += 4
    const blockStart = dataView.getInt32(offset, true)
    offset += 8
    const itemStep = dataView.getUint32(offset, true)
    offset += 4
    const itemSpan = dataView.getUint32(offset, true)
    offset += 4
    const blockType = dataView.getUint8(offset)
    offset += 2
    const itemCount = dataView.getUint16(offset, true)
    offset += 2
    const items = []
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
            items.push({
              start,
              end,
              score,
            })
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
            items.push({
              score,
              start,
              end,
            })
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
            items.push({
              score,
              start,
              end,
            })
          }
        }
        break
      }
    }

    return items
  }

  private parseBigWigBlockAsArrays(
    buffer: Uint8Array,
    startOffset: number,
    req?: CoordRequest,
  ): { starts: Int32Array; ends: Int32Array; scores: Float32Array } {
    const dataView = new DataView(
      buffer.buffer,
      buffer.byteOffset + startOffset,
      buffer.length - startOffset,
    )
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
          if (start < reqEnd && end >= reqStart) {
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
          if (start < reqEnd && end >= reqStart) {
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
          if (start < reqEnd && end >= reqStart) {
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

  public async readFeatures(
    observer: Observer<Feature[]>,
    blocks: { offset: number; length: number }[],
    opts: Options = {},
  ) {
    try {
      const { blockType, uncompressBufSize } = this
      const { signal, request } = opts
      const blockGroupsToFetch = groupBlocks(blocks)
      await Promise.all(
        blockGroupsToFetch.map(async blockGroup => {
          const { length, offset } = blockGroup
          const data = await this.featureCache.get(
            `${length}_${offset}`,
            blockGroup,
            signal,
          )

          const localBlocks = blockGroup.blocks.map(block => ({
            offset: block.offset - blockGroup.offset,
            length: block.length,
          }))

          let decompressedData: Uint8Array
          let decompressedOffsets: number[]

          if (uncompressBufSize > 0) {
            const result = await unzipBatch(
              data,
              localBlocks,
              uncompressBufSize,
            )
            decompressedData = result.data
            decompressedOffsets = result.offsets
          } else {
            decompressedData = data
            decompressedOffsets = localBlocks.map(b => b.offset)
            decompressedOffsets.push(data.length)
          }

          for (let i = 0; i < blockGroup.blocks.length; i++) {
            const block = blockGroup.blocks[i]!
            const start = decompressedOffsets[i]!
            const end = decompressedOffsets[i + 1]!
            const resultData = decompressedData.subarray(start, end)

            switch (blockType) {
              case 'summary': {
                observer.next(this.parseSummaryBlock(resultData, 0, request))
                break
              }
              case 'bigwig': {
                observer.next(this.parseBigWigBlock(resultData, 0, request))
                break
              }
              case 'bigbed': {
                observer.next(
                  this.parseBigBedBlock(
                    resultData,
                    0,
                    block.offset * (1 << 8),
                    request,
                  ),
                )
                break
              }
              default: {
                console.warn(`Don't know what to do with ${blockType}`)
              }
            }
          }
        }),
      )
      observer.complete()
    } catch (e) {
      observer.error(e)
    }
  }

  public async readBigWigFeaturesAsArrays(
    blocks: { offset: number; length: number }[],
    opts: Options = {},
  ): Promise<BigWigFeatureArrays> {
    const { uncompressBufSize } = this
    const { signal, request } = opts
    const blockGroupsToFetch = groupBlocks(blocks)

    const allStarts: Int32Array[] = []
    const allEnds: Int32Array[] = []
    const allScores: Float32Array[] = []
    let totalCount = 0

    await Promise.all(
      blockGroupsToFetch.map(async blockGroup => {
        const { length, offset } = blockGroup
        const data = await this.featureCache.get(
          `${length}_${offset}`,
          blockGroup,
          signal,
        )

        const localBlocks = blockGroup.blocks.map(block => ({
          offset: block.offset - blockGroup.offset,
          length: block.length,
        }))

        if (uncompressBufSize > 0) {
          const result = await decompressAndParseBigWigBlocks(
            data,
            localBlocks,
            uncompressBufSize,
            request?.start ?? 0,
            request?.end ?? 0,
          )
          if (result.starts.length > 0) {
            allStarts.push(result.starts)
            allEnds.push(result.ends)
            allScores.push(result.scores)
            totalCount += result.starts.length
          }
        } else {
          for (const block of localBlocks) {
            const blockData = data.subarray(
              block.offset,
              block.offset + block.length,
            )
            const result = this.parseBigWigBlockAsArrays(blockData, 0, request)
            if (result.starts.length > 0) {
              allStarts.push(result.starts)
              allEnds.push(result.ends)
              allScores.push(result.scores)
              totalCount += result.starts.length
            }
          }
        }
      }),
    )

    if (allStarts.length === 0) {
      return {
        starts: new Int32Array(0),
        ends: new Int32Array(0),
        scores: new Float32Array(0),
        isSummary: false as const,
      }
    }

    if (allStarts.length === 1) {
      return {
        starts: allStarts[0]!,
        ends: allEnds[0]!,
        scores: allScores[0]!,
        isSummary: false as const,
      }
    }

    const starts = new Int32Array(totalCount)
    const ends = new Int32Array(totalCount)
    const scores = new Float32Array(totalCount)
    let offset = 0
    for (let i = 0; i < allStarts.length; i++) {
      starts.set(allStarts[i]!, offset)
      ends.set(allEnds[i]!, offset)
      scores.set(allScores[i]!, offset)
      offset += allStarts[i]!.length
    }

    return { starts, ends, scores, isSummary: false as const }
  }

  public async readSummaryFeaturesAsArrays(
    blocks: { offset: number; length: number }[],
    opts: Options = {},
  ): Promise<SummaryFeatureArrays> {
    const { uncompressBufSize } = this
    const { signal, request } = opts
    const blockGroupsToFetch = groupBlocks(blocks)

    const allStarts: Int32Array[] = []
    const allEnds: Int32Array[] = []
    const allScores: Float32Array[] = []
    const allMinScores: Float32Array[] = []
    const allMaxScores: Float32Array[] = []
    let totalCount = 0

    await Promise.all(
      blockGroupsToFetch.map(async blockGroup => {
        const { length, offset } = blockGroup
        const data = await this.featureCache.get(
          `${length}_${offset}`,
          blockGroup,
          signal,
        )

        const localBlocks = blockGroup.blocks.map(block => ({
          offset: block.offset - blockGroup.offset,
          length: block.length,
        }))

        if (uncompressBufSize > 0) {
          const result = await decompressAndParseSummaryBlocks(
            data,
            localBlocks,
            uncompressBufSize,
            request?.chrId ?? 0,
            request?.start ?? 0,
            request?.end ?? 0,
          )
          if (result.starts.length > 0) {
            allStarts.push(result.starts)
            allEnds.push(result.ends)
            allScores.push(result.scores)
            allMinScores.push(result.minScores)
            allMaxScores.push(result.maxScores)
            totalCount += result.starts.length
          }
        } else {
          for (const block of localBlocks) {
            const blockData = data.subarray(
              block.offset,
              block.offset + block.length,
            )
            const features = this.parseSummaryBlock(blockData, 0, request)
            if (features.length > 0) {
              const starts = new Int32Array(features.length)
              const ends = new Int32Array(features.length)
              const scores = new Float32Array(features.length)
              const minScores = new Float32Array(features.length)
              const maxScores = new Float32Array(features.length)
              for (let i = 0; i < features.length; i++) {
                const f = features[i]!
                starts[i] = f.start
                ends[i] = f.end
                scores[i] = f.score ?? 0
                minScores[i] = f.minScore ?? 0
                maxScores[i] = f.maxScore ?? 0
              }
              allStarts.push(starts)
              allEnds.push(ends)
              allScores.push(scores)
              allMinScores.push(minScores)
              allMaxScores.push(maxScores)
              totalCount += features.length
            }
          }
        }
      }),
    )

    if (allStarts.length === 0) {
      return {
        starts: new Int32Array(0),
        ends: new Int32Array(0),
        scores: new Float32Array(0),
        minScores: new Float32Array(0),
        maxScores: new Float32Array(0),
        isSummary: true as const,
      }
    }

    if (allStarts.length === 1) {
      return {
        starts: allStarts[0]!,
        ends: allEnds[0]!,
        scores: allScores[0]!,
        minScores: allMinScores[0]!,
        maxScores: allMaxScores[0]!,
        isSummary: true as const,
      }
    }

    const starts = new Int32Array(totalCount)
    const ends = new Int32Array(totalCount)
    const scores = new Float32Array(totalCount)
    const minScores = new Float32Array(totalCount)
    const maxScores = new Float32Array(totalCount)
    let offset = 0
    for (let i = 0; i < allStarts.length; i++) {
      starts.set(allStarts[i]!, offset)
      ends.set(allEnds[i]!, offset)
      scores.set(allScores[i]!, offset)
      minScores.set(allMinScores[i]!, offset)
      maxScores.set(allMaxScores[i]!, offset)
      offset += allStarts[i]!.length
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
}
