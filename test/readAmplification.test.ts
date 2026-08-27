import { LocalFile } from 'generic-filehandle2'
import { describe, expect, it } from 'vitest'

import { BigWig } from '../src/index.ts'

// Counts what a query actually pulls off disk, because over HTTP every one of
// these is a range request. The numbers here are the ones the README quotes.
class CountingFile extends LocalFile {
  reads: { position: number; length: number }[] = []

  override async read(length: number, position = 0) {
    const data = await super.read(length, position)
    this.reads.push({ position, length: data.length })
    return data
  }

  get bytes() {
    return this.reads.reduce((sum, r) => sum + r.length, 0)
  }

  // the chunk grid a byte-range cache lays over the file
  chunksTouched(chunkSize: number) {
    const chunks = new Set<number>()
    for (const { length, position } of this.reads) {
      const last = Math.floor((position + length - 1) / chunkSize)
      for (let c = Math.floor(position / chunkSize); c <= last; c++) {
        chunks.add(c)
      }
    }
    return chunks.size
  }
}

const CHUNK_SIZE = 256 * 1024

describe('what a query reads', () => {
  it('takes a pan across the file in reads that fall inside four chunks', async () => {
    const filehandle = new CountingFile('test/data/ENCFF826FLP.bw')
    const bw = new BigWig({ filehandle })
    await bw.getHeader()
    filehandle.reads = []

    const width = 100000
    for (let i = 0; i < 20; i++) {
      const start = 20000000 + (i * width) / 2
      await bw.getFeatures('chr22', start, start + width)
    }

    expect(filehandle.reads).toHaveLength(23)
    expect(filehandle.chunksTouched(CHUNK_SIZE)).toBe(4)
  })

  it('reads the R-tree nodes once and serves later queries from them', async () => {
    const filehandle = new CountingFile('test/data/ENCFF826FLP.bw')
    const bw = new BigWig({ filehandle })
    await bw.getHeader()

    filehandle.reads = []
    await bw.getFeatures('chr22', 20000000, 20100000)
    const first = filehandle.reads.length

    filehandle.reads = []
    await bw.getFeatures('chr22', 20100000, 20200000)
    expect(filehandle.reads.length).toBeLessThan(first)
    expect(filehandle.reads).toHaveLength(1)
  })
})
