import { SharedReadCache } from '@gmod/shared-read-cache'

import { BBI } from './bbi.ts'
import { getDataView, getUint64, parseKey } from './util.ts'

import type { RequestOptions } from './types.ts'
import type { GenericFilehandle } from 'generic-filehandle2'

interface Loc {
  offset: number
  length: number
  /** which extra-index column this entry came from */
  field: number
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

interface BPlusTree {
  bbi: GenericFilehandle
  nodeSize: number
  keySize: number
  name: string
  field: number
  opts: RequestOptions
}

// bedToBigBed sorts B+ tree keys by memcmp, so comparisons must use byte order.
// localeCompare reorders underscores and mixed case (e.g. GENCODE's
// "Metazoa_SRP") and misses valid keys. Code-unit order matches memcmp for the
// ASCII/BMP names these indexes hold.
function byteCompare(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0
}

// Finds every entry for `tree.name` in a BigBed extraIndex. A name repeats once
// per record (e.g. every transcript of a gene), and a run of equal keys can
// cross from one leaf into the next, so an internal node descends into every
// child whose key range can hold the name, as UCSC's bptFileFindMultiple does:
// from the last child starting before it through the last starting at it.
async function findInBPlusTree(
  tree: BPlusTree,
  nodeOffset: number,
): Promise<Loc[]> {
  const { bbi, nodeSize, keySize, name, field, opts } = tree
  const buffer = await bbi.read(nodeSize, nodeOffset, opts)
  const dataView = getDataView(buffer)
  const isLeaf = dataView.getUint8(0)
  const count = dataView.getUint16(2, true)
  let offset = 4

  if (isLeaf) {
    const locs: Loc[] = []
    for (let i = 0; i < count; i++) {
      const key = parseKey(buffer, offset, keySize)
      offset += keySize
      if (key === name) {
        locs.push({
          offset: getUint64(dataView, offset),
          length: dataView.getUint32(offset + 8, true),
          field,
        })
      }
      offset += 16
    }
    return locs
  }

  const children: number[] = []
  for (let i = 0; i < count; i++) {
    const cmp = byteCompare(parseKey(buffer, offset, keySize), name)
    offset += keySize
    if (cmp > 0) {
      break
    }
    if (cmp < 0) {
      children.length = 0
    }
    children.push(getUint64(dataView, offset))
    offset += 8
  }
  const results = await Promise.all(
    children.map(child => findInBPlusTree(tree, child)),
  )
  return results.flat()
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
  // Signal-aggregating rather than a bare memoized promise, for the same reason
  // as BBI's header cache: one caller aborting must not reject the others.
  private indicesCache = new SharedReadCache<undefined, Index[]>({
    maxSize: 1,
    cacheKey: () => 'indices',
    fill: (_key, signal) => this._readIndices({ signal }),
  })

  public readIndices(opts: RequestOptions = {}) {
    return this.indicesCache.get(undefined, opts.signal)
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
    // extHeaderOffset 0 means the file has no extension header at all; reading
    // there would misparse the main file header as an extension header
    if (extHeaderOffset === 0) {
      return []
    }
    const b = await this.bbi.read(64, extHeaderOffset, opts)

    const dataView = getDataView(b)
    const count = dataView.getUint16(2, true)
    const dataOffset = getUint64(dataView, 4)

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
      const type = dataView.getUint16(0, true)
      const fieldcount = dataView.getUint16(2, true)
      const dataOffset = getUint64(dataView, 4)
      const field = dataView.getUint16(16, true)
      indices.push({
        type,
        fieldcount,
        offset: dataOffset,
        field,
      })
    }
    return indices
  }

  private async searchExtraIndexBlocks(
    name: string,
    opts: RequestOptions = {},
  ): Promise<Loc[]> {
    const indices = await this.readIndices(opts)
    const locs = await Promise.all(
      indices.map(async ({ offset, field }) => {
        const dataView = getDataView(await this.bbi.read(32, offset, opts))
        const blockSize = dataView.getUint32(4, true)
        const keySize = dataView.getUint32(8, true)
        const valSize = dataView.getUint32(12, true)
        return findInBPlusTree(
          {
            bbi: this.bbi,
            nodeSize: 4 + blockSize * (keySize + Math.max(valSize, 8)),
            keySize,
            name,
            field,
            opts,
          },
          offset + 32,
        )
      }),
    )
    return locs.flat()
  }

  /**
   * Searches BigBed extra indexes (created via `-extraIndex` in `bedToBigBed`)
   * for a given name. A file may have multiple extra indexes, e.g. for gene ID
   * and gene name columns.
   *
   * @param name - value to look up in the extra index
   * @param opts - optional `RequestOptions` (e.g. `opts.signal` for abort)
   * @returns `Promise<Feature[]>` — matching features with `refName`, the
   *   chromosome they lie on, and `field`, the extra-index column that matched
   */
  public async searchExtraIndex(name: string, opts: RequestOptions = {}) {
    const blocks = await this.searchExtraIndexBlocks(name, opts)
    if (blocks.length === 0) {
      return []
    }
    const { refsByNumber } = await this.getHeader(opts)
    const view = await this.getUnzoomedView(opts)
    // Many index entries for the same name point at the same data block (several
    // records packed into one block), so dedupe by offset+field to read and parse
    // each block once instead of once per entry. Blocks are then handed to
    // readFeatures per field rather than one call each, so on-disk-adjacent blocks
    // coalesce into a single read.
    const blocksByField = new Map<number, Map<number, Loc>>()
    for (const block of blocks) {
      const { field } = block
      const byOffset = blocksByField.get(field)
      if (byOffset) {
        byOffset.set(block.offset, block)
      } else {
        blocksByField.set(field, new Map([[block.offset, block]]))
      }
    }
    const results = await Promise.all(
      [...blocksByField].map(async ([field, byOffset]) => {
        const features = await view.readFeatures([...byOffset.values()], opts)
        return features.map(f => ({
          ...f,
          field,
          refName:
            f.chromId === undefined ? undefined : refsByNumber[f.chromId]?.name,
        }))
      }),
    )
    // field offset is adjusted by -3 to account for chrom, chromStart, chromEnd columns
    return results.flat().filter(f => {
      if (!f.rest) {
        return false
      }
      return getTabField(f.rest, f.field - 3) === name
    })
  }
}
