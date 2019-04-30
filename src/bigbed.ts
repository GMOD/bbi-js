import { Parser } from '@gmod/binary-parser'
import BBI from './bbi'

interface SearchOptions {
  abortSignal?: AbortSignal
}

interface Index {
  type: number
  fieldcount: number
  offset: number
  field: number
}

export default class BigBed extends BBI {
  private indices: Index[] = []
  public async readIndices(abortSignal?: AbortSignal) {
    const { unzoomedDataOffset, chromTreeOffset, extHeaderOffset, isBigEndian } = await this.getHeader(abortSignal)
    const data = Buffer.alloc(64)
    const bytesRead = await this.bbi.read(data, 0, 64, extHeaderOffset)
    const le = isBigEndian ? 'big' : 'little'
    const ret = new Parser()
      .endianess(le)
      .uint16('size')
      .uint16('count')
      .uint64('offset')
      .parse(data).result
    //console.log(ret)
    const { size, count, offset } = ret
    // no extra index is defined if count==0
    if (ret.count === 0) {
      return undefined
    }
    const len = count * 20
    const buf = Buffer.alloc(len)
    await this.bbi.read(data, 0, offset, len)
    const extParser = new Parser()
      .endianess(le)
      .int16('type')
      .int16('fieldcount')
      .uint64('offset')
      .int16('field')
    this.indices = this.indices || []

    for (let i = 0; i < count; i += 1) {
      this.indices.push(extParser.parse(data.slice(i * 20)).result)
    }
  }
  public async lookup(name: string, opts: SearchOptions = {}) {
    const { abortSignal } = opts
    const { isBigEndian } = await this.getHeader(abortSignal)
    const { offset } = this.indices[0]
    const data = Buffer.alloc(32)

    await this.bbi.read(data, 0, offset, 32, { signal: abortSignal })
    const p = new Parser()
      .endianess(isBigEndian ? 'big' : 'little')
      .int32('magic')
      .int32('blockSize')
      .int32('keySize')
      .int32('valSize')
      .uint64('itemCount')
    const ret = p.parse(data).result
    console.log(ret)

    var rootNodeOffset = 32
  }

  //     const data2 = Buffer.alloc(unzoomedDataOffset - chromTreeOffset)
  //     await this.bbi.read(data2, 0, unzoomedDataOffset - chromTreeOffset, chromTreeOffset, { signal: abortSignal })

  //     const buf = data.slice(start, start + length)
  //     var unc = zlib.inflateSync(buf)
  //     console.log(unc)
  // 		console.log(bytesRead)
  //       var ba = new Uint8Array(bpt)
  //       var sa = new Int16Array(bpt)
  //       var la = new Int32Array(bpt)
  //       var bptMagic = la[0]
  //       var blockSize = la[1]
  //       var keySize = la[2]
  //       var valSize = la[3]
  //       var itemCount = bwg_readOffset(ba, 16)
  //       var rootNodeOffset = 32

  //       if (bptMagic != BPT_MAGIC) {
  //         return callback(null, 'Not a valid BPT, magic=0x' + bptMagic.toString(16))
  //       }

  //       function bptReadNode(nodeOffset) {
  //         thisB.data.slice(nodeOffset, 4 + blockSize * (keySize + valSize)).fetch(function(node) {
  //           var ba = new Uint8Array(node)
  //           var sa = new Uint16Array(node)
  //           var la = new Uint32Array(node)

  //           var nodeType = ba[0]
  //           var cnt = sa[1]

  //           var offset = 4
  //           if (nodeType == 0) {
  //             var lastChildOffset = null
  //             for (var n = 0; n < cnt; ++n) {
  //               var key = ''
  //               for (var ki = 0; ki < keySize; ++ki) {
  //                 var charCode = ba[offset++]
  //                 if (charCode != 0) {
  //                   key += String.fromCharCode(charCode)
  //                 }
  //               }

  //               var childOffset = readInt(ba, offset)
  //               offset += 8

  //               if (name.localeCompare(key) < 0 && lastChildOffset) {
  //                 bptReadNode(lastChildOffset)
  //                 return
  //               }
  //               lastChildOffset = childOffset
  //             }
  //             bptReadNode(lastChildOffset)
  //           } else {
  //             for (var n = 0; n < cnt; ++n) {
  //               var key = ''
  //               for (var ki = 0; ki < keySize; ++ki) {
  //                 var charCode = ba[offset++]
  //                 if (charCode != 0) {
  //                   key += String.fromCharCode(charCode)
  //                 }
  //               }

  //               if (key == name) {
  //                 return thisB.readValue(ba, offset, valSize, callback)
  //               }
  //               offset += valSize
  //             }
  //             return callback([])
  //           }
  //         })
  //       }

  //       bptReadNode(thisB.offset + rootNodeOffset)
  //     })
}
