import { readFileSync } from 'node:fs'
import { bench, describe } from 'vitest'
import { deflate, inflate } from 'pako-esm2'
import { inflateRawBatch } from '../src/wasm/inflate-wasm-inlined.js'
import { BigWig } from '../src/index.ts'

interface Block {
  offset: number
  length: number
}

// Helper to extract compressed blocks from a bigwig file using its R-tree index
async function getCompressedBlocksFromBigWig(path: string) {
  const bw = new BigWig({ path })
  const header = await bw.getHeader()
  const { uncompressBufSize, unzoomedIndexOffset } = header

  if (uncompressBufSize === 0) {
    return { blocks: [], fileData: new Uint8Array(0), uncompressBufSize: 0 }
  }

  // Read the entire file
  const fileData = new Uint8Array(readFileSync(path))

  // Parse R-tree to find data blocks
  const blocks: Block[] = []
  const dataView = new DataView(
    fileData.buffer,
    fileData.byteOffset,
    fileData.byteLength,
  )

  // Read R-tree header (48 bytes)
  let offset = unzoomedIndexOffset
  const magic = dataView.getUint32(offset, true)
  offset += 4
  const blockSize = dataView.getUint32(offset, true)
  offset += 4
  const itemCount = Number(dataView.getBigUint64(offset, true))
  offset += 8
  const startChromIx = dataView.getUint32(offset, true)
  offset += 4
  const startBase = dataView.getUint32(offset, true)
  offset += 4
  const endChromIx = dataView.getUint32(offset, true)
  offset += 4
  const endBase = dataView.getUint32(offset, true)
  offset += 4
  const fileSize = Number(dataView.getBigUint64(offset, true))
  offset += 8
  const itemsPerSlot = dataView.getUint32(offset, true)
  offset += 4
  const reserved = dataView.getUint32(offset, true)
  offset += 4

  // Traverse R-tree to find leaf nodes
  const traverseRTree = (nodeOffset: number, maxBlocks: number) => {
    const isLeaf = dataView.getUint8(nodeOffset)
    const reserved = dataView.getUint8(nodeOffset + 1)
    const count = dataView.getUint16(nodeOffset + 2, true)

    let offset = nodeOffset + 4

    if (isLeaf === 1) {
      // Leaf node - contains data block references
      for (let i = 0; i < count && blocks.length < maxBlocks; i++) {
        const startChrom = dataView.getUint32(offset, true)
        offset += 4
        const startBase = dataView.getUint32(offset, true)
        offset += 4
        const endChrom = dataView.getUint32(offset, true)
        offset += 4
        const endBase = dataView.getUint32(offset, true)
        offset += 4
        const dataOffset = Number(dataView.getBigUint64(offset, true))
        offset += 8
        const dataSize = Number(dataView.getBigUint64(offset, true))
        offset += 8

        blocks.push({ offset: dataOffset, length: dataSize })
      }
    } else {
      // Non-leaf node - contains pointers to child nodes
      for (let i = 0; i < count && blocks.length < maxBlocks; i++) {
        offset += 16 // skip bounding box
        const childOffset = Number(dataView.getBigUint64(offset, true))
        offset += 8
        traverseRTree(childOffset, maxBlocks)
      }
    }
  }

  // Start traversal from root node (right after header)
  traverseRTree(unzoomedIndexOffset + 48, 50)

  return { blocks, fileData, uncompressBufSize }
}

// Pako-based batch decompression
function pakoBatchUnzip(
  data: Uint8Array,
  blocks: Block[],
) {
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

const defaultOpts = {
  iterations: 100,
  warmupIterations: 10,
}

// Test files
const testFiles = [
  { name: 'volvox.bw (209KB)', path: 'test/data/volvox.bw' },
  { name: 'fixedStep.bw (698KB)', path: 'test/data/fixedStep.bw' },
  { name: 'cow.bw (638KB)', path: 'test/data/cow.bw' },
]

for (const testFile of testFiles) {
  describe(`Unzip: ${testFile.name}`, async () => {
    const { blocks, fileData, uncompressBufSize } =
      await getCompressedBlocksFromBigWig(testFile.path)

    if (blocks.length === 0 || uncompressBufSize === 0) {
      console.log(`${testFile.name}: No compressed blocks found`)
      return
    }

    console.log(`${testFile.name}: Found ${blocks.length} compressed blocks`)

    // Build local block references and concatenated data
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

    bench(
      'WASM (inflateRawBatch)',
      async () => {
        const inputOffsets = new Uint32Array(localBlocks.length)
        const inputLengths = new Uint32Array(localBlocks.length)
        for (let i = 0; i < localBlocks.length; i++) {
          inputOffsets[i] = localBlocks[i]!.offset
          inputLengths[i] = localBlocks[i]!.length
        }
        await inflateRawBatch(
          concatenatedData,
          inputOffsets,
          inputLengths,
          uncompressBufSize,
        )
      },
      defaultOpts,
    )

    bench(
      'pako-esm2 (inflate)',
      () => {
        pakoBatchUnzip(concatenatedData, localBlocks)
      },
      defaultOpts,
    )
  })
}

// Also test with synthetic data to ensure variety
describe('Unzip: Synthetic (50 x 8KB blocks)', () => {
  const numBlocks = 50
  const blockSize = 8192
  const compressedBlocks: Uint8Array[] = []

  for (let i = 0; i < numBlocks; i++) {
    const uncompressed = new Uint8Array(blockSize)
    const view = new DataView(
      uncompressed.buffer,
      uncompressed.byteOffset,
      uncompressed.byteLength,
    )

    view.setUint32(0, 1, true)
    view.setInt32(4, i * 1000, true)
    view.setInt32(8, (i + 1) * 1000, true)
    view.setUint32(12, 10, true)
    view.setUint32(16, 10, true)
    view.setUint8(20, 3)
    view.setUint16(22, Math.floor((blockSize - 24) / 4), true)

    for (let j = 24; j < blockSize; j += 4) {
      view.setFloat32(j, Math.random() * 100, true)
    }

    compressedBlocks.push(deflate(uncompressed))
  }

  const blockMeta: Block[] = []
  let totalCompressedSize = 0
  for (const block of compressedBlocks) {
    blockMeta.push({ offset: totalCompressedSize, length: block.length })
    totalCompressedSize += block.length
  }

  const concatenatedData = new Uint8Array(totalCompressedSize)
  let offset = 0
  for (const block of compressedBlocks) {
    concatenatedData.set(block, offset)
    offset += block.length
  }

  bench(
    'WASM (inflateRawBatch)',
    async () => {
      const inputOffsets = new Uint32Array(blockMeta.length)
      const inputLengths = new Uint32Array(blockMeta.length)
      for (let i = 0; i < blockMeta.length; i++) {
        inputOffsets[i] = blockMeta[i]!.offset
        inputLengths[i] = blockMeta[i]!.length
      }
      await inflateRawBatch(
        concatenatedData,
        inputOffsets,
        inputLengths,
        blockSize,
      )
    },
    defaultOpts,
  )

  bench(
    'pako-esm2 (inflate)',
    () => {
      pakoBatchUnzip(concatenatedData, blockMeta)
    },
    defaultOpts,
  )
})
