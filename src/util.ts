/* eslint no-bitwise: ["error", { "allow": ["|"] }] */
export class AbortError extends Error {
  public code: string

  public constructor(message: string) {
    super(message)
    this.code = 'ERR_ABORTED'
  }
}
// sort blocks by file offset and
// group blocks that are within 2KB of eachother
export function groupBlocks(blocks: any[]): any[] {
  blocks.sort((b0, b1) => (b0.offset | 0) - (b1.offset | 0))

  const blockGroups = []
  let lastBlock
  let lastBlockEnd
  for (let i = 0; i < blocks.length; i += 1) {
    if (lastBlock && blocks[i].offset - lastBlockEnd <= 2000) {
      lastBlock.length += blocks[i].length - lastBlockEnd + blocks[i].offset
      lastBlock.blocks.push(blocks[i])
    } else {
      blockGroups.push(
        (lastBlock = {
          blocks: [blocks[i]],
          length: blocks[i].length,
          offset: blocks[i].offset,
        }),
      )
    }
    lastBlockEnd = lastBlock.offset + lastBlock.length
  }

  return blockGroups
}

/**
 * Properly check if the given AbortSignal is aborted.
 * Per the standard, if the signal reads as aborted,
 * this function throws either a DOMException AbortError, or a regular error
 * with a `code` attribute set to `ERR_ABORTED`.
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
    // console.log('bam aborted!')
    if (typeof DOMException !== 'undefined') {
      throw new DOMException('aborted', 'AbortError')
    } else {
      const e = new AbortError('aborted')
      e.code = 'ERR_ABORTED'
      throw e
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
