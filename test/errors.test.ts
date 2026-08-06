import { expect, test } from 'vitest'

import { FilehandleDouble } from './filehandle-double.ts'
import { BigWig } from '../src/index.ts'

class BufferFilehandle extends FilehandleDouble {
  private buf: Uint8Array<ArrayBuffer>
  constructor(buf: Uint8Array<ArrayBuffer>) {
    super()
    this.buf = buf
  }
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

test('rejects with a clear error when totalSummaryOffset is past EOF', async () => {
  // Truncated/corrupt file: the header points the totalSummary struct past the
  // last byte. Used to surface as a bare DataView "Start offset N is outside
  // the bounds of the buffer".
  const buf = new Uint8Array(2048)
  const view = new DataView(buf.buffer)
  view.setInt32(0, 0x888ffc26, true) // BIG_WIG_MAGIC, little-endian
  view.setUint32(44, 1_000_000, true) // totalSummaryOffset
  const ti = new BigWig({ filehandle: new BufferFilehandle(buf) })
  await expect(ti.getHeader()).rejects.toThrow(
    /totalSummary at offset 1000000 extends past the end of the file \(2048 bytes\), file may be truncated or corrupt/,
  )
})
