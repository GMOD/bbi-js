// Isolated decompression benchmark: the wasm/libdeflater path the library uses
// vs pako, the pure-JS baseline, and vs the platform's own `DecompressionStream`,
// over the real compressed blocks of the test fixtures. Every arm does the same
// work — skip the 2-byte zlib header, raw-inflate, no adler32 check — and the
// results are asserted byte-identical before timing, so this measures deflate
// throughput and nothing else.
//
// The `DecompressionStream` arm is one call PER BLOCK, because that is the only
// shape available: a bbi file's blocks are separately-compressed zlib streams,
// not members of one concatenated stream, so there is nothing to hand it in
// bulk. Its per-call overhead therefore lands once per block, hundreds of times
// per query, which is what the numbers in docs/wasm.md are showing.
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

async function decompressionStreamBatch({ data, blocks }: Fixture) {
  const parts: Uint8Array[] = []
  let total = 0
  for (const block of blocks) {
    const input = data.subarray(block.offset, block.offset + block.length)
    const stream = new Blob([input as Uint8Array<ArrayBuffer>])
      .stream()
      .pipeThrough(new DecompressionStream('deflate'))
    const out = new Uint8Array(await new Response(stream).arrayBuffer())
    parts.push(out)
    total += out.length
  }
  const joined = new Uint8Array(total)
  let cursor = 0
  for (const part of parts) {
    joined.set(part, cursor)
    cursor += part.length
  }
  return joined
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
  const dsOut = await decompressionStreamBatch(fixture)
  if (dsOut.length !== wasmOut.length) {
    throw new Error(
      `${path}: DecompressionStream produced ${dsOut.length} bytes, wasm ${wasmOut.length}`,
    )
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
    bench('DecompressionStream (per block)', async () => {
      await decompressionStreamBatch(fixture)
    })
  })
}
