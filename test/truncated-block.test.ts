import { LocalFile } from 'generic-filehandle2'
import { deflate } from 'pako'
import { expect, test } from 'vitest'

import { FilehandleDouble } from './filehandle-double.ts'
import { BigWig } from '../src/index.ts'
import {
  decompressAndParseBigWigBlocks,
  decompressAndParseSummaryBlocks,
} from '../src/unzip.ts'

import type { FilehandleOptions, GenericFilehandle } from 'generic-filehandle2'

// A block short of what its own header declares reaches the JS parsers (an
// uncompressed file, the Feature[] API, the multi-region typed-array path) and
// the wasm one (a compressed file's typed-array path) over the same bytes.
// These pin that both refuse it, and with the same message: a parser that
// silently yielded the records that did fit would serve a track missing data
// with nothing to say so.
const TRUNCATED = /truncated bigwig block: \d+ bytes, expected \d+/

// A bigwig bedGraph section header claiming `itemCount` records, followed by
// only `supplied` of them.
function shortSection(itemCount: number, supplied: number) {
  const buf = new Uint8Array(24 + supplied * 12)
  const dv = new DataView(buf.buffer)
  dv.setUint32(0, 0, true) // chromId
  dv.setInt32(4, 0, true) // chromStart
  dv.setInt32(8, 1000, true) // chromEnd
  dv.setUint32(12, 1, true) // itemStep
  dv.setUint32(16, 1, true) // itemSpan
  dv.setUint8(20, 1) // type: bedGraph
  dv.setUint16(22, itemCount, true)
  return buf
}

function zlib(bytes: Uint8Array) {
  const out = deflate(bytes)
  return { data: out, blocks: [{ offset: 0, length: out.length }] }
}

test('the wasm parser refuses a bigwig block shorter than its item count', async () => {
  const { data, blocks } = zlib(shortSection(5, 2))
  await expect(
    decompressAndParseBigWigBlocks(data, blocks, 65536, 0, 1000),
  ).rejects.toThrow(TRUNCATED)
})

test('the wasm parser refuses a bigwig block with no room for its header', async () => {
  const { data, blocks } = zlib(new Uint8Array(10))
  await expect(
    decompressAndParseBigWigBlocks(data, blocks, 65536, 0, 1000),
  ).rejects.toThrow(TRUNCATED)
})

test('the wasm parser refuses a partial summary record', async () => {
  // one whole 32-byte zoom record plus half of a second
  const { data, blocks } = zlib(new Uint8Array(48))
  await expect(
    decompressAndParseSummaryBlocks(data, blocks, 65536, 0, 0, 1000),
  ).rejects.toThrow(/truncated summary block: 48 bytes, expected 64/)
})

// Serves fewer bytes than asked for, but only past `from` — the header and
// R-tree reads sit below it and have to arrive whole for the query to get as
// far as a data block at all.
class TruncatingFile extends FilehandleDouble {
  private inner: GenericFilehandle
  private from: number
  constructor(inner: GenericFilehandle, from: number) {
    super()
    this.inner = inner
    this.from = from
  }
  async read(length: number, position: number, opts?: FilehandleOptions) {
    const buf = await this.inner.read(length, position, opts)
    return position >= this.from ? buf.subarray(0, buf.length - 8) : buf
  }
}

test.each([
  ['getFeatures', (bw: BigWig) => bw.getFeatures('ctgA', 0, 100_000)],
  [
    'getFeaturesAsArrays',
    (bw: BigWig) => bw.getFeaturesAsArrays('ctgA', 0, 100_000),
  ],
  [
    'getFeaturesAsArraysMulti',
    (bw: BigWig) =>
      bw.getFeaturesAsArraysMulti([
        { refName: 'ctgA', start: 0, end: 50_000 },
        { refName: 'ctgA', start: 50_000, end: 100_000 },
      ]),
  ],
] as const)(
  'the JS parser refuses a short block through %s',
  async (_name, call) => {
    // uncompressed.bw has uncompressBufSize 0, so its blocks are parsed in JS
    const path = 'test/data/uncompressed.bw'
    const { unzoomedDataOffset } = await new BigWig({ path }).getHeader()
    const bw = new BigWig({
      filehandle: new TruncatingFile(new LocalFile(path), unzoomedDataOffset),
    })
    await expect(call(bw)).rejects.toThrow(TRUNCATED)
  },
)

test('a whole file still parses through every path', async () => {
  const bw = new BigWig({ path: 'test/data/uncompressed.bw' })
  expect((await bw.getFeatures('ctgA', 0, 100_000)).length).toBeGreaterThan(0)
  expect(
    (await bw.getFeaturesAsArrays('ctgA', 0, 100_000)).starts.length,
  ).toBeGreaterThan(0)
})
