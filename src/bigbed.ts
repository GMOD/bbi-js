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
    const { size, count, offset } = ret
    // no extra index is defined if count==0
    if (ret.count === 0) {
      return undefined
    }
    const len = count * 20
    const buf = Buffer.alloc(len)
    await this.bbi.read(data, 0, len, offset)
    const extParser = new Parser()
      .endianess(le)
      .int16('type')
      .int16('fieldcount')
      .uint64('offset')
      .skip(4)
      .int16('field')
    this.indices = this.indices || []

    for (let i = 0; i < count; i += 1) {
      this.indices.push(extParser.parse(data.slice(i * 20)).result)
    }
  }

  public async lookup(name: string, opts: SearchOptions = {}) {
    const { signal } = opts
    const { isBigEndian } = await this.getHeader(signal)
    if (!this.indices.length) return undefined
    const { offset } = this.indices[0]
    const data = Buffer.alloc(32)

    await this.bbi.read(data, 0, 32, offset, { signal })
    const p = new Parser()
      .endianess(isBigEndian ? 'big' : 'little')
      .int32('magic')
      .int32('blockSize')
      .int32('keySize')
      .int32('valSize')
      .uint64('itemCount')
    const ret = p.parse(data).result
    const { blockSize, keySize, valSize } = ret

    var rootNodeOffset = 32

    const bptReadNode = async (nodeOffset: number) => {
      const len = 4 + blockSize * (keySize + valSize)
      const data = Buffer.alloc(len)

      await this.bbi.read(data, 0, len, nodeOffset, { signal })

      const p = new Parser()
        .endianess(isBigEndian ? 'big' : 'little')
        .int8('nodeType')
        .skip(1)
        .int16('cnt')
        .choice({
          tag: 'nodeType',
          choices: {
            0: new Parser().array('leafkeys', {
              length: 'cnt',
              type: new Parser().string('key', { length: keySize, stripNull: true }).uint64('offset'),
            }),
            1: new Parser().array('keys', {
              length: 'cnt',
              type: new Parser()
                .string('key', { length: keySize, stripNull: true })
                .uint64('offset')
                .uint32('length')
                .uint32('reserved'),
            }),
          },
        })
      const node = p.parse(data).result
      if (node.leafkeys) {
        let lastOffset
        for (let i = 0; i < node.leafkeys.length; i++) {
          const key = node.leafkeys[i].key
          if (name.localeCompare(key) < 0 && lastOffset) {
            return bptReadNode(lastOffset)
            return
          }
          lastOffset = node.leafkeys[i].offset
        }
        return bptReadNode(lastOffset)
      } else {
        let lastOffset
        for (let i = 0; i < node.keys.length; i++) {
          const key = node.keys[i].key

          if (key == name) {
            return node.keys[i]
            const view = await this.getUnzoomedView()
            return view.readFeatures([{ offset: start, size: length }], callback)
          }
        }
      }
    }
    return bptReadNode(offset + rootNodeOffset)
  }
}
