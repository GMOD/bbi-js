import AbortablePromiseCache from '@gmod/abortable-promise-cache'
import QuickLRU from 'quick-lru'

import Range from './range'
import { unzip } from './unzip'
import { checkAbortSignal, groupBlocks } from './util'

import type { Feature } from './types'
import type { GenericFilehandle } from 'generic-filehandle2'
import type { Observer } from 'rxjs'

const decoder =
  typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined

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
  private cirTreePromise?: Promise<Uint8Array>

  private featureCache = new AbortablePromiseCache<ReadData, Uint8Array>({
    cache: new QuickLRU({ maxSize: 1000 }),

    fill: async ({ length, offset }, signal) =>
      this.bbi.read(length, offset, { signal }),
  })

  public constructor(
    private bbi: GenericFilehandle,
    private refsByName: any,
    private cirTreeOffset: number,
    private isCompressed: boolean,
    private blockType: string,
  ) {
    if (!(cirTreeOffset >= 0)) {
      throw new Error('invalid cirTreeOffset!')
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
      }
      const request = { chrId, start, end }
      if (!this.cirTreePromise) {
        this.cirTreePromise = this.bbi.read(48, this.cirTreeOffset, opts)
      }
      const buffer = await this.cirTreePromise
      const dataView = new DataView(buffer.buffer)
      const cirBlockSize = dataView.getUint32(4, true)
      let blocksToFetch: any[] = []
      let outstanding = 0

      const cirFobRecur2 = (
        cirBlockData: Uint8Array,
        offset2: number,
        level: number,
      ) => {
        try {
          const data = cirBlockData.subarray(offset2)

          const b = data
          const dataView = new DataView(b.buffer, b.byteOffset, b.length)
          let offset = 0

          const isLeaf = dataView.getUint8(offset)
          offset += 2 // 1 skip
          const cnt = dataView.getUint16(offset, true)
          offset += 2
          if (isLeaf === 1) {
            const blocksToFetch2 = []
            for (let i = 0; i < cnt; i++) {
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
              blocksToFetch2.push({
                startChrom,
                startBase,
                endBase,
                endChrom,
                blockOffset,
                blockSize,
                offset,
              })
            }
            blocksToFetch = blocksToFetch.concat(
              blocksToFetch2
                .filter(f => filterFeats(f))
                .map(l => ({
                  offset: l.blockOffset,
                  length: l.blockSize,
                })),
            )
          } else if (isLeaf === 0) {
            const recurOffsets = []
            for (let i = 0; i < cnt; i++) {
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
              recurOffsets.push({
                startChrom,
                startBase,
                endChrom,
                endBase,
                blockOffset,
                offset,
              })
            }
            const recurOffsets2 = recurOffsets
              .filter(f => filterFeats(f))
              .map(l => l.blockOffset)
            if (recurOffsets2.length > 0) {
              cirFobRecur(recurOffsets2, level + 1)
            }
          }
        } catch (e) {
          observer.error(e)
        }
      }

      const filterFeats = (b: {
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

      const cirFobStartFetch = async (
        off: number[],
        fr: Range,
        level: number,
      ) => {
        try {
          const length = fr.max - fr.min
          const offset = fr.min
          const resultBuffer = await this.featureCache.get(
            `${length}_${offset}`,
            { length, offset },
            opts?.signal,
          )
          for (const element of off) {
            if (fr.contains(element)) {
              cirFobRecur2(resultBuffer, element - offset, level)
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
      const cirFobRecur = (offset: number[], level: number) => {
        try {
          outstanding += offset.length

          // Upper bound on size, based on a completely full leaf node.
          const maxCirBlockSpan = 4 + cirBlockSize * 32
          let spans = new Range([
            {
              min: offset[0],
              max: offset[0] + maxCirBlockSpan,
            },
          ])
          for (let i = 1; i < offset.length; i += 1) {
            const blockSpan = new Range([
              {
                min: offset[i],
                max: offset[i] + maxCirBlockSpan,
              },
            ])
            spans = spans.union(blockSpan)
          }
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          spans.getRanges().map(fr => cirFobStartFetch(offset, fr, level))
        } catch (e) {
          observer.error(e)
        }
      }

      cirFobRecur([Number(this.cirTreeOffset) + 48], 1)
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
    const features = [] as any[]
    let offset = startOffset

    const dataView = new DataView(b.buffer, b.byteOffset, b.length)
    while (offset < b.byteLength) {
      // this was extracted from looking at the runtime code generated by
      // binary-parser
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
      offset += 4
      // unused
      // const sumSqData = dataView.getFloat32(offset, true)
      offset += 4

      if (
        request
          ? chromId === request.chrId &&
            coordFilter(start, end, request.start, request.end)
          : true
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
    const items = [] as Feature[]
    let currOffset = startOffset
    const b = data
    const dataView = new DataView(b.buffer, b.byteOffset, b.length)
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
      const rest = decoder?.decode(b) ?? b.toString()
      currOffset = i + 1
      items.push({
        chromId,
        start,
        end,
        rest,
        uniqueId: `bb-${offset + c2}`,
      })
    }

    return request
      ? items.filter((f: any) =>
          coordFilter(f.start, f.end, request.start, request.end),
        )
      : items
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
    const items = new Array(itemCount)
    switch (blockType) {
      case 1: {
        for (let i = 0; i < itemCount; i++) {
          const start = dataView.getInt32(offset, true)
          offset += 4
          const end = dataView.getInt32(offset, true)
          offset += 4
          const score = dataView.getFloat32(offset, true)
          offset += 4
          items[i] = {
            start,
            end,
            score,
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
          items[i] = {
            score,
            start,
            end: start + itemSpan,
          }
        }
        break
      }
      case 3: {
        for (let i = 0; i < itemCount; i++) {
          const score = dataView.getFloat32(offset, true)
          offset += 4
          const start = blockStart + i * itemStep
          items[i] = {
            score,
            start,
            end: start + itemSpan,
          }
        }
        break
      }
    }

    return req
      ? items.filter(f => coordFilter(f.start, f.end, req.start, req.end))
      : items
  }

  public async readFeatures(
    observer: Observer<Feature[]>,
    blocks: { offset: number; length: number }[],
    opts: Options = {},
  ) {
    try {
      const { blockType, isCompressed } = this
      const { signal, request } = opts
      const blockGroupsToFetch = groupBlocks(blocks)
      checkAbortSignal(signal)
      await Promise.all(
        blockGroupsToFetch.map(async blockGroup => {
          checkAbortSignal(signal)
          const { length, offset } = blockGroup
          const data = await this.featureCache.get(
            `${length}_${offset}`,
            blockGroup,
            signal,
          )
          for (const block of blockGroup.blocks) {
            checkAbortSignal(signal)
            let resultData = data.subarray(
              Number(block.offset) - Number(blockGroup.offset),
            )
            if (isCompressed) {
              resultData = unzip(resultData)
            }
            checkAbortSignal(signal)

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
                    Number(block.offset) * (1 << 8),
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
}
