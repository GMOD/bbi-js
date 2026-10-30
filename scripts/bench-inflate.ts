// Times the wasm inflate path against pako and DecompressionStream over the
// real compressed blocks of the test fixtures, for docs/wasm.md. Every arm
// skips the 2-byte zlib header and raw-inflates, and the parent asserts the
// arms byte-identical before timing anything.
//
// DecompressionStream gets one call PER BLOCK: a bbi file's blocks are
// separately compressed zlib streams, not members of one concatenated stream,
// so there is no bulk shape to hand it.
//
// Each arm runs in its own process, so no arm inherits another's JIT or heap.
//
//   pnpm bench:inflate          # all arms
//   pnpm bench:inflate pako     # one arm
import { spawnSync } from 'node:child_process'

import { LocalFile } from 'generic-filehandle2'
import { inflateRaw } from 'pako'

import { BlockView } from '../src/block-view.ts'
import { BigWig } from '../src/index.ts'
import { unzipBatch } from '../src/unzip.ts'

const ZLIB_HEADER_SIZE = 2
const WARMUP = 5
const MIN_ITERATIONS = 20
const MIN_MS = 1000

const FILES = [
  'test/data/volvox.bw',
  'test/data/cow.bw',
  'test/data/ENCFF826FLP.bw',
  'test/data/variable_step_large.bw',
]

interface Block {
  offset: number
  length: number
}

interface Fixture {
  path: string
  data: Uint8Array
  blocks: Block[]
  maxOutputSize: number
}

interface Result {
  path: string
  iterations: number
  meanMs: number
  minMs: number
}

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
    const collected = await view['_collectBlocks'](ref.name, 0, ref.length)
    if (collected) {
      found.push(...collected.blocks)
    }
  }
  found.sort((a, b) => a.offset - b.offset)

  const data = new Uint8Array(found.reduce((sum, b) => sum + b.length, 0))
  const blocks: Block[] = []
  let cursor = 0
  for (const block of found) {
    data.set(await fh.read(block.length, block.offset), cursor)
    blocks.push({ offset: cursor, length: block.length })
    cursor += block.length
  }
  return { path, data, blocks, maxOutputSize: header.uncompressBufSize }
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
    // one chunk up front, so pako is not penalized for growing its output
    const inflated = inflateRaw(
      data.subarray(start, block.offset + block.length),
      { chunkSize: maxOutputSize },
    )
    out.set(inflated, cursor)
    cursor += inflated.length
  }
  return out.subarray(0, cursor)
}

async function wasmBatch({ data, blocks, maxOutputSize }: Fixture) {
  return (await unzipBatch(data, blocks, maxOutputSize)).data
}

const ARMS: Record<string, (f: Fixture) => Uint8Array | Promise<Uint8Array>> = {
  wasm: wasmBatch,
  pako: pakoBatch,
  DecompressionStream: decompressionStreamBatch,
}

function assertSame(expected: Uint8Array, actual: Uint8Array, what: string) {
  if (actual.length !== expected.length) {
    throw new Error(`${what}: ${actual.length} bytes, wasm ${expected.length}`)
  }
  for (let i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new Error(`${what}: differs from wasm at byte ${i}`)
    }
  }
}

async function timeArm(name: string, fixtures: Fixture[]) {
  const run = ARMS[name]
  if (!run) {
    throw new Error(
      `unknown arm ${name}; one of ${Object.keys(ARMS).join(', ')}`,
    )
  }
  const results: Result[] = []
  for (const fixture of fixtures) {
    for (let i = 0; i < WARMUP; i++) {
      await run(fixture)
    }
    const times: number[] = []
    const start = performance.now()
    while (
      times.length < MIN_ITERATIONS ||
      performance.now() - start < MIN_MS
    ) {
      const t0 = performance.now()
      await run(fixture)
      times.push(performance.now() - t0)
    }
    results.push({
      path: fixture.path,
      iterations: times.length,
      meanMs: times.reduce((a, b) => a + b, 0) / times.length,
      minMs: Math.min(...times),
    })
  }
  return results
}

const fixtures = await Promise.all(FILES.map(loadBlocks))
const arm = process.argv[2]

if (process.env.BENCH_CHILD) {
  console.log(JSON.stringify(await timeArm(arm!, fixtures)))
} else {
  for (const fixture of fixtures) {
    const expected = await wasmBatch(fixture)
    assertSame(expected, pakoBatch(fixture), `${fixture.path} pako`)
    assertSame(
      expected,
      await decompressionStreamBatch(fixture),
      `${fixture.path} DecompressionStream`,
    )
  }

  const byArm = new Map<string, Result[]>()
  for (const name of arm ? [arm] : Object.keys(ARMS)) {
    const child = spawnSync(
      process.execPath,
      ['--experimental-strip-types', process.argv[1]!, name],
      { env: { ...process.env, BENCH_CHILD: '1' }, encoding: 'utf8' },
    )
    if (child.status !== 0) {
      throw new Error(`${name} failed:\n${child.stderr}`)
    }
    byArm.set(name, JSON.parse(child.stdout) as Result[])
  }

  for (const [i, fixture] of fixtures.entries()) {
    const kb = (fixture.data.length / 1024).toFixed(0)
    console.log(
      `\n${fixture.path} (${fixture.blocks.length} blocks, ${kb}KB compressed)`,
    )
    console.table(
      [...byArm].map(([name, results]) => {
        const r = results[i]!
        return {
          arm: name,
          'mean ms': r.meanMs.toFixed(2),
          'min ms': r.minMs.toFixed(2),
          iterations: r.iterations,
        }
      }),
    )
  }
}
