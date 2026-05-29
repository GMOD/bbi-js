export const decoder = new TextDecoder('utf8')

export interface Block {
  offset: number
  length: number
}

export function getDataView(buffer: Uint8Array, byteOffset = 0) {
  return new DataView(
    buffer.buffer,
    buffer.byteOffset + byteOffset,
    buffer.length - byteOffset,
  )
}

// Decode a null-terminated fixed-width key from a B+ tree node
export function parseKey(buffer: Uint8Array, offset: number, keySize: number) {
  const nullPos = buffer.indexOf(0, offset)
  const end =
    nullPos !== -1 && nullPos < offset + keySize ? nullPos : offset + keySize
  return decoder.decode(buffer.subarray(offset, end))
}

// sort blocks by file offset and
// group blocks that are within 2KB of eachother
export function groupBlocks(blocks: Block[]) {
  blocks.sort((b0, b1) => b0.offset - b1.offset)

  const blockGroups = []
  let lastBlock: (Block & { blocks: Block[] }) | undefined
  let lastBlockEnd: number | undefined
  for (const block of blocks) {
    if (lastBlock && block.offset - lastBlockEnd! <= 2000) {
      lastBlock.length = block.offset + block.length - lastBlock.offset
      lastBlock.blocks.push(block)
      lastBlockEnd = block.offset + block.length
    } else {
      lastBlock = {
        blocks: [block],
        length: block.length,
        offset: block.offset,
      }
      blockGroups.push(lastBlock)
      lastBlockEnd = block.offset + block.length
    }
  }

  return blockGroups
}
