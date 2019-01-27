import Window from './window'

const LRU = require('quick-lru')
const { Parser } = require('@gmod/binary-parser')
const Long = require('long')
const LocalFile = require('./localFile')

const BIG_WIG_MAGIC = -2003829722
const BIG_BED_MAGIC = -2021002517

export default class BBIFile {
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
    this.gotHeader = this.getHeader()
  }

  // mutates obj for keys ending with '64' to longs, and removes the '64' suffix
  /* eslint no-param-reassign: ["error", { "props": false }] */
  convert64Bits(obj) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i]
      const val = obj[key]
      if (key.endsWith('64')) {
        obj[key.slice(0, -2)] = Long.fromBytes(
          val,
          false,
          !this.isBigEndian,
        ).toNumber()
        delete obj[key]
      } else if (typeof obj[key] === 'object' && val !== null) {
        this.convert64Bits(val)
      }
    }
  }

  async getHeader() {
    if (this.header) {
      return this.header
    }
    const ret = await this.getParsers()
    const buf = Buffer.alloc(2000)
    await this.bbi.read(buf, 0, 2000, 0)
    const res = ret.headerParser.parse(buf)

    const header = res.result
    this.convert64Bits(header)
    this.type = header.magic === BIG_BED_MAGIC ? 'bigbed' : 'bigwig'

    if (header.asOffset) {
      header.autoSql = buf
        .slice(header.asOffset, buf.indexOf(0, header.asOffset))
        .toString('utf8')
    }
    if (header.totalSummaryOffset) {
      const tail = buf.slice(header.totalSummaryOffset)
      header.totalSummary = ret.totalSummaryParser.parse(tail).result
      this.convert64Bits(header.totalSummary)
    }
    const chroms = await this.readChromTree(header)
    Object.assign(header, chroms)
    this.header = header
    return header
  }

  async detectEndianness() {
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

  async getParsers() {
    await this.detectEndianness()

    const le = this.isBigEndian ? 'big' : 'little'
    const headerParser = new Parser()
      .endianess(le)
      .int32('magic')
      .uint16('version')
      .uint16('numZoomLevels')
      .buffer('chromTreeOffset64', { length: 8 })
      .buffer('unzoomedDataOffset64', { length: 8 })
      .buffer('unzoomedIndexOffset64', { length: 8 })
      .uint16('fieldCount')
      .uint16('definedFieldCount')
      .buffer('asOffset64', { length: 8 })
      .buffer('totalSummaryOffset64', { length: 8 })
      .uint32('uncompressBufSize')
      .skip(8) // reserved
      .array('zoomLevels', {
        length: 'numZoomLevels',
        type: new Parser()
          .uint32('reductionLevel')
          .uint32('reserved')
          .buffer('dataOffset64', { length: 8 })
          .buffer('indexOffset64', { length: 8 }),
      })

    const totalSummaryParser = new Parser()
      .endianess(le)
      .buffer('basesCovered64', { length: 8 })
      .double('scoreMin')
      .double('scoreMax')
      .double('scoreSum')
      .double('scoreSumSquares')

    /* istanbul ignore next */
    const chromTreeParser = new Parser()
      .endianess(le)
      .uint32('magic', { assert: s => s === 2026540177 })
      .uint32('blockSize')
      .uint32('keySize')
      .uint32('valSize')
      .buffer('itemCount64', { length: 8 })

    return {
      chromTreeParser,
      totalSummaryParser,
      headerParser,
    }
  }

  async readChromTree(header) {
    const refsByNumber = {}
    const refsByName = {}

    let unzoomedDataOffset = header.unzoomedDataOffset
    while (unzoomedDataOffset % 4 !== 0) {
      unzoomedDataOffset += 1
    }

    const data = Buffer.alloc(unzoomedDataOffset - header.chromTreeOffset)
    await this.bbi.read(
      data,
      0,
      unzoomedDataOffset - header.chromTreeOffset,
      header.chromTreeOffset,
    )

    const p = await this.getParsers()
    const ret = p.chromTreeParser.parse(data).result
    this.convert64Bits(ret)

    const rootNodeOffset = 32
    const bptReadNode = currentOffset => {
      let offset = currentOffset
      if (offset >= data.length) throw new Error('reading beyond end of buffer')
      const isLeafNode = data.readUInt8(offset)
      const cnt = data.readUInt16LE(offset + 2)
      // dlog('ReadNode: ' + offset + '     type=' + isLeafNode + '   count=' + cnt);
      offset += 4
      for (let n = 0; n < cnt; n += 1) {
        if (isLeafNode) {
          // parse leaf node
          let key = ''
          for (let ki = 0; ki < ret.keySize; ki += 1, offset += 1) {
            const charCode = data.readUInt8(offset)
            if (charCode !== 0) {
              key += String.fromCharCode(charCode)
            }
          }
          const refId = data.readUInt32LE(offset)
          const refSize = data.readUInt32LE(offset + 4)
          offset += 8

          const refRec = { name: key, id: refId, length: refSize }

          // dlog(key + ':' + refId + ',' + refSize);
          refsByName[key] = refRec
          refsByNumber[refId] = refRec
        } else {
          // parse index node
          offset += ret.keySize
          let childOffset = Long.fromBytes(offset).toNumber()
          offset += 8
          childOffset -= header.chromTreeOffset
          bptReadNode(childOffset)
        }
      }
    }
    bptReadNode(rootNodeOffset)
    return {
      refsByName,
      refsByNumber,
    }
  }

  getView(scale) {
    const header = this.header
    if (!header.zoomLevels || !header.zoomLevels.length) return null

    if (!this.viewCache || this.viewCache.scale !== scale) {
      this.viewCache = {
        scale,
        view: this.getViewHelper(scale),
      }
    }
    return this.viewCache.view
  }

  getViewHelper(scale) {
    const header = this.header
    const basesPerPx = 1 / scale
    // console.log('getting view for '+basesPerSpan+' bases per span');
    let maxLevel = header.zoomLevels.length
    if (!header.fileSize) {
      // if we don't know the file size, we can't fetch the highest zoom level :-(
      maxLevel -= 1
    }

    for (let i = maxLevel; i > 0; i -= 1) {
      const zh = header.zoomLevels[i]
      if (zh && zh.reductionLevel <= 2 * basesPerPx) {
        const indexLength =
          i < header.zoomLevels.length - 1
            ? header.zoomLevels[i + 1].dataOffset - zh.indexOffset
            : header.fileSize - 4 - zh.indexOffset
        // console.log( 'using zoom level '+i);
        return new Window(this, zh.indexOffset, indexLength, true)
      }
    }
    return this.getUnzoomedView()
  }

  getUnzoomedView() {
    const header = this.header
    if (!this.unzoomedView) {
      let cirLen = 4000
      const nzl = header.zoomLevels[0]
      if (nzl) {
        cirLen = nzl.dataOffset - header.unzoomedIndexOffset
      }
      this.unzoomedView = new Window(
        this,
        header.unzoomedIndexOffset,
        cirLen,
        false,
        this.autoSql,
      )
    }
    return this.unzoomedView
  }
}
