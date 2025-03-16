import { CoordRequest, Feature } from './types'
import { coordFilter } from './util'

const decoder =
  typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined

export function parseBigBedBlock(
  data: Uint8Array,
  startOffset: number,
  offset: number,
  request?: CoordRequest,
) {
  const items = [] as Feature[]
  let currOffset = startOffset
  const b = data
  const dataView = new DataView(b.buffer, b.byteOffset, b.length)
  while (currOffset < data.byteLength) {
    const c2 = currOffset
    const chromId = dataView.getUint32(currOffset, true)
    currOffset += 4
    const start = dataView.getInt32(currOffset, true)
    currOffset += 4
    const end = dataView.getInt32(currOffset, true)
    currOffset += 4
    let i = currOffset
    for (; i < data.length; i++) {
      if (data[i] === 0) {
        break
      }
    }
    const b = data.subarray(currOffset, i)
    const rest = decoder?.decode(b) ?? b.toString()
    currOffset = i + 1
    items.push({
      chromId,
      start,
      end,
      rest,
      uniqueId: `bb-${offset + c2}`,
    })
  }

  return items
}
