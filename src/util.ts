export class AbortError extends Error {
  public code: string

  public constructor(message: string) {
    super(message)
    this.code = 'ERR_ABORTED'
  }
}

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

/**
 * Properly check if the given AbortSignal is aborted. Per the standard, if the
 * signal reads as aborted, this function throws either a DOMException
 * AbortError, or a regular error with a `code` attribute set to `ERR_ABORTED`.
 *
 * For convenience, passing `undefined` is a no-op
 *
 * @param {AbortSignal} [signal] an AbortSignal, or anything with an `aborted` attribute
 * @returns nothing
 */
export function checkAbortSignal(signal?: AbortSignal): void {
  if (!signal) {
    return
  }

  if (signal.aborted) {
    if (typeof DOMException === 'undefined') {
      const e = new AbortError('aborted')
      e.code = 'ERR_ABORTED'
      throw e
    } else {
      throw new DOMException('aborted', 'AbortError')
    }
  }
}

/**
 * Skips to the next tick, then runs `checkAbortSignal`.
 * Await this to inside an otherwise synchronous loop to
 * provide a place to break when an abort signal is received.
 * @param {AbortSignal} signal
 */
export async function abortBreakPoint(signal?: AbortSignal): Promise<void> {
  await Promise.resolve()
  checkAbortSignal(signal)
}
