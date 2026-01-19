import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { inflate } from 'pako-esm2'
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

  const fileData = new Uint8Array(readFileSync(path))
  const blocks: Block[] = []
  const dataView = new DataView(fileData.buffer, fileData.byteOffset, fileData.byteLength)

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

async function main() {
  const testFile = 'test/data/cow.bw'
  console.log(`Loading ${testFile}...`)

  const { blocks, fileData, uncompressBufSize } = await getCompressedBlocksFromBigWig(testFile)
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

  // Initialize WASM
  console.log('Initializing WASM...')
  const inputOffsets = new Uint32Array(localBlocks.length)
  const inputLengths = new Uint32Array(localBlocks.length)
  for (let j = 0; j < localBlocks.length; j++) {
    inputOffsets[j] = localBlocks[j]!.offset
    inputLengths[j] = localBlocks[j]!.length
  }
  await inflateRawBatch(concatenatedData, inputOffsets, inputLengths, uncompressBufSize)

  // Warmup
  console.log('Warming up...')
  for (let i = 0; i < 50; i++) {
    await inflateRawBatch(concatenatedData, inputOffsets, inputLengths, uncompressBufSize)
  }

  console.log(`\nRunning ${iterations} iterations...\n`)

  // Test 1: Creating new arrays each time (current behavior in block-view.ts)
  const newArraysStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    const offs = new Uint32Array(localBlocks.length)
    const lens = new Uint32Array(localBlocks.length)
    for (let j = 0; j < localBlocks.length; j++) {
      offs[j] = localBlocks[j]!.offset
      lens[j] = localBlocks[j]!.length
    }
    await inflateRawBatch(concatenatedData, offs, lens, uncompressBufSize)
  }
  const newArraysEnd = performance.now()
  const newArraysTime = newArraysEnd - newArraysStart

  // Test 2: Reusing pre-allocated arrays
  const reuseArraysStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    await inflateRawBatch(concatenatedData, inputOffsets, inputLengths, uncompressBufSize)
  }
  const reuseArraysEnd = performance.now()
  const reuseArraysTime = reuseArraysEnd - reuseArraysStart

  // Test 3: Multiple parallel calls
  const parallelStart = performance.now()
  const batchSize = 4
  for (let i = 0; i < iterations; i += batchSize) {
    await Promise.all([
      inflateRawBatch(concatenatedData, inputOffsets, inputLengths, uncompressBufSize),
      inflateRawBatch(concatenatedData, inputOffsets, inputLengths, uncompressBufSize),
      inflateRawBatch(concatenatedData, inputOffsets, inputLengths, uncompressBufSize),
      inflateRawBatch(concatenatedData, inputOffsets, inputLengths, uncompressBufSize),
    ])
  }
  const parallelEnd = performance.now()
  const parallelTime = parallelEnd - parallelStart

  console.log('--- Results ---')
  console.log(`New arrays each time: ${newArraysTime.toFixed(2)}ms (${(newArraysTime / iterations).toFixed(3)}ms/iter)`)
  console.log(`Reused arrays:        ${reuseArraysTime.toFixed(2)}ms (${(reuseArraysTime / iterations).toFixed(3)}ms/iter) [${((newArraysTime - reuseArraysTime) / newArraysTime * 100).toFixed(1)}% faster]`)
  console.log(`Parallel (4x):        ${parallelTime.toFixed(2)}ms (${(parallelTime / iterations).toFixed(3)}ms/iter)`)

  // Measure just the array creation overhead
  console.log('\n--- Array creation overhead ---')
  const arrayOnlyStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    const offs = new Uint32Array(localBlocks.length)
    const lens = new Uint32Array(localBlocks.length)
    for (let j = 0; j < localBlocks.length; j++) {
      offs[j] = localBlocks[j]!.offset
      lens[j] = localBlocks[j]!.length
    }
  }
  const arrayOnlyEnd = performance.now()
  console.log(`Array creation: ${(arrayOnlyEnd - arrayOnlyStart).toFixed(2)}ms total (${((arrayOnlyEnd - arrayOnlyStart) / iterations).toFixed(4)}ms/iter)`)
  console.log(`% of WASM time: ${((arrayOnlyEnd - arrayOnlyStart) / reuseArraysTime * 100).toFixed(1)}%`)

  // Measure async/await overhead
  console.log('\n--- Async overhead measurement ---')
  const emptyAsyncStart = performance.now()
  for (let i = 0; i < iterations * 10; i++) {
    await Promise.resolve()
  }
  const emptyAsyncEnd = performance.now()
  console.log(`Empty await: ${(emptyAsyncEnd - emptyAsyncStart).toFixed(2)}ms for ${iterations * 10} iterations`)
  console.log(`Per await: ${((emptyAsyncEnd - emptyAsyncStart) / (iterations * 10) * 1000).toFixed(2)}µs`)
}

main().catch(console.error)
