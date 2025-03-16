import { CoordRequest } from './types'
import { coordFilter } from './util'

export function parseBigWigBlock(
  buffer: Uint8Array,
  startOffset: number,
  req?: CoordRequest,
) {
  const b = buffer.subarray(startOffset)

  const dataView = new DataView(b.buffer, b.byteOffset, b.length)
  let offset = 0
  offset += 4
  const blockStart = dataView.getInt32(offset, true)
  offset += 8
  const itemStep = dataView.getUint32(offset, true)
  offset += 4
  const itemSpan = dataView.getUint32(offset, true)
  offset += 4
  const blockType = dataView.getUint8(offset)
  offset += 2
  const itemCount = dataView.getUint16(offset, true)
  offset += 2
  const items = new Array(itemCount)
  switch (blockType) {
    case 1: {
      for (let i = 0; i < itemCount; i++) {
        const start = dataView.getInt32(offset, true)
        offset += 4
        const end = dataView.getInt32(offset, true)
        offset += 4
        const score = dataView.getFloat32(offset, true)
        offset += 4
        items[i] = {
          start,
          end,
          score,
        }
      }
      break
    }
    case 2: {
      for (let i = 0; i < itemCount; i++) {
        const start = dataView.getInt32(offset, true)
        offset += 4
        const score = dataView.getFloat32(offset, true)
        offset += 4
        items[i] = {
          score,
          start,
          end: start + itemSpan,
        }
      }
      break
    }
    case 3: {
      for (let i = 0; i < itemCount; i++) {
        const score = dataView.getFloat32(offset, true)
        offset += 4
        const start = blockStart + i * itemStep
        items[i] = {
          score,
          start,
          end: start + itemSpan,
        }
      }
      break
    }
  }

  return req
    ? items.filter(f => coordFilter(f.start, f.end, req.start, req.end))
    : items
}
