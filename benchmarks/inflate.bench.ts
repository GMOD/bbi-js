// Isolated decompression benchmark: the wasm/libdeflater path the library uses
// vs pako, the pure-JS baseline, over the real compressed blocks of the test
// fixtures. Both sides do exactly the same work — skip the 2-byte zlib header,
// raw-inflate, no adler32 check — and the results are asserted byte-identical
// before timing, so this measures deflate throughput and nothing else.
//
// Run with `pnpm benchonly inflate`.
import { LocalFile } from 'generic-filehandle2'
import { inflateRaw } from 'pako'
import { bench, describe } from 'vitest'

import { BlockView } from '../src/block-view.ts'
import { BigWig } from '../src/index.ts'
import { unzipBatch } from '../src/unzip.ts'

const ZLIB_HEADER_SIZE = 2

interface Block {
  offset: number
  length: number
}

interface Fixture {
  data: Uint8Array
  blocks: Block[]
  maxOutputSize: number
  compressedBytes: number
}

/**
 * Pull every base-resolution block of `path` out of the R-tree and pack them
 * into one contiguous buffer, the same shape `readBlocks` hands to `unzipBatch`.
 */
async function loadBlocks(path: string): Promise<Fixture> {
  const header = await new BigWig({ path }).getHeader()
  const fh = new LocalFile(path)
  const view = new BlockView(
    fh,
    header.refsByName,
    header.unzoomedIndexOffset,
    header.uncompressBufSize,
    'bigwig',
  )

  const found: Block[] = []
  for (const ref of Object.values(header.refsByNumber)) {
    // eslint-disable-next-line @typescript-eslint/dot-notation
    const collected = await view['_collectBlocks'](ref.name, 0, ref.length)
    if (collected) {
      found.push(...collected.blocks)
    }
  }
  found.sort((a, b) => a.offset - b.offset)

  const compressedBytes = found.reduce((sum, b) => sum + b.length, 0)
  const data = new Uint8Array(compressedBytes)
  const blocks: Block[] = []
  let cursor = 0
  for (const block of found) {
    data.set(await fh.read(block.length, block.offset), cursor)
    blocks.push({ offset: cursor, length: block.length })
    cursor += block.length
  }

  return {
    data,
    blocks,
    maxOutputSize: header.uncompressBufSize,
    compressedBytes,
  }
}

function pakoBatch({ data, blocks, maxOutputSize }: Fixture) {
  const out = new Uint8Array(blocks.length * maxOutputSize)
  let cursor = 0
  for (const block of blocks) {
    const start = block.offset + ZLIB_HEADER_SIZE
    const inflated = inflateRaw(
      data.subarray(start, block.offset + block.length),
      // one chunk up front, so pako is not penalized for growing its output
      { chunkSize: maxOutputSize },
    )
    out.set(inflated, cursor)
    cursor += inflated.length
  }
  return out.subarray(0, cursor)
}

const FILES = [
  'test/data/volvox.bw',
  'test/data/cow.bw',
  'test/data/ENCFF826FLP.bw',
  'test/data/variable_step_large.bw',
]

for (const path of FILES) {
  const fixture = await loadBlocks(path)
  const { data, blocks, maxOutputSize, compressedBytes } = fixture

  const wasmOut = (await unzipBatch(data, blocks, maxOutputSize)).data
  const pakoOut = pakoBatch(fixture)
  if (wasmOut.length !== pakoOut.length) {
    throw new Error(
      `${path}: wasm produced ${wasmOut.length} bytes, pako ${pakoOut.length}`,
    )
  }
  for (let i = 0; i < wasmOut.length; i++) {
    if (wasmOut[i] !== pakoOut[i]) {
      throw new Error(`${path}: wasm and pako disagree at byte ${i}`)
    }
  }

  const name = path.split('/').pop()
  const kb = (compressedBytes / 1024).toFixed(0)
  describe(`${name} (${blocks.length} blocks, ${kb}KB compressed)`, () => {
    bench('wasm (libdeflater)', async () => {
      await unzipBatch(data, blocks, maxOutputSize)
    })
    bench('pako (pure js)', () => {
      pakoBatch(fixture)
    })
  })
}
