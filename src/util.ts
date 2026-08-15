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

// Read a little-endian uint64 as a JS number. Exact for values below 2^53,
// which covers any real file offset, and avoids allocating a BigInt.
export function getUint64(dataView: DataView, byteOffset: number) {
  return (
    dataView.getUint32(byteOffset, true) +
    dataView.getUint32(byteOffset + 4, true) * 2 ** 32
  )
}

// Decode a null-terminated fixed-width key from a B+ tree node
export function parseKey(buffer: Uint8Array, offset: number, keySize: number) {
  const nullPos = buffer.indexOf(0, offset)
  const end =
    nullPos !== -1 && nullPos < offset + keySize ? nullPos : offset + keySize
  return decoder.decode(buffer.subarray(offset, end))
}

// Run `read` over `items` with at most `limit` reads in flight, handing each
// result to `use` in input order. Reads run ahead; `use` still sees input order,
// so a caller that concatenates in call order gets the same output it did when
// every read was awaited in turn.
//
// The point is latency. Byte-range reads against a remote file cost a round trip
// each and are independent of one another, so awaiting them one at a time makes
// a query's wall clock the sum of its reads rather than the longest of them.
//
// A rejection is settled into its slot rather than propagated eagerly: throwing
// at the first failure while other reads are still in flight would leave their
// rejections unhandled. Each is caught as it happens and re-thrown when its turn
// comes, so the error a caller sees is still the first one in input order.
export async function forEachWithReadahead<T, R>(
  items: T[],
  limit: number,
  read: (item: T) => Promise<R>,
  use: (value: R, item: T, index: number) => Promise<void> | void,
): Promise<void> {
  type Settled = { value: R } | { error: unknown }
  const start = (item: T): Promise<Settled> =>
    read(item).then(
      (value): Settled => ({ value }),
      (error: unknown): Settled => ({ error }),
    )

  const inflight: Promise<Settled>[] = []
  let next = 0
  while (next < items.length && inflight.length < limit) {
    inflight.push(start(items[next++]!))
  }
  for (let i = 0; i < items.length; i++) {
    // shift, not index: dropping the reference lets a consumed read's bytes be
    // collected while the rest of the queue is still being walked
    const settled = await inflight.shift()!
    if (next < items.length) {
      inflight.push(start(items[next++]!))
    }
    if ('error' in settled) {
      throw settled.error
    }
    await use(settled.value, items[i]!, i)
  }
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
      // max(): a block contained within the group's existing extent (a duplicate,
      // or one nested in a longer earlier block) must not shrink it, or the group
      // read would be short and later blocks would decode from truncated bytes
      lastBlock.length = Math.max(
        lastBlock.length,
        block.offset + block.length - lastBlock.offset,
      )
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
