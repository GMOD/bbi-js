const LRU = require('quick-lru')
const { Parser } = require('@gmod/binary-parser')

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
    const p = new Parser().string('magic', { length: 4 })
    const buf = Buffer.alloc(2000)
    const bytesRead = await this.bbi.read(buf, 0, 2000, 0)
    console.log(p.parse(buf))
  }
}

module.exports = BBIFile
