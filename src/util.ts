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
  const sorted = blocks.toSorted((b0, b1) => b0.offset - b1.offset)

  const blockGroups: (Block & { blocks: Block[] })[] = []
  let lastBlock: (Block & { blocks: Block[] }) | undefined
  for (const block of sorted) {
    if (
      lastBlock &&
      block.offset - (lastBlock.offset + lastBlock.length) <= 2000
    ) {
      lastBlock.length = block.offset + block.length - lastBlock.offset
      lastBlock.blocks.push(block)
    } else {
      lastBlock = {
        blocks: [block],
        length: block.length,
        offset: block.offset,
      }
      blockGroups.push(lastBlock)
    }
  }

  return blockGroups
}
