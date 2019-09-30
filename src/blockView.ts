/* eslint no-bitwise: ["error", { "allow": ["|"] }] */
import { Observer } from 'rxjs'
import { Parser } from '@gmod/binary-parser'
import AbortablePromiseCache from 'abortable-promise-cache'
import zlib from 'zlib'
import QuickLRU from 'quick-lru'
import { Feature } from './bbi'
import Range from './range'
import { groupBlocks, checkAbortSignal } from './util'

interface CoordRequest {
  chrId: number
  start: number
  end: number
}
interface DataBlock {
  startChrom: number
  endChrom: number
  startBase: number
  endBase: number
  validCnt: number
  minVal: number
  maxVal: number
  sumData: number
  sumSqData: number
}
interface ReadData {
  offset: number
  length: number
}

interface SummaryBlock {
  chromId: number
  start: number
  end: number
  validCnt: number
  minScore: number
  maxScore: number
  sumData: number
  sumSqData: number
}
interface Options {
  signal?: AbortSignal
  request?: CoordRequest
}

const BIG_WIG_TYPE_GRAPH = 1
const BIG_WIG_TYPE_VSTEP = 2
const BIG_WIG_TYPE_FSTEP = 3

/**
 * View into a subset of the data in a BigWig file.
 *
 * Adapted by Robert Buels and Colin Diesh from bigwig.js in the Dalliance Genome
 * Explorer by Thomas Down.
 * @constructs
 */
const initLeafParser = (le: string) =>
  new Parser()
    .endianess(le)
    .uint8('isLeaf')
    .skip(1)
    .uint16('cnt')
    .choice({
      tag: 'isLeaf',
      choices: {
        1: new Parser().array('blocksToFetch', {
          length: 'cnt',
          type: new Parser()
            .uint32('startChrom')
            .uint32('startBase')
            .uint32('endChrom')
            .uint32('endBase')
            .uint64('blockOffset')
            .uint64('blockSize'),
        }),
        0: new Parser().array('recurOffsets', {
          length: 'cnt',
          type: new Parser()
            .uint32('startChrom')
            .uint32('startBase')
            .uint32('endChrom')
            .uint32('endBase')
            .uint64('blockOffset'),
        }),
      },
    })

const initBigWigParser = (le: string) =>
  new Parser()
    .endianess(le)
    .skip(4)
    .int32('blockStart')
    .skip(4)
    .uint32('itemStep')
    .uint32('itemSpan')
    .uint8('blockType')
    .skip(1)
    .uint16('itemCount')
    .choice({
      tag: 'blockType',
      choices: {
        [BIG_WIG_TYPE_FSTEP]: new Parser().array('items', {
          length: 'itemCount',
          type: new Parser().float('score'),
        }),
        [BIG_WIG_TYPE_VSTEP]: new Parser().array('items', {
          length: 'itemCount',
          type: new Parser().int32('start').float('score'),
        }),
        [BIG_WIG_TYPE_GRAPH]: new Parser().array('items', {
          length: 'itemCount',
          type: new Parser()
            .int32('start')
            .int32('end')
            .float('score'),
        }),
      },
    })
const initBigBedParser = (le: string) =>
  new Parser()
    .endianess(le)
    .uint32('chromId')
    .int32('start')
    .int32('end')
    .string('rest', {
      zeroTerminated: true,
    })
const initSummaryParser = (le: string) =>
  new Parser()
    .endianess(le)
    .uint32('chromId')
    .uint32('start')
    .uint32('end')
    .uint32('validCnt')
    .float('minScore')
    .float('maxScore')
    .float('sumData')
    .float('sumSqData')
export class BlockView {
  private cirTreeOffset: number

  private cirTreeLength: number

  private bbi: any

  private isCompressed: boolean

  private isBigEndian: boolean

  private refsByName: { [key: string]: number }
  private blockType: string

  private cirTreeBuffer: Buffer

  private cirTreePromise?: Promise<void>

  private featureCache = new AbortablePromiseCache({
    cache: new QuickLRU({ maxSize: 1000 }),

    async fill(requestData: ReadData, signal: AbortSignal) {
      const { length, offset } = requestData
      const { buffer } = await this.bbi.read(Buffer.alloc(length), 0, length, offset, { signal })
      return buffer
    },
  })

  private leafParser: ReturnType<typeof initLeafParser>
  private bigWigParser: ReturnType<typeof initBigWigParser>
  private bigBedParser: ReturnType<typeof initBigBedParser>
  private summaryParser: ReturnType<typeof initSummaryParser>

  public constructor(
    bbi: any,
    refsByName: any,
    cirTreeOffset: number,
    cirTreeLength: number,
    isBigEndian: boolean,
    isCompressed: boolean,
    blockType: string,
  ) {
    if (!(cirTreeOffset >= 0)) throw new Error('invalid cirTreeOffset!')
    if (!(cirTreeLength > 0)) throw new Error('invalid cirTreeLength!')

    this.cirTreeOffset = cirTreeOffset
    this.cirTreeLength = cirTreeLength
    this.isCompressed = isCompressed
    this.refsByName = refsByName
    this.isBigEndian = isBigEndian
    this.bbi = bbi
    this.blockType = blockType
    this.cirTreeBuffer = Buffer.alloc(48)
    this.initializeParsers(isBigEndian)
  }
  private initializeParsers(isBigEndian: boolean) {
    const le = isBigEndian ? 'big' : 'little'
    this.summaryParser = this.leafParser = initLeafParser(le)
    this.summaryParser = initSummaryParser(le)
    this.bigWigParser = initBigWigParser(le)
    this.bigBedParser = initBigBedParser(le)
  }

  public async readWigData(
    chrName: string,
    start: number,
    end: number,
    observer: Observer<Feature[]>,
    opts: Options,
  ): Promise<void> {
    try {
      const { refsByName, bbi, cirTreeOffset, isBigEndian } = this
      const { signal } = opts
      const chrId = refsByName[chrName]
      if (chrId === undefined) {
        observer.complete()
      }
      const request = { chrId, start, end }
      if (!this.cirTreePromise) {
        this.cirTreePromise = bbi.read(Buffer.alloc(48), 0, 48, cirTreeOffset, { signal })
      }
      const { buffer } = await this.cirTreePromise
      const cirBlockSize = isBigEndian ? buffer.readUInt32BE(4) : buffer.readUInt32LE(4)
      let blocksToFetch: any[] = []
      let outstanding = 0

      //eslint-disable-next-line prefer-const
      let cirFobRecur2: Function

      const filterFeats = (b: DataBlock): boolean =>
        (b.startChrom < chrId || (b.startChrom === chrId && b.startBase <= end)) &&
        (b.endChrom > chrId || (b.endChrom === chrId && b.endBase >= start))

      const cirFobStartFetch = async (off: any, fr: any, level: number): Promise<void> => {
        try {
          const length = fr.max() - fr.min()
          const offset = fr.min()
          const resultBuffer = await this.featureCache.get(`${length}_${offset}`, { length, offset }, signal)
          for (let i = 0; i < off.length; i += 1) {
            if (fr.contains(off[i])) {
              cirFobRecur2(resultBuffer, off[i] - offset, level, observer, opts)
              outstanding -= 1
              if (outstanding === 0) {
                this.readFeatures(observer, blocksToFetch, { ...opts, request })
              }
            }
          }
        } catch (e) {
          observer.error(e)
        }
      }
      const cirFobRecur = (offset: any, level: number): void => {
        try {
          outstanding += offset.length

          const maxCirBlockSpan = 4 + cirBlockSize * 32 // Upper bound on size, based on a completely full leaf node.
          let spans = new Range(offset[0], offset[0] + maxCirBlockSpan)
          for (let i = 1; i < offset.length; i += 1) {
            const blockSpan = new Range(offset[i], offset[i] + maxCirBlockSpan)
            spans = spans.union(blockSpan)
          }
          spans.getRanges().map((fr: Range) => cirFobStartFetch(offset, fr, level))
        } catch (e) {
          observer.error(e)
        }
      }

      cirFobRecur2 = (cirBlockData: Buffer, offset: number, level: number): void => {
        try {
          const data = cirBlockData.slice(offset)

          const p = this.leafParser.parse(data).result
          if (p.blocksToFetch) {
            blocksToFetch = blocksToFetch.concat(
              p.blocksToFetch
                .filter(filterFeats)
                .map((l: any): any => ({ offset: l.blockOffset, length: l.blockSize })),
            )
          }
          if (p.recurOffsets) {
            const recurOffsets = p.recurOffsets.filter(filterFeats).map((l: any): any => l.blockOffset)
            if (recurOffsets.length > 0) {
              cirFobRecur(recurOffsets, level + 1)
            }
          }
        } catch (e) {
          observer.error(e)
        }
      }

      return cirFobRecur([cirTreeOffset + 48], 1)
    } catch (e) {
      observer.error(e)
    }
  }

  private parseSummaryBlock(data: Buffer, startOffset: number, request?: CoordRequest): Feature[] {
    const features = []
    let currOffset = startOffset
    while (currOffset < data.byteLength) {
      const res = this.summaryParser.parse(data.slice(currOffset))
      features.push(res.result)
      currOffset += res.offset
    }
    let items = features
    if (request) items = items.filter((elt: SummaryBlock): boolean => elt.chromId === request.chrId)
    items = items.map(
      (elt: SummaryBlock): Feature => ({
        start: elt.start,
        end: elt.end,
        maxScore: elt.maxScore,
        minScore: elt.minScore,
        score: elt.sumData / (elt.validCnt || 1),
        summary: true,
      }),
    )
    return request ? items.filter(f => BlockView.coordFilter(f, request)) : items
  }

  private parseBigBedBlock(data: Buffer, startOffset: number, offset: number, request?: CoordRequest): Feature[] {
    const items = []
    let currOffset = startOffset
    while (currOffset < data.byteLength) {
      const res = this.bigBedParser.parse(data.slice(currOffset))
      res.result.uniqueId = `bb-${offset + currOffset}`
      items.push(res.result)
      currOffset += res.offset
    }

    return request ? items.filter((f: any) => BlockView.coordFilter(f, request)) : items
  }

  private parseBigWigBlock(bytes: Buffer, startOffset: number, request?: CoordRequest): Feature[] {
    const data = bytes.slice(startOffset)
    const results = this.bigWigParser.parse(data).result
    const { items, itemSpan, itemStep, blockStart, blockType } = results
    if (blockType === BIG_WIG_TYPE_FSTEP) {
      for (let i = 0; i < items.length; i++) {
        items[i].start = blockStart + i * itemStep
        items[i].end = blockStart + i * itemStep + itemSpan
      }
    } else if (blockType === BIG_WIG_TYPE_VSTEP) {
      for (let i = 0; i < items.length; i++) {
        items[i].end = items[i].start + itemSpan
      }
    }
    return request ? items.filter((f: any) => BlockView.coordFilter(f, request)) : items
  }

  private static coordFilter(f: Feature, range: CoordRequest): boolean {
    return f.start < range.end && f.end >= range.start
  }

  public async readFeatures(observer: Observer<Feature[]>, blocks: any, opts: Options = {}): Promise<void> {
    try {
      const { blockType, isCompressed } = this
      const { signal, request } = opts
      const blockGroupsToFetch = groupBlocks(blocks)
      checkAbortSignal(signal)
      await Promise.all(
        blockGroupsToFetch.map(async (blockGroup: any) => {
          checkAbortSignal(signal)
          const { length, offset } = blockGroup
          const data = await this.featureCache.get(`${length}_${offset}`, blockGroup, signal)
          blockGroup.blocks.forEach((block: any) => {
            checkAbortSignal(signal)
            let blockOffset = block.offset - blockGroup.offset
            let resultData = data
            if (isCompressed) {
              resultData = zlib.inflateSync(data.slice(blockOffset))
              blockOffset = 0
            }
            checkAbortSignal(signal)

            switch (blockType) {
              case 'summary':
                observer.next(this.parseSummaryBlock(resultData, blockOffset, request))
                break
              case 'bigwig':
                observer.next(this.parseBigWigBlock(resultData, blockOffset, request))
                break
              case 'bigbed':
                // eslint-disable-next-line no-bitwise
                observer.next(this.parseBigBedBlock(resultData, blockOffset, block.offset * (1 << 8), request))
                break
              default:
                console.warn(`Don't know what to do with ${blockType}`)
            }
          })
        }),
      )
      observer.complete()
    } catch (e) {
      observer.error(e)
    }
  }
}
