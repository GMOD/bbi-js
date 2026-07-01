import { BBI } from './bbi.ts'
import { getDataView, parseKey } from './util.ts'

import type { RequestOptions } from './types.ts'
import type { GenericFilehandle } from 'generic-filehandle2'

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

// bedToBigBed writes B+ tree keys sorted by memcmp (raw byte order), so the
// binary search must compare the same way. localeCompare applies locale
// collation instead — it reorders underscores, mixed case, etc. relative to
// byte order, sending the search down the wrong branch and missing valid keys
// (e.g. GENCODE names like "Metazoa_SRP"). Code-unit comparison matches memcmp
// for the ASCII/BMP names these indexes contain.
function byteCompare(a: string, b: string) {
  if (a < b) {
    return -1
  } else if (a > b) {
    return 1
  } else {
    return 0
  }
}

// Recursively traverses a B+ tree to find every entry matching `name` in a
// BigBed extraIndex. A name can appear many times (one entry per record, e.g.
// every transcript of a gene), and those entries can point at different data
// blocks, so a single match is not enough — we collect the whole contiguous run
// of equal keys in the matching leaf.
//
// This descends into a single child at each internal node, which finds all
// copies as long as they fit within one leaf (< blockSize of them). A name with
// more than blockSize occurrences would be split across sibling leaves and the
// extras would be missed; that case doesn't occur for the transcript/gene-name
// indexes bedToBigBed builds, but full correctness would need multi-child
// descent (cf. UCSC bptFileFindMulti).
async function readBPlusTreeNode(
  bbi: GenericFilehandle,
  nodeOffset: number,
  blockSize: number,
  keySize: number,
  valSize: number,
  name: string,
  field: number,
  opts: RequestOptions,
): Promise<Loc[]> {
  const len = 4 + blockSize * (keySize + valSize)
  const buffer = await bbi.read(len, nodeOffset, opts)
  const dataView = getDataView(buffer)
  const nodeType = dataView.getInt8(0)
  const cnt = dataView.getInt16(2, true)
  let offset = 4

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

    let left = 0
    let right = leafkeys.length - 1
    let targetIndex = -1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      if (byteCompare(name, leafkeys[mid]!.key) >= 0) {
        targetIndex = mid
        left = mid + 1
      } else {
        right = mid - 1
      }
    }

    const childOffset = leafkeys[Math.max(targetIndex, 0)]!.offset
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

    // Binary search to land anywhere in the run of entries matching name
    let left = 0
    let right = keys.length - 1
    let hit = -1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const cmp = byteCompare(name, keys[mid]!.key)

      if (cmp === 0) {
        hit = mid
        break
      } else if (cmp < 0) {
        right = mid - 1
      } else {
        left = mid + 1
      }
    }

    if (hit === -1) {
      return []
    }
    // expand around the hit to cover all equal keys (duplicates are contiguous)
    let lo = hit
    while (lo > 0 && keys[lo - 1]!.key === name) {
      lo--
    }
    let hi = hit
    while (hi < keys.length - 1 && keys[hi + 1]!.key === name) {
      hi++
    }
    return keys.slice(lo, hi + 1).map(k => ({ ...k, field }))
  }
  return []
}

/**
 * Parser for BigBed files. Inherits `getHeader`, `getFeatures`, and
 * `getFeaturesMulti` from `BBI`.
 *
 * Features have an additional `rest` field containing raw tab-delimited BED
 * columns 4+, and a `uniqueId` derived from the file offset. No zoom levels
 * are used for BigBed data.
 */
export class BigBed extends BBI {
  private indicesP?: Promise<Index[]>

  public readIndices(opts: RequestOptions = {}) {
    if (!this.indicesP) {
      this.indicesP = this._readIndices(opts).catch((e: unknown) => {
        this.indicesP = undefined
        throw e
      })
    }
    return this.indicesP
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
    const b = await this.bbi.read(64, extHeaderOffset, opts)

    const dataView = getDataView(b)
    const count = dataView.getUint16(2, true)
    const dataOffset = Number(dataView.getBigUint64(4, true))

    // no extra index is defined if count==0
    if (count === 0) {
      return []
    }

    const blocklen = 20
    const len = blocklen * count
    const buffer = await this.bbi.read(len, dataOffset, opts)

    const indices: Index[] = []

    for (let i = 0; i < count; i += 1) {
      const dataView = getDataView(buffer, i * blocklen)
      const type = dataView.getInt16(0, true)
      const fieldcount = dataView.getInt16(2, true)
      const dataOffset = Number(dataView.getBigUint64(4, true))
      const field = dataView.getInt16(16, true)
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

      const dataView = getDataView(b)
      const blockSize = dataView.getInt32(4, true)
      const keySize = dataView.getInt32(8, true)
      const valSize = dataView.getInt32(12, true)

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
    const results = await Promise.all(locs)
    return results.flat()
  }

  /**
   * Searches BigBed extra indexes (created via `-extraIndex` in `bedToBigBed`)
   * for a given name. A file may have multiple extra indexes, e.g. for gene ID
   * and gene name columns.
   *
   * @param name - value to look up in the extra index
   * @param opts - optional `RequestOptions` (e.g. `opts.signal` for abort)
   * @returns `Promise<Feature[]>` — matching features with an added `field`
   *   property indicating which extra-index column was matched
   */
  public async searchExtraIndex(name: string, opts: RequestOptions = {}) {
    const blocks = await this.searchExtraIndexBlocks(name, opts)
    if (blocks.length === 0) {
      return []
    }
    const view = await this.getUnzoomedView(opts)
    // Many index entries for the same name point at the same data block (several
    // records packed into one block), so dedupe by offset+field to read and
    // parse each block once instead of once per entry.
    const uniqueBlocks = [
      ...new Map(blocks.map(b => [`${b.offset}_${b.field}`, b])).values(),
    ]
    const results = await Promise.all(
      uniqueBlocks.map(async block => {
        const features = await view.readFeatures([block], opts)
        return features.map(f => ({ ...f, field: block.field }))
      }),
    )
    // field offset is adjusted by -3 to account for chrom, chromStart, chromEnd columns
    return results.flat().filter(f => {
      if (!f.rest) {
        return false
      }
      const fieldIndex = (f.field ?? 0) - 3
      return getTabField(f.rest, fieldIndex) === name
    })
  }
}
