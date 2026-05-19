import { expect, test } from 'vitest'

import { BigWig } from '../src/index.ts'

class BufferFilehandle {
  constructor(private buf: Uint8Array) {}
  read(length: number, position: number) {
    return Promise.resolve(this.buf.subarray(position, position + length))
  }
}

test('rejects on bad magic number', async () => {
  const buf = new Uint8Array(2048)
  new DataView(buf.buffer).setInt32(0, 0xdeadbeef, true)
  const ti = new BigWig({ filehandle: new BufferFilehandle(buf) })
  await expect(ti.getHeader()).rejects.toThrow(/not a BigWig\/BigBed file/)
})

test('rejects when totalSummaryOffset is zero', async () => {
  // Valid bigwig magic but the rest of the header (including totalSummaryOffset)
  // is zero, which triggers the "no stats" throw.
  const buf = new Uint8Array(2048)
  const view = new DataView(buf.buffer)
  view.setInt32(0, 0x888ffc26, true) // BIG_WIG_MAGIC, little-endian
  const ti = new BigWig({ filehandle: new BufferFilehandle(buf) })
  await expect(ti.getHeader()).rejects.toThrow(/no stats/)
})
