import { Parser } from '@gmod/binary-parser'
import { Observable, Observer } from 'rxjs'
import BBI from './bbi'

interface Loc {
  key: string
  offset: number
  length: number
}
interface SearchOptions {
  signal?: AbortSignal
}
interface Index {
  type: number
  fieldcount: number
  offset: number
  field: number
}
export default class BigBed extends BBI {
  public readIndices: (abortSignal?: AbortSignal) => Promise<Index[]>

  public constructor(opts: any) {
    super(opts)
    this.readIndices = this.headerCache.abortableMemoize(this._readIndices.bind(this))
  }

  public async _readIndices(abortSignal?: AbortSignal): Promise<Index[]> {
    const { extHeaderOffset, isBigEndian } = await this.getHeader(abortSignal)
    const data = Buffer.alloc(64)
    await this.bbi.read(data, 0, 64, extHeaderOffset)
    const le = isBigEndian ? 'big' : 'little'
    const ret = new Parser()
      .endianess(le)
      .uint16('size')
      .uint16('count')
      .uint64('offset')
      .parse(data).result
    const { count, offset } = ret

    // no extra index is defined if count==0
    if (ret.count === 0) {
      return []
    }
    const len = count * 20
    const buf = Buffer.alloc(len)
    await this.bbi.read(buf, 0, len, offset)
    const extParser = new Parser()
      .endianess(le)
      .int16('type')
      .int16('fieldcount')
      .uint64('offset')
      .skip(4)
      .int16('field')
    const indices = []

    for (let i = 0; i < count; i += 1) {
      indices.push(extParser.parse(buf.slice(i * 20)).result)
    }
    return indices
  }

  public async lookup(name: string, opts: SearchOptions = {}): Promise<Loc | undefined> {
    const { signal } = opts
    const { isBigEndian } = await this.getHeader(signal)
    const indices = await this.readIndices(signal)
    if (!indices.length) {
      return undefined
    }
    const { offset } = indices[0]
    const data = Buffer.alloc(32)

    await this.bbi.read(data, 0, 32, offset, { signal })
    const p = new Parser()
      .endianess(isBigEndian ? 'big' : 'little')
      .int32('magic')
      .int32('blockSize')
      .int32('keySize')
      .int32('valSize')
      .uint64('itemCount')

    const {blockSize,keySize,valSize} = p.parse(data).result
    const bpt = new Parser()
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
    const rootNodeOffset = 32

    const bptReadNode = async (nodeOffset: number): Promise<Loc | undefined> => {
      const len = 4 + blockSize * (keySize + valSize)
      const buf = Buffer.alloc(len)
      await this.bbi.read(buf, 0, len, nodeOffset, { signal })
      const node = bpt.parse(buf).result
      if (node.leafkeys) {
        let lastOffset
        for (let i = 0; i < node.leafkeys.length; i+=1) {
          const { key } = node.leafkeys[i]
          if (name.localeCompare(key) < 0 && lastOffset) {
            return bptReadNode(lastOffset)
          }
          lastOffset = node.leafkeys[i].offset
        }
        return bptReadNode(lastOffset)
      }
      for (let i = 0; i < node.keys.length; i+=1) {
        if (node.keys[i].key === name) {
          return node.keys[i]
        }
      }

      return undefined
    }
    return bptReadNode(offset + rootNodeOffset)
  }

  public async findFeat(name: string, opts: SearchOptions = {}): Promise<Feature[]> {
    const ret = await this.lookup(name, opts)
    if (!ret) return []
    const view = await this.getUnzoomedView()
    const ob = new Observable((observer: Observer<Feature[]>) => {
      view.readFeatures(observer, [ret], opts)
    })
    const res = await ob.toPromise()
    return res.filter(f => (f.rest || '').startsWith(name))
  }
}
