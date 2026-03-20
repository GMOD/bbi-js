interface Block {
  offset: number
  length: number
}
// sort blocks by file offset and
// group blocks that are within 2KB of eachother
export function groupBlocks(blocks: Block[]) {
  blocks.sort((b0, b1) => b0.offset - b1.offset)

  const blockGroups = []
  let lastBlock: (Block & { blocks: Block[] }) | undefined
  let lastBlockEnd: number | undefined
  for (const block of blocks) {
    if (lastBlock && lastBlockEnd && block.offset - lastBlockEnd <= 2000) {
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
