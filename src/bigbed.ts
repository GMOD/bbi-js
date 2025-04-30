import AbortablePromiseCache from '@gmod/abortable-promise-cache'
import QuickLRU from 'quick-lru'
import { Observable, firstValueFrom, merge } from 'rxjs'
import { map, reduce } from 'rxjs/operators'

import { BBI } from './bbi.ts'

import type { Feature, RequestOptions } from './types.ts'

interface Loc {
  key: string
  offset: number
  length: number
  field?: number
}

interface Index {
  type: number
  fieldcount: number
  offset: number
  field: number
}

export function filterUndef<T>(ts: (T | undefined)[]): T[] {
  return ts.filter((t: T | undefined): t is T => !!t)
}

export class BigBed extends BBI {
  public readIndicesCache = new AbortablePromiseCache<RequestOptions, Index[]>({
    cache: new QuickLRU({ maxSize: 1 }),
    fill: (args: RequestOptions, signal?: AbortSignal) =>
      this._readIndices({ ...args, signal }),
  })

  public readIndices(opts: RequestOptions = {}) {
    const { signal, ...rest } = opts
    return this.readIndicesCache.get(JSON.stringify(rest), opts, signal)
  }

  /*
   * retrieve unzoomed view for any scale
   */
  protected async getView(_scale: number, opts?: RequestOptions) {
    return this.getUnzoomedView(opts)
  }

  /*
   * parse the bigbed extraIndex fields
   *
   *
   * @return a Promise for an array of Index data structure since there can be
   * multiple extraIndexes in a bigbed, see bedToBigBed documentation
   */
  private async _readIndices(opts: RequestOptions) {
    const { extHeaderOffset } = await this.getHeader(opts)
    const b = await this.bbi.read(64, Number(extHeaderOffset))

    const dataView = new DataView(b.buffer, b.byteOffset, b.length)
    let offset = 0
    // const _size = dataView.getUint16(offset, true)
    offset += 2
    const count = dataView.getUint16(offset, true)
    offset += 2
    const dataOffset = Number(dataView.getBigUint64(offset, true))
    offset += 8

    // no extra index is defined if count==0
    if (count === 0) {
      return []
    }

    const blocklen = 20
    const len = blocklen * count
    const buffer = await this.bbi.read(len, Number(dataOffset))

    const indices = [] as Index[]

    for (let i = 0; i < count; i += 1) {
      const b = buffer.subarray(i * blocklen)
      const dataView = new DataView(b.buffer, b.byteOffset, b.length)
      let offset = 0
      const type = dataView.getInt16(offset, true)
      offset += 2
      const fieldcount = dataView.getInt16(offset, true)
      offset += 2
      const dataOffset = Number(dataView.getBigUint64(offset, true))
      offset += 8 + 4 //4 skip
      const field = dataView.getInt16(offset, true)
      indices.push({ type, fieldcount, offset: Number(dataOffset), field })
    }
    return indices
  }

  /*
   * perform a search in the bigbed extraIndex to find which blocks in the
   * bigbed data to look for the actual feature data
   *
   * @param name - the name to search for
   *
   * @param opts - a SearchOptions argument with optional signal
   *
   * @return a Promise for an array of bigbed block Loc entries
   */
  private async searchExtraIndexBlocks(
    name: string,
    opts: RequestOptions = {},
  ): Promise<Loc[]> {
    const indices = await this.readIndices(opts)
    if (indices.length === 0) {
      return []
    }
    const decoder = new TextDecoder('utf8')
    const locs = indices.map(async index => {
      const { offset: offset2, field } = index
      const b = await this.bbi.read(32, offset2, opts)

      const dataView = new DataView(b.buffer, b.byteOffset, b.length)
      let offset = 0
      // const _magic = dataView.getInt32(offset, true)
      offset += 4
      const blockSize = dataView.getInt32(offset, true)
      offset += 4
      const keySize = dataView.getInt32(offset, true)
      offset += 4
      const valSize = dataView.getInt32(offset, true)
      offset += 4
      // const _itemCount = Number(dataView.getBigUint64(offset, true))
      offset += 8

      const bptReadNode = async (nodeOffset: number) => {
        const val = Number(nodeOffset)
        const len = 4 + blockSize * (keySize + valSize)
        const buffer = await this.bbi.read(len, val, opts)
        const b = buffer
        const dataView = new DataView(b.buffer, b.byteOffset, b.length)
        let offset = 0
        const nodeType = dataView.getInt8(offset)
        offset += 2 //skip 1
        const cnt = dataView.getInt16(offset, true)
        offset += 2
        const keys = []
        if (nodeType === 0) {
          const leafkeys = []
          for (let i = 0; i < cnt; i++) {
            const key = decoder
              .decode(b.subarray(offset, offset + keySize))
              .replaceAll('\0', '')
            offset += keySize
            const dataOffset = Number(dataView.getBigUint64(offset, true))
            offset += 8
            leafkeys.push({
              key,
              offset: dataOffset,
            })
          }

          let lastOffset = 0
          for (const { key, offset } of leafkeys) {
            if (name.localeCompare(key) < 0 && lastOffset) {
              return bptReadNode(lastOffset)
            }
            lastOffset = offset
          }
          return bptReadNode(lastOffset)
        } else if (nodeType === 1) {
          for (let i = 0; i < cnt; i++) {
            const key = decoder
              .decode(b.subarray(offset, offset + keySize))
              .replaceAll('\0', '')
            offset += keySize
            const dataOffset = Number(dataView.getBigUint64(offset, true))
            offset += 8
            const length = dataView.getUint32(offset, true)
            offset += 4
            const reserved = dataView.getUint32(offset, true)
            offset += 4
            keys.push({
              key,
              offset: dataOffset,
              length,
              reserved,
            })
          }

          for (const n of keys) {
            if (n.key === name) {
              return {
                ...n,
                field,
              }
            }
          }

          return undefined
        }
      }
      return bptReadNode(offset2 + 32)
    })
    return filterUndef(await Promise.all(locs))
  }

  /*
   * retrieve the features from the bigbed data that were found through the
   * lookup of the extraIndex note that there can be multiple extraIndex, see
   * the BigBed specification and the -extraIndex argument to bedToBigBed
   *
   * @param name - the name to search for
   *
   * @param opts - options object with optional AboutSignal
   *
   * @return array of Feature
   */
  public async searchExtraIndex(name: string, opts: RequestOptions = {}) {
    const blocks = await this.searchExtraIndexBlocks(name, opts)
    if (blocks.length === 0) {
      return []
    }
    const view = await this.getUnzoomedView(opts)
    const res = blocks.map(block => {
      return new Observable<Feature[]>(observer => {
        view.readFeatures(observer, [block], opts).catch((e: unknown) => {
          observer.error(e)
        })
      }).pipe(
        reduce((acc, curr) => acc.concat(curr)),
        map(x => {
          for (const element of x) {
            element.field = block.field
          }
          return x
        }),
      )
    })
    const ret = await firstValueFrom(merge(...res))
    return ret.filter(f => f.rest?.split('\t')[(f.field || 0) - 3] === name)
  }
}
