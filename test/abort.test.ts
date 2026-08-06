import { LocalFile } from 'generic-filehandle2'
import { expect, test } from 'vitest'

import { FilehandleDouble } from './filehandle-double.ts'
import { BigBed, BigWig } from '../src/index.ts'

import type { FilehandleOptions, GenericFilehandle } from 'generic-filehandle2'

// Wraps a filehandle so every read takes a tick and honors AbortSignal, the way
// a real RemoteFile does. LocalFile resolves too fast (and ignores the signal)
// to expose a shared-promise race.
class SlowFile extends FilehandleDouble {
  reads = 0
  private inner: GenericFilehandle
  private latencyMs: number
  constructor(inner: GenericFilehandle, latencyMs = 20) {
    super()
    this.inner = inner
    this.latencyMs = latencyMs
  }
  async read(length: number, position: number, opts?: FilehandleOptions) {
    this.reads++
    await new Promise((resolve, reject) => {
      const id = setTimeout(resolve, this.latencyMs)
      opts?.signal?.addEventListener('abort', () => {
        clearTimeout(id)
        reject(new DOMException('aborted', 'AbortError'))
      })
    })
    opts?.signal?.throwIfAborted()
    return this.inner.read(length, position, opts)
  }
}

// Fails the first read, then delegates. Used to check that a rejected shared
// read is evicted rather than cached.
class FlakyFile extends FilehandleDouble {
  private inner: GenericFilehandle
  private failed = false
  constructor(inner: GenericFilehandle) {
    super()
    this.inner = inner
  }
  read(length: number, position: number, opts?: FilehandleOptions) {
    if (!this.failed) {
      this.failed = true
      return Promise.reject(new Error('transient network failure'))
    }
    return this.inner.read(length, position, opts)
  }
}

// A memoized promise built from the first caller's signal used to reject every
// other caller that awaited it. In JBrowse the adapter is shared across a
// track's region blocks, so panning away from one block (which aborts it) would
// fail the siblings the user still wants. Each of the three shared reads below
// - file header, R-tree index header, bigbed extra-index list - had that bug.

test('aborting one getHeader caller does not reject a concurrent one', async () => {
  const bw = new BigWig({
    filehandle: new SlowFile(new LocalFile('test/data/volvox.bw')),
  })
  const ac = new AbortController()
  const aborted = bw.getHeader({ signal: ac.signal })
  const innocent = bw.getHeader()
  ac.abort()

  await expect(aborted).rejects.toThrow()
  await expect(innocent).resolves.toMatchObject({ fileType: 'bigwig' })
})

test('aborting one getFeatures caller does not reject a concurrent one', async () => {
  const bw = new BigWig({
    filehandle: new SlowFile(new LocalFile('test/data/volvox.bw')),
  })
  // resolve the header first so the race is over the R-tree header read
  await bw.getHeader()
  const ac = new AbortController()
  const aborted = bw.getFeatures('ctgA', 0, 100_000, { signal: ac.signal })
  const innocent = bw.getFeatures('ctgA', 0, 100_000)
  ac.abort()

  await expect(aborted).rejects.toThrow()
  expect((await innocent).length).toBeGreaterThan(0)
})

test('aborting one readIndices caller does not reject a concurrent one', async () => {
  const bb = new BigBed({
    filehandle: new SlowFile(
      new LocalFile('test/data/chr22_with_name_and_geneName_index.bb'),
    ),
  })
  await bb.getHeader()
  const ac = new AbortController()
  const aborted = bb.readIndices({ signal: ac.signal })
  const innocent = bb.readIndices()
  ac.abort()

  await expect(aborted).rejects.toThrow()
  expect((await innocent).length).toBeGreaterThan(0)
})

test('a failed shared read is retried rather than cached', async () => {
  // The cache evicts on rejection, so a transient failure must not poison every
  // later getHeader on the same instance.
  const bw = new BigWig({
    filehandle: new FlakyFile(new LocalFile('test/data/volvox.bw')),
  })

  await expect(bw.getHeader()).rejects.toThrow(/transient network failure/)
  await expect(bw.getHeader()).resolves.toMatchObject({ fileType: 'bigwig' })
})

test('an aborted request does not poison later requests', async () => {
  const bw = new BigWig({
    filehandle: new SlowFile(new LocalFile('test/data/volvox.bw')),
  })
  const ac = new AbortController()
  const aborted = bw.getHeader({ signal: ac.signal })
  ac.abort()
  await expect(aborted).rejects.toThrow()

  await expect(bw.getHeader()).resolves.toMatchObject({ fileType: 'bigwig' })
})
