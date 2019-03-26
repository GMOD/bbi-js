import * as Long from 'long'

// sort blocks by file offset and
// group blocks that are within 2KB of eachother
export function groupBlocks(blocks: any[]): any[] {
  blocks.sort((b0, b1) => (b0.offset | 0) - (b1.offset | 0))

  const blockGroups = []
  let lastBlock
  let lastBlockEnd
  for (let i = 0; i < blocks.length; i += 1) {
    if (lastBlock && blocks[i].offset - lastBlockEnd <= 2000) {
      lastBlock.size += blocks[i].size - lastBlockEnd + blocks[i].offset
      lastBlock.blocks.push(blocks[i])
    } else {
      blockGroups.push(
        (lastBlock = {
          blocks: [blocks[i]],
          size: blocks[i].size,
          offset: blocks[i].offset,
        }),
      )
    }
    lastBlockEnd = lastBlock.offset + lastBlock.size
  }

  return blockGroups
}
