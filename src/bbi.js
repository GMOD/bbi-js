const LRU = require('quick-lru')
const {Parser} = require('@gmod/binary-parser')
const Long = require('long')
const LocalFile = require('./localFile')

const BIG_WIG_MAGIC = -2003829722
const BIG_BED_MAGIC = -2021002517
const BIG_WIG_TYPE_GRAPH = 1
const BIG_WIG_TYPE_VSTEP = 2
const BIG_WIG_TYPE_FSTEP = 3

class BBIFile {
  constructor({
    filehandle,
    path,
    cacheSize,
    fetchSizeLimit,
    chunkSizeLimit,
    renameRefSeqs = n => n,
  }) {
    this.renameRefSeq = renameRefSeqs

    if (filehandle) {
      this.bbi = filehandle
    } else if (path) {
      this.bbi = new LocalFile(path)
    } else {
      throw new Error('no file given')
    }
    this.endianess = 'little'

    this.featureCache = new LRU({
      maxSize: cacheSize !== undefined ? cacheSize : 20000,
      length: featureArray => featureArray.length,
    })

    this.fetchSizeLimit = fetchSizeLimit || 50000000
    this.chunkSizeLimit = chunkSizeLimit || 10000000
  }

  async getHeader() {
    var ret = await this._getParsers()
    console.log(ret)
    const buf = Buffer.alloc(2000)
    await this.bbi.read(buf, 0, 2000, 0)
    return ret.parse(buf)
    // var de = buf.buffer.slice(0)
    // var data = new DataView(de)
    // var magic = data.getInt32()
    // if (res.magic !== BIG_WIG_MAGIC && res.magic !== BIG_BED_MAGIC) {
    // // let res = p.parse(buf).result || {}
    //   p = new Parser().endianess('big').int32('magic')
    //   res = p.parse(buf).result || {}
    //   if (res.magic !== BIG_WIG_MAGIC && res.magic !== BIG_BED_MAGIC) {
    //     throw new Error('Not a BigWig or BigBed file')
    //   }
    //   this.endianess = 'big'
    // }
    // this.type = res.magic === BIG_BED_MAGIC ? 'bigbed' : 'bigwig'
    // let le = this.endianess === 'little'

    // console.log(p.parse(buf))
  }

  async _detectEndianness() {
    const buf = Buffer.allocUnsafe(4)
    await this.bbi.read(buf, 0, 4, 0)
    let ret = buf.readInt32LE(0)
    if (ret === BIG_WIG_MAGIC || ret === BIG_BED_MAGIC) {
      this.isBigEndian = false
      return
    }
    ret = buf.readInt32BE(0)
    if (ret === BIG_WIG_MAGIC || ret === BIG_BED_MAGIC) {
      this.isBigEndian = true
      return
    }
    throw new Error('not a BigWig/BigBed file')
  }

  async _getParsers() {
    await this._detectEndianness()

    const le = this.isBigEndian ? 'big' : 'little'
    const lebe = this.isBigEndian ? 'be' : 'le'
    return new Parser()
      .endianess(le)
      .int32('magic')
      .uint16('version')
      .uint16('numZoomLevels')
      .buffer('chromTreeOffset', {
        length: 8
      })
      .buffer('unzoomedDataOffset', {
        length: 8
      })
      .buffer('unzoomedIndexOffset', {
        length: 8
      })
      .uint16('fieldCount')
      .uint16('definedFieldCount')
      .buffer('asOffset', {
        length: 8
      })
      .buffer('totalSummaryOffset', {
        length: 8
      })
      .uint32('uncompressBufSize')

//     let indexEntryParser = new Parser()
//       .endianess(endianess)
//       .uint8('nameLength')
//       .string('name', { length: 'nameLength' })
//     if (this.version === 1) {
//       indexEntryParser = indexEntryParser.buffer('offsetBytes', {
//         length: 8,
//       })
//     } else {
//       indexEntryParser = indexEntryParser.uint32('offset')
//     }
//     return {
//       header: new Parser()
//         .endianess(endianess)
//         .int32('magic', {
//           assert: m => m === 0x1a412743,
//         })
//         .int32('version', {
//           assert: v => v === 0 || v === 1,
//         })
//         .uint32('sequenceCount', {
//           assert: v => v >= 0,
//         })
//         .uint32('reserved'),
//       index: new Parser()
//         .endianess(endianess)
//         .uint32('sequenceCount')
//         .uint32('reserved')
//         .array('index', {
//           length: 'sequenceCount',
//           type: indexEntryParser,
//         }),
//       record1: new Parser()
//         .endianess(endianess)
//         .uint32('dnaSize')
//         .uint32('nBlockCount'),
//       record2: new Parser()
//         .endianess(endianess)
//         .uint32('nBlockCount')
//         .array('nBlockStarts', {
//           length: 'nBlockCount',
//           type: `uint32${lebe}`,
//         })
//         .array('nBlockSizes', {
//           length: 'nBlockCount',
//           type: `uint32${lebe}`,
//         })
//         .uint32('maskBlockCount'),
//       record3: new Parser()
//         .endianess(endianess)
//         .uint32('maskBlockCount')
//         .array('maskBlockStarts', {
//           length: 'maskBlockCount',
//           type: `uint32${lebe}`,
//         })
//         .array('maskBlockSizes', {
//           length: 'maskBlockCount',
//           type: `uint32${lebe}`,
//         })
//         .int32('reserved'),
//       // .buffer('packedDna', { length: 'dnaSize' }),
//     }
  }

}

module.exports = BBIFile
