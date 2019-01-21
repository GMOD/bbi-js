const LRU = require('quick-lru')
const { Parser } = require('@gmod/binary-parser')
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

    this.featureCache = new LRU({
      maxSize: cacheSize !== undefined ? cacheSize : 20000,
      length: featureArray => featureArray.length,
    })

    this.fetchSizeLimit = fetchSizeLimit || 50000000
    this.chunkSizeLimit = chunkSizeLimit || 10000000
  }

  async getHeader() {
    const ret = await this._getParsers()
    const buf = Buffer.alloc(2000)
    await this.bbi.read(buf, 0, 2000, 0)
    var m = ret.parse(buf).result
    for(const i in m) {
      if(i.endsWith('64')) {
        m[i] = Long.fromBytes(m[i], false, !this.isBigEndian).toNumber()
      }
    }
    console.log(m)
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
      .buffer('chromTreeOffset64', {
        length: 8,
      })
      .buffer('unzoomedDataOffset64', {
        length: 8,
      })
      .buffer('unzoomedIndexOffset64', {
        length: 8,
      })
      .uint16('fieldCount')
      .uint16('definedFieldCount')
      .buffer('asOffset64', {
        length: 8,
      })
      .buffer('totalSummaryOffset64', {
        length: 8,
      })
      .uint32('uncompressBufSize64')
  }
}

module.exports = BBIFile
