import { readFileSync } from 'node:fs'
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

  let offset = unzoomedIndexOffset + 48

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
  const testFile = 'test/data/cow.bw'
  console.log(`Loading ${testFile}...`)

  const { blocks, fileData, uncompressBufSize } =
    await getCompressedBlocksFromBigWig(testFile)

  console.log(`Found ${blocks.length} blocks, uncompressBufSize=${uncompressBufSize}`)

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

  const iterations = 500

  // Warmup
  console.log('Warming up...')
  for (let i = 0; i < 10; i++) {
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
  const wasmTime = wasmEnd - wasmStart

  // Profile pako
  console.log(`Profiling pako-esm2 (${iterations} iterations)...`)
  const pakoStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    pakoBatchUnzip(concatenatedData, localBlocks)
  }
  const pakoEnd = performance.now()
  const pakoTime = pakoEnd - pakoStart

  console.log('\n--- Results ---')
  console.log(`WASM total: ${wasmTime.toFixed(2)}ms (${(wasmTime / iterations).toFixed(3)}ms/iter)`)
  console.log(`pako total: ${pakoTime.toFixed(2)}ms (${(pakoTime / iterations).toFixed(3)}ms/iter)`)
  console.log(`Speedup: ${(pakoTime / wasmTime).toFixed(2)}x`)

  // Detailed timing breakdown
  console.log('\n--- Detailed WASM breakdown ---')

  // Time just the array creation
  const arrayStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    const inputOffsets = new Uint32Array(localBlocks.length)
    const inputLengths = new Uint32Array(localBlocks.length)
    for (let j = 0; j < localBlocks.length; j++) {
      inputOffsets[j] = localBlocks[j]!.offset
      inputLengths[j] = localBlocks[j]!.length
    }
  }
  const arrayEnd = performance.now()
  console.log(`Array prep: ${(arrayEnd - arrayStart).toFixed(2)}ms (${((arrayEnd - arrayStart) / iterations).toFixed(3)}ms/iter)`)

  // Pre-allocate arrays and time just the WASM call
  const inputOffsets = new Uint32Array(localBlocks.length)
  const inputLengths = new Uint32Array(localBlocks.length)
  for (let j = 0; j < localBlocks.length; j++) {
    inputOffsets[j] = localBlocks[j]!.offset
    inputLengths[j] = localBlocks[j]!.length
  }

  const wasmOnlyStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    await inflateRawBatch(concatenatedData, inputOffsets, inputLengths, uncompressBufSize)
  }
  const wasmOnlyEnd = performance.now()
  console.log(`WASM only: ${(wasmOnlyEnd - wasmOnlyStart).toFixed(2)}ms (${((wasmOnlyEnd - wasmOnlyStart) / iterations).toFixed(3)}ms/iter)`)

  const overhead = wasmTime - (wasmOnlyEnd - wasmOnlyStart)
  console.log(`Array overhead: ${overhead.toFixed(2)}ms (${(overhead / wasmTime * 100).toFixed(1)}% of total)`)
}

main().catch(console.error)
