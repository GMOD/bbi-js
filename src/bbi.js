const LRU = require('quick-lru')
const Parser = require('@gmod/binary-parser')

const LocalFile = require('./localFile')

const BIG_WIG_MAGIC = -2003829722
const BIG_BED_MAGIC = -2021002517
const BIG_WIG_TYPE_GRAPH = 1
const BIG_WIG_TYPE_VSTEP = 2
const BIG_WIG_TYPE_FSTEP = 3

class BBIFile {
  constructor({
    bbiFilehandle,
    bbiPath,
    cacheSize,
    fetchSizeLimit,
    chunkSizeLimit,
    renameRefSeqs = n => n,
  }) {
    this.renameRefSeq = renameRefSeqs

    if (bbiFilehandle) {
      this.bbi = bbiFilehandle
    } else if (bbiPath) {
      this.bbi = new LocalFile(bbiPath)
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
    this._read(0, 2000, bytes => {
      p.parse(bytes)
      if (!bytes) {
        this._failAllDeferred('BBI header not readable')
      }
    })
  }
}

module.exports = BBIFile
