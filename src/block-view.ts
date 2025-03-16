import { parseBigBedBlock } from './parse-big-bed.block'
import { parseBigWigBlock } from './parse-big-wig-block'
import { parseSummaryBlock } from './parse-summary-block'
import Range from './range'
import { unzip } from './unzip'
import { checkAbortSignal, groupBlocks } from './util'

import type { CoordRequest, Feature } from './types'
import type { GenericFilehandle } from 'generic-filehandle2'
import type { Observer } from 'rxjs'

interface Options {
  signal?: AbortSignal
  request?: CoordRequest
}
interface BlockToFetch {
  offset: number
  length: number
}

/**
 * View into a subset of the data in a BigWig file.
 *
 * Adapted by Robert Buels and Colin Diesh from bigwig.js in the Dalliance
 * Genome Explorer by Thomas Down.
 */

export class BlockView {
  private cirTreePromise?: Promise<Uint8Array>

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
      let blocksToFetch = [] as BlockToFetch[]
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
          const resultBuffer = await this.bbi.read(length, offset, opts)
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

  public async readFeatures(
    observer: Observer<Feature[]>,
    blocks: BlockToFetch[],
    opts: Options = {},
  ) {
    try {
      const { signal, request } = opts
      checkAbortSignal(signal)
      await Promise.all(
        groupBlocks(blocks).map(async blockGroup => {
          const { length, offset } = blockGroup
          const data = await this.bbi.read(length, offset, opts)
          for (const block of blockGroup.blocks) {
            const res = data.subarray(
              Number(block.offset) - Number(blockGroup.offset),
            )
            const b = this.isCompressed ? unzip(res) : res

            switch (this.blockType) {
              case 'summary': {
                observer.next(parseSummaryBlock(b, 0, request))
                break
              }
              case 'bigwig': {
                observer.next(parseBigWigBlock(b, 0, request))
                break
              }
              case 'bigbed': {
                observer.next(
                  parseBigBedBlock(
                    b,
                    0,
                    Number(block.offset) * (1 << 8),
                    request,
                  ),
                )
                break
              }
              default: {
                console.warn(`Don't know what to do with ${this.blockType}`)
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
