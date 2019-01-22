/* eslint no-bitwise: ["error", { "allow": ["|"] }] */

const unzip = require('./unzip')
const Range = require('./range')
// const BED = require('@gmod/bed')

const BIG_WIG_TYPE_GRAPH = 1
const BIG_WIG_TYPE_VSTEP = 2
const BIG_WIG_TYPE_FSTEP = 3

export default class RequestWorker {
  /**
   * Worker object for reading data from a bigwig or bigbed file.
   * Manages the state necessary for traversing the index trees and
   * so forth.
   *
   * Adapted by Robert Buels from bigwig.js in the Dalliance Genome
   * Explorer by Thomas Down.
   * @constructs
   */
  constructor(win, chr, min, max) {
    this.window = win
    this.source = win.bwg.name || undefined

    this.blocksToFetch = []
    this.outstanding = 0

    this.chr = chr
    this.min = min
    this.max = max
  }

  cirFobRecur(offset, level) {
    this.outstanding += offset.length

    const maxCirBlockSpan = 4 + this.window.cirBlockSize * 32 // Upper bound on size, based on a completely full leaf node.
    let spans
    for (let i = 0; i < offset.length; i += 1) {
      const blockSpan = new Range(offset[i], offset[i] + maxCirBlockSpan)
      spans = spans ? spans.union(blockSpan) : blockSpan
    }

    const fetchRanges = spans.ranges()
    // dlog('fetchRanges: ' + fetchRanges);
    for (let r = 0; r < fetchRanges.length; r += 1) {
      const fr = fetchRanges[r]
      this.cirFobStartFetch(offset, fr, level)
    }
  }

  cirFobStartFetch(offset, fr, level) {
    const length = fr.max() - fr.min()
    // dlog('fetching ' + fr.min() + '-' + fr.max() + ' (' + Util.humanReadableNumber(length) + ')');
    // console.log('cirfobstartfetch');
    this.window.bwg.read(
      fr.min(),
      length,
      resultBuffer => {
        for (let i = 0; i < offset.length; i += 1) {
          if (fr.contains(offset[i])) {
            this.cirFobRecur2(resultBuffer, offset[i] - fr.min(), level)
            this.outstanding -= 1
            if (this.outstanding === 0) {
              this.cirCompleted()
            }
          }
        }
      },
      this.errorCallback,
    )
  }

  cirFobRecur2(cirBlockData, offset, level) {
    const data = this.window.bwg.newDataView(cirBlockData, offset)

    const isLeaf = data.getUint8()
    const cnt = data.getUint16(2)
    // dlog('cir level=' + level + '; cnt=' + cnt);

    if (isLeaf !== 0) {
      for (let i = 0; i < cnt; i += 1) {
        const startChrom = data.getUint32()
        const startBase = data.getUint32()
        const endChrom = data.getUint32()
        const endBase = data.getUint32()
        const blockOffset = data.getUint64()
        const blockSize = data.getUint64()
        if (
          (startChrom < this.chr ||
            (startChrom === this.chr && startBase <= this.max)) &&
          (endChrom > this.chr ||
            (endChrom === this.chr && endBase >= this.min))
        ) {
          // dlog('Got an interesting block: startBase=' + startBase + '; endBase=' + endBase + '; offset=' + blockOffset + '; size=' + blockSize);
          this.blocksToFetch.push({ offset: blockOffset, size: blockSize })
        }
      }
    } else {
      const recurOffsets = []
      for (let i = 0; i < cnt; i += 1) {
        const startChrom = data.getUint32()
        const startBase = data.getUint32()
        const endChrom = data.getUint32()
        const endBase = data.getUint32()
        const blockOffset = data.getUint64()
        if (
          (startChrom < this.chr ||
            (startChrom === this.chr && startBase <= this.max)) &&
          (endChrom > this.chr ||
            (endChrom === this.chr && endBase >= this.min))
        ) {
          recurOffsets.push(blockOffset)
        }
      }
      if (recurOffsets.length > 0) {
        this.cirFobRecur(recurOffsets, level + 1)
      }
    }
  }

  cirCompleted() {
    // merge contiguous blocks
    this.blockGroupsToFetch = this.groupBlocks(this.blocksToFetch)

    if (this.blockGroupsToFetch.length === 0) {
      this.callback([])
    } else {
      this.features = []
      this.readFeatures()
    }
  }

  static groupBlocks(blocks) {
    // sort the blocks by file offset
    blocks.sort((b0, b1) => (b0.offset | 0) - (b1.offset | 0))

    // group blocks that are within 2KB of eachother
    const blockGroups = []
    let lastBlock
    let lastBlockEnd
    for (let i = 0; i < blocks.length; i += 1) {
      if (lastBlock && blocks[i].offset - lastBlockEnd <= 2000) {
        lastBlock.size += blocks[i].size - lastBlockEnd + blocks[i].offset
        lastBlock.blocks.push(blocks[i])
      } else {
        blockGroups.push(
          (lastBlock = {
            blocks: [blocks[i]],
            size: blocks[i].size,
            offset: blocks[i].offset,
          }),
        )
      }
      lastBlockEnd = lastBlock.offset + lastBlock.size
    }

    return blockGroups
  }

  createFeature(fmin, fmax, opts) {
    // dlog('createFeature(' + fmin +', ' + fmax + ', '+opts.score+')');

    const data = Object.assign(
      {
        start: fmin,
        end: fmax,
      },
      opts,
    )

    // const id = data.id
    delete data.id

    const f = data
    this.features.push(f)
  }

  maybeCreateFeature(fmin, fmax, opts) {
    if (fmin <= this.max && fmax >= this.min) {
      this.createFeature(fmin, fmax, opts)
    }
  }

  parseSummaryBlock(bytes, startOffset) {
    const data = this.window.bwg.newDataView(bytes, startOffset)

    const itemCount = bytes.byteLength / 32
    for (let i = 0; i < itemCount; i += 1) {
      const chromId = data.getInt32()
      const start = data.getInt32()
      const end = data.getInt32()
      const validCnt = data.getInt32() || 1
      const minVal = data.getFloat32()
      const maxVal = data.getFloat32()
      const sumData = data.getFloat32()
      const sumSqData = data.getFloat32()

      if (chromId === this.chr) {
        const summaryOpts = {
          score: sumData / validCnt,
          sumSqData,
          maxScore: maxVal,
          minScore: minVal,
        }
        if (this.window.bwg.type === 'bigbed') {
          summaryOpts.type = 'density'
        }
        this.maybeCreateFeature(start, end, summaryOpts)
      }
    }
  }

  parseBigWigBlock(bytes, startOffset) {
    const data = this.window.bwg.newDataView(bytes, startOffset)

    const itemSpan = data.getUint32(16)
    const blockType = data.getUint8(20)
    const itemCount = data.getUint16(22)

    // dlog('processing bigwig block, type=' + blockType + '; count=' + itemCount);

    if (blockType === BIG_WIG_TYPE_FSTEP) {
      const blockStart = data.getInt32(4)
      const itemStep = data.getUint32(12)
      for (let i = 0; i < itemCount; i += 1) {
        const score = data.getFloat32(4 * i + 24)
        this.maybeCreateFeature(
          blockStart + i * itemStep,
          blockStart + i * itemStep + itemSpan,
          { score },
        )
      }
    } else if (blockType === BIG_WIG_TYPE_VSTEP) {
      for (let i = 0; i < itemCount; i += 1) {
        const start = data.getInt32(8 * i + 24)
        const score = data.getFloat32()
        this.maybeCreateFeature(start, start + itemSpan, { score })
      }
    } else if (blockType === BIG_WIG_TYPE_GRAPH) {
      for (let i = 0; i < itemCount; i += 1) {
        let start = data.getInt32(12 * i + 24)
        const end = data.getInt32()
        const score = data.getFloat32()
        if (start > end) {
          start = end
        }
        this.maybeCreateFeature(start, end, { score })
      }
    } else {
      console.warn(`Currently not handling bwgType=${blockType}`)
    }
  }

  // parseBigBedBlock(bytes, startOffset) {
  //   const data = this.window.bwg.newDataView(bytes, startOffset)

  //   let offset = 0
  //   while (offset < bytes.byteLength) {
  //     const chromId = data.getUint32(offset)
  //     const start = data.getInt32(offset + 4)
  //     const end = data.getInt32(offset + 8)
  //     offset += 12
  //     if (chromId !== this.chr) {
  //       console.warn('BigBed block is out of current range')
  //       return
  //     }

  //     let rest = ''
  //     while (offset < bytes.byteLength) {
  //       const ch = data.getUint8(offset)
  //       offset += 1
  //       if (ch !== 0) {
  //         rest += String.fromCharCode(ch)
  //       } else {
  //         break
  //       }
  //     }

  //     const featureData = this.parseBedText(start, end, rest)
  //     featureData.id = `bb-${startOffset + offset}`
  //     this.maybeCreateFeature(start, end, featureData)
  //   }
  // }

  /**
   * parse the `rest` field of a binary bed data section, using
   * the autosql schema defined for this file
   *
   * @returns {Object} feature data with native BED field names
   */
  // parseBedText(start, end, rest) {
  //   // include ucsc-style names as well as jbrowse-style names
  //   const featureData = {
  //     start,
  //     end,
  //   }

  //   const bedColumns = rest.split('\t')
  //   const asql = this.window.autoSql
  //   const numericTypes = ['uint', 'int', 'float', 'long']
  //   // first three columns (chrom,start,end) are not included in bigBed
  //   for (let i = 3; i < asql.fields.length; i++) {
  //     if (bedColumns[i - 3] !== '.' && bedColumns[i - 3] !== '') {
  //       const autoField = asql.fields[i]
  //       let columnVal = bedColumns[i - 3]

  //       // for speed, cache some of the tests we need inside the autofield definition
  //       if (!autoField._requestWorkerCache) {
  //         const match = /^(\w+)\[/.exec(autoField.type)
  //         autoField._requestWorkerCache = {
  //           isNumeric: numericTypes.includes(autoField.type),
  //           isArray: !!match,
  //           arrayIsNumeric: match && numericTypes.includes(match[1]),
  //         }
  //       }

  //       if (autoField._requestWorkerCache.isNumeric) {
  //         const num = Number(columnVal)
  //         // if the number parse results in NaN, somebody probably
  //         // listed the type erroneously as numeric, so don't use
  //         // the parsed number
  //         columnVal = Number.isNaN(num) ? columnVal : num
  //       } else if (autoField._requestWorkerCache.isArray) {
  //         // parse array values
  //         columnVal = columnVal.split(',')
  //         if (columnVal[columnVal.length - 1] === '') columnVal.pop()
  //         if (autoField._requestWorkerCache.arrayIsNumeric)
  //           columnVal = columnVal.map(str => Number(str))
  //       }

  //       featureData[snakeCase(autoField.name)] = columnVal
  //     }
  //   }

  //   if (featureData.strand) {
  //     featureData.strand = { '-': -1, '+': 1 }[featureData.strand]
  //   }

  //   return featureData
  // }

  async readFeatures() {
    const blockFetches = this.blockGroupsToFetch.map(blockGroup => {
      const data = Buffer.unsafeAlloc(blockGroup.size)
      return this.window.bwg.read(data, 0, blockGroup.size, blockGroup.offset)
    })

    const blockGroups = await Promise.all(blockFetches)
    blockGroups.forEach(blockGroup => {
      blockGroup.blocks.forEach(block => {
        let data
        let offset = block.offset - blockGroup.offset
        if (this.window.bwg.uncompressBufSize > 0) {
          // var beforeInf = new Date();
          data = unzip(blockGroup.data.slice(offset + 2, block.size - 2))
          offset = 0
          // console.log( 'inflate', 2, block.size - 2);
          // var afterInf = new Date();
          // dlog('inflate: ' + (afterInf - beforeInf) + 'ms');
        } else {
          // eslint-disable-next-line
          data = blockGroup.data
        }

        if (this.window.isSummary) {
          this.parseSummaryBlock(data, offset)
        } else if (this.window.bwg.type === 'bigwig') {
          this.parseBigWigBlock(data, offset)
        } else if (this.window.bwg.type === 'bigbed') {
          // this.parseBigBedBlock(data, offset)
        } else {
          console.warn(`Don't know what to do with ${this.window.bwg.type}`)
        }
      })
    })

    return this.features
  }
}
