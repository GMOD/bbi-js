import { readFileSync, writeFileSync } from 'node:fs'
import { Session } from 'node:inspector/promises'
import { performance } from 'node:perf_hooks'
import { deflate, inflate } from 'pako-esm2'
import { inflateRawBatch } from '../src/wasm/inflate-wasm-inlined.js'
import { BigWig } from '../src/index.ts'

interface Block {
  offset: number
  length: number
}

async function getCompressedBlocksFromBigWig(path: string) {
  const bw = new BigWig({ path })
  const header = await bw.getHeader()
  const { uncompressBufSize, unzoomedIndexOffset } = header

  if (uncompressBufSize === 0) {
    return { blocks: [], fileData: new Uint8Array(0), uncompressBufSize: 0 }
  }

  const fileData = new Uint8Array(readFileSync(path))
  const blocks: Block[] = []
  const dataView = new DataView(
    fileData.buffer,
    fileData.byteOffset,
    fileData.byteLength,
  )

  const traverseRTree = (nodeOffset: number, maxBlocks: number) => {
    const isLeaf = dataView.getUint8(nodeOffset)
    const count = dataView.getUint16(nodeOffset + 2, true)
    let offset = nodeOffset + 4

    if (isLeaf === 1) {
      for (let i = 0; i < count && blocks.length < maxBlocks; i++) {
        offset += 16
        const dataOffset = Number(dataView.getBigUint64(offset, true))
        offset += 8
        const dataSize = Number(dataView.getBigUint64(offset, true))
        offset += 8
        blocks.push({ offset: dataOffset, length: dataSize })
      }
    } else {
      for (let i = 0; i < count && blocks.length < maxBlocks; i++) {
        offset += 16
        const childOffset = Number(dataView.getBigUint64(offset, true))
        offset += 8
        traverseRTree(childOffset, maxBlocks)
      }
    }
  }

  traverseRTree(unzoomedIndexOffset + 48, 100)
  return { blocks, fileData, uncompressBufSize }
}

function pakoBatchUnzip(data: Uint8Array, blocks: Block[]) {
  const results: Uint8Array[] = []
  const offsets: number[] = [0]

  for (const block of blocks) {
    const compressed = data.subarray(block.offset, block.offset + block.length)
    const decompressed = inflate(compressed)
    results.push(decompressed)
    offsets.push(offsets[offsets.length - 1]! + decompressed.length)
  }

  const totalSize = offsets[offsets.length - 1]!
  const output = new Uint8Array(totalSize)
  let offset = 0
  for (const result of results) {
    output.set(result, offset)
    offset += result.length
  }

  return { data: output, offsets }
}

async function main() {
  const session = new Session()
  session.connect()

  const testFile = 'test/data/cow.bw'
  console.log(`Loading ${testFile}...`)

  const { blocks, fileData, uncompressBufSize } =
    await getCompressedBlocksFromBigWig(testFile)

  console.log(`Found ${blocks.length} blocks`)

  // Build concatenated data
  const localBlocks: Block[] = []
  let totalSize = 0
  for (const block of blocks) {
    localBlocks.push({ offset: totalSize, length: block.length })
    totalSize += block.length
  }

  const concatenatedData = new Uint8Array(totalSize)
  let offset = 0
  for (const block of blocks) {
    concatenatedData.set(
      fileData.subarray(block.offset, block.offset + block.length),
      offset,
    )
    offset += block.length
  }

  const iterations = 200

  // Warmup
  console.log('Warming up...')
  for (let i = 0; i < 20; i++) {
    const inputOffsets = new Uint32Array(localBlocks.length)
    const inputLengths = new Uint32Array(localBlocks.length)
    for (let j = 0; j < localBlocks.length; j++) {
      inputOffsets[j] = localBlocks[j]!.offset
      inputLengths[j] = localBlocks[j]!.length
    }
    await inflateRawBatch(concatenatedData, inputOffsets, inputLengths, uncompressBufSize)
    pakoBatchUnzip(concatenatedData, localBlocks)
  }

  // Profile WASM
  console.log(`\nProfiling WASM (${iterations} iterations)...`)
  await session.post('Profiler.enable')
  await session.post('Profiler.start')

  const wasmStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    const inputOffsets = new Uint32Array(localBlocks.length)
    const inputLengths = new Uint32Array(localBlocks.length)
    for (let j = 0; j < localBlocks.length; j++) {
      inputOffsets[j] = localBlocks[j]!.offset
      inputLengths[j] = localBlocks[j]!.length
    }
    await inflateRawBatch(concatenatedData, inputOffsets, inputLengths, uncompressBufSize)
  }
  const wasmEnd = performance.now()

  const { profile: wasmProfile } = await session.post('Profiler.stop')
  writeFileSync('wasm-profile.cpuprofile', JSON.stringify(wasmProfile))
  console.log(`WASM: ${(wasmEnd - wasmStart).toFixed(2)}ms total`)
  console.log('Saved wasm-profile.cpuprofile')

  // Profile pako
  console.log(`\nProfiling pako-esm2 (${iterations} iterations)...`)
  await session.post('Profiler.start')

  const pakoStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    pakoBatchUnzip(concatenatedData, localBlocks)
  }
  const pakoEnd = performance.now()

  const { profile: pakoProfile } = await session.post('Profiler.stop')
  writeFileSync('pako-profile.cpuprofile', JSON.stringify(pakoProfile))
  console.log(`pako: ${(pakoEnd - pakoStart).toFixed(2)}ms total`)
  console.log('Saved pako-profile.cpuprofile')

  await session.post('Profiler.disable')
  session.disconnect()

  // Analyze profiles
  console.log('\n--- Top functions in WASM profile ---')
  analyzeProfile(wasmProfile)

  console.log('\n--- Top functions in pako profile ---')
  analyzeProfile(pakoProfile)
}

function analyzeProfile(profile: any) {
  const nodes = profile.nodes
  const samples = profile.samples
  const timeDeltas = profile.timeDeltas

  // Count time per node
  const nodeTimes = new Map<number, number>()
  for (let i = 0; i < samples.length; i++) {
    const nodeId = samples[i]
    const time = timeDeltas[i] || 0
    nodeTimes.set(nodeId, (nodeTimes.get(nodeId) || 0) + time)
  }

  // Get node info
  const nodeInfo = new Map<number, any>()
  for (const node of nodes) {
    nodeInfo.set(node.id, node)
  }

  // Sort by time
  const sorted = [...nodeTimes.entries()]
    .map(([id, time]) => {
      const node = nodeInfo.get(id)
      const name = node?.callFrame?.functionName || '(anonymous)'
      const url = node?.callFrame?.url || ''
      return { name, url, time }
    })
    .filter(n => n.time > 0)
    .sort((a, b) => b.time - a.time)
    .slice(0, 15)

  const totalTime = sorted.reduce((sum, n) => sum + n.time, 0)
  for (const { name, url, time } of sorted) {
    const pct = (time / totalTime * 100).toFixed(1)
    const shortUrl = url.split('/').slice(-2).join('/')
    console.log(`  ${pct.padStart(5)}%  ${(time / 1000).toFixed(1).padStart(6)}ms  ${name.slice(0, 40).padEnd(40)}  ${shortUrl}`)
  }
}

main().catch(console.error)
