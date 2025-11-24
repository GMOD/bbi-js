import AbortablePromiseCache from '@gmod/abortable-promise-cache'
import QuickLRU from 'quick-lru'
import { Observable, firstValueFrom, merge } from 'rxjs'
import { map, reduce } from 'rxjs/operators'

import { BBI } from './bbi.ts'

import type { Feature, RequestOptions } from './types.ts'
import type { GenericFilehandle } from 'generic-filehandle2'

const decoder = new TextDecoder('utf8')

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

function getTabField(str: string, fieldIndex: number) {
  if (fieldIndex < 0) {
    return undefined
  }
  let start = 0
  for (let i = 0; i < fieldIndex; i++) {
    start = str.indexOf('\t', start)
    if (start === -1) {
      return undefined
    }
    start++
  }
  const end = str.indexOf('\t', start)
  return end === -1 ? str.slice(start) : str.slice(start, end)
}

// Parses a null-terminated string key from a B+ tree node
function parseKey(buffer: Uint8Array, offset: number, keySize: number) {
  const keyEnd = buffer.indexOf(0, offset)
  return decoder.decode(
    buffer.subarray(offset, keyEnd !== -1 ? keyEnd : offset + keySize),
  )
}

// Recursively traverses a B+ tree to search for a specific name in the BigBed extraIndex
// B+ trees are balanced tree structures optimized for disk-based searches
async function readBPlusTreeNode(
  bbi: GenericFilehandle,
  nodeOffset: number,
  blockSize: number,
  keySize: number,
  valSize: number,
  name: string,
  field: number,
  opts: RequestOptions,
): Promise<Loc | undefined> {
  const len = 4 + blockSize * (keySize + valSize)
  const buffer = await bbi.read(len, nodeOffset, opts)
  const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.length)
  let offset = 0
  const nodeType = dataView.getInt8(offset)
  offset += 2 // skip nodeType byte + 1 reserved byte
  const cnt = dataView.getInt16(offset, true)
  offset += 2

  // Non-leaf node (nodeType === 0): contains keys and child node pointers for navigation
  if (nodeType === 0) {
    const leafkeys = []
    for (let i = 0; i < cnt; i++) {
      const key = parseKey(buffer, offset, keySize)
      offset += keySize
      const dataOffset = Number(dataView.getBigUint64(offset, true))
      offset += 8
      leafkeys.push({
        key,
        offset: dataOffset,
      })
    }

    // Binary search to find the appropriate child node
    let left = 0
    let right = leafkeys.length - 1
    let targetIndex = leafkeys.length - 1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const cmp = name.localeCompare(leafkeys[mid]!.key)

      if (cmp < 0) {
        targetIndex = mid - 1
        right = mid - 1
      } else {
        left = mid + 1
      }
    }

    const childOffset =
      targetIndex >= 0 ? leafkeys[targetIndex]!.offset : leafkeys[0]!.offset
    return readBPlusTreeNode(
      bbi,
      childOffset,
      blockSize,
      keySize,
      valSize,
      name,
      field,
      opts,
    )
  } else if (nodeType === 1) {
    // Leaf node (nodeType === 1): contains actual key-value data
    const keys = []
    for (let i = 0; i < cnt; i++) {
      const key = parseKey(buffer, offset, keySize)
      offset += keySize
      const dataOffset = Number(dataView.getBigUint64(offset, true))
      offset += 8
      const length = dataView.getUint32(offset, true)
      offset += 4
      offset += 4 // skip reserved
      keys.push({
        key,
        offset: dataOffset,
        length,
      })
    }

    // Binary search for exact key match in sorted leaf node
    let left = 0
    let right = keys.length - 1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const cmp = name.localeCompare(keys[mid]!.key)

      if (cmp === 0) {
        return { ...keys[mid]!, field }
      } else if (cmp < 0) {
        right = mid - 1
      } else {
        left = mid + 1
      }
    }

    return undefined
  }
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
    const b = await this.bbi.read(64, extHeaderOffset)

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
    const buffer = await this.bbi.read(len, dataOffset)

    const indices: Index[] = []

    for (let i = 0; i < count; i += 1) {
      const b = buffer.subarray(i * blocklen)
      const dataView = new DataView(b.buffer, b.byteOffset, b.length)
      let offset = 0
      const type = dataView.getInt16(offset, true)
      offset += 2
      const fieldcount = dataView.getInt16(offset, true)
      offset += 2
      const dataOffset = Number(dataView.getBigUint64(offset, true))
      offset += 8 + 4 // skip 8-byte offset + 4 reserved bytes
      const field = dataView.getInt16(offset, true)
      indices.push({
        type,
        fieldcount,
        offset: dataOffset,
        field,
      })
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

      return readBPlusTreeNode(
        this.bbi,
        offset2 + 32,
        blockSize,
        keySize,
        valSize,
        name,
        field,
        opts,
      )
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
   * @param opts - options object with optional AbortSignal
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
        reduce((acc, curr) => {
          acc.push(...curr)
          return acc
        }, [] as Feature[]),
        map(features => features.map(f => ({ ...f, field: block.field }))),
      )
    })
    const ret = await firstValueFrom(merge(...res))
    // Filter to features where the indexed field matches the search name
    // field offset is adjusted by -3 to account for chrom, chromStart, chromEnd columns
    return ret.filter(f => {
      if (!f.rest) {
        return false
      }
      const fieldIndex = (f.field || 0) - 3
      return getTabField(f.rest, fieldIndex) === name
    })
  }
}
