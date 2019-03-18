import RequestWorker from './requestWorker'

const LRU = require('quick-lru')

export default class Window {
  /**
   * View into a subset of the data in a BigWig file.
   *
   * Adapted by Robert Buels from bigwig.js in the Dalliance Genome
   * Explorer by Thomas Down.
   * @constructs
   */
  constructor(bwg, cirTreeOffset, cirTreeLength, isSummary, autoSql) {
    this.bwg = bwg
    this.autoSql = autoSql
    if (!(cirTreeOffset >= 0)) throw new Error('invalid cirTreeOffset!')
    if (!(cirTreeLength > 0)) throw new Error('invalid cirTreeLength!')

    this.cirTreeOffset = cirTreeOffset
    this.cirTreeLength = cirTreeLength
    this.isSummary = isSummary
    this.featureCache = new LRU({
      maxSize: 500000, // cache up to 50000 features and subfeatures
    })
  }

  readWigData(chrName, min, max) {
    const chr = this.bwg.header.refsByName[chrName]
    if (!chr) {
      return []
    }
    return this.readWigDataByIdWithCache(chr.id, min, max)
  }

  readWigDataByIdWithCache(chr, min, max) {
    let ret = this.featureCache.get([chr, min, max])
    if (!ret) {
      ret = this.readWigDataById(chr, min, max)
      this.featureCache.set([chr, min, max], ret)
    }
    return ret
  }

  async readWigDataById(chr, min, max) {
    const buffer = Buffer.alloc(48)
    await this.bwg.bbi.read(buffer, 0, 48, this.cirTreeOffset).then(() => {
      this.cirBlockSize = buffer.readUInt32LE(4) // TODO big endian?
    })

    const worker = new RequestWorker(this, chr, min, max)
    return worker.cirFobRecur([this.cirTreeOffset + 48], 1)
  }
}
