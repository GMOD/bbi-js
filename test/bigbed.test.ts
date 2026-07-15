import BED from '@gmod/bed'
import { LocalFile } from 'generic-filehandle2'
import { expect, test, vi } from 'vitest'

import { BigBed } from '../src/index.ts'

test('loads small bigbed file', async () => {
  const ti = new BigBed({ path: 'test/data/hg18.bb' })
  const { autoSql } = await ti.getHeader()
  const feats = await ti.getFeatures('chr7', 0, 100000)
  const parser = new BED({ autoSql })
  const lines = feats.map(feat => {
    const { start, end, rest, uniqueId } = feat
    return parser.parseLine(`chr7\t${start}\t${end}\t${rest}`, { uniqueId })
  })
  expect(lines.slice(0, 5)).toMatchSnapshot()
})
test('loads volvox.bb', async () => {
  const filehandle = new LocalFile('test/data/volvox.bb')
  const ti = new BigBed({ filehandle })
  const spy = vi.spyOn(filehandle, 'read')
  const feats = await ti.getFeatures('chrA', 0, 160)
  expect(spy.mock.calls.length).toBeLessThanOrEqual(5)
  expect(feats).toEqual([])
})
test('searchExtraIdex returns null on file with no extra index', async () => {
  const ti = new BigBed({ path: 'test/data/volvox.bb' })
  await ti.readIndices()
  const res = await ti.searchExtraIndex('EDEN.1')
  expect(res).toMatchSnapshot()
})

test('searchExtraIndex on file with no name index', async () => {
  const ti = new BigBed({ path: 'test/data/chr22.bb' })
  await ti.readIndices()
  const res = await ti.searchExtraIndex('ENST00000467796.2')
  expect(res).toEqual([])
})

test('searchExtraIndex name in gencode', async () => {
  const ti = new BigBed({ path: 'test/data/chr22_with_name_index.bb' })
  await ti.readIndices()
  const res = await ti.searchExtraIndex('ENST00000467796.2')
  expect(res).toMatchSnapshot()
})

test('searchExtraIndex in bigbed with multiple extra indexes on the gene name index', async () => {
  const t = new BigBed({
    path: 'test/data/chr22_with_name_and_geneName_index.bb',
  })
  await t.readIndices()
  const res2 = await t.searchExtraIndex('SYCE3')
  expect(res2).toMatchSnapshot()
})
// keys with underscores or that sit next to them in byte order (e.g.
// "Metazoa_SRP", "YWHAH") are ordered by memcmp in the B+ tree; a
// locale-collated binary search branches wrong and misses them
test('searchExtraIndex finds names where byte order != locale order', async () => {
  const t = new BigBed({
    path: 'test/data/chr22_with_name_and_geneName_index.bb',
  })
  await t.readIndices()
  // both previously returned [] because localeCompare ordered '_' and mixed
  // case differently from the file's byte order
  expect((await t.searchExtraIndex('Metazoa_SRP')).length).toBeGreaterThan(0)
  expect((await t.searchExtraIndex('YWHAH')).length).toBeGreaterThan(0)
})

// a gene with many transcripts has many index entries pointing at different
// data blocks; the leaf search must return the whole run, not a single entry
test('searchExtraIndex returns all records for a name spanning many blocks', async () => {
  const t = new BigBed({
    path: 'test/data/chr22_with_name_and_geneName_index.bb',
  })
  await t.readIndices()
  // CTA-125H2.2 has 28 transcript records; a single-entry search returned 11
  const res = await t.searchExtraIndex('CTA-125H2.2')
  expect(res.length).toBe(28)
  expect(new Set(res.map(f => f.uniqueId)).size).toBe(res.length)
})
test('2057 contigs', async () => {
  const ti = new BigBed({ path: 'test/data/2057.bb' })
  const header = await ti.getHeader()
  expect(Object.keys(header.refsByName).length).toEqual(2057)
})
test('bigbed file with large header', async () => {
  const filehandle = new LocalFile('test/data/clinvarCnv.bb')
  const ti = new BigBed({ filehandle })
  const spy = vi.spyOn(filehandle, 'read')
  const header = await ti.getHeader()
  expect(spy.mock.calls.length).toBeLessThanOrEqual(5)
  expect(header).toBeTruthy()
})
test('bigbed file consistent file ID', async () => {
  const filehandle = new LocalFile('test/data/clinvarCnv.bb')
  const ti = new BigBed({ filehandle })
  const feats1 = await ti.getFeatures('chr21', 8850000, 10050000)
  const feats2 = await ti.getFeatures('chr21', 9550000, 10750000)
  const f1 = feats1.find(f => f.start === 9734795)
  const f2 = feats2.find(f => f.start === 9734795)
  expect(f1?.uniqueId).toEqual(f2?.uniqueId)
  const f11 = feats1.filter(f => f.start === 9734795)
  const f22 = feats2.filter(f => f.start === 9734795)
  expect(f11).toEqual(f22)
})

test('bigbed feature uniqueIds are unique across blocks', async () => {
  const ti = new BigBed({ path: 'test/data/chr22_with_name_index.bb' })
  const { refsByNumber } = await ti.getHeader()
  const ref = Object.values(refsByNumber)[0]!
  const feats = await ti.getFeatures(ref.name, 0, ref.length)
  const ids = feats.map(f => f.uniqueId)
  expect(feats.length).toBeGreaterThan(1000)
  expect(new Set(ids).size).toEqual(feats.length)
})

test('transcripts.bb', async () => {
  const filehandle = new LocalFile('test/data/transcripts.bb')
  const ti = new BigBed({ filehandle })
  await ti.getFeatures('1', 0, 20000)
})

test('crash', async () => {
  const filehandle = new LocalFile('test/data/unipLocCytopl.bb')
  const ti = new BigBed({ filehandle })
  const h = await ti.getHeader()
  expect(h).toMatchSnapshot()
})

test('_readIndices forwards abort signal to underlying reads', async () => {
  const filehandle = new LocalFile('test/data/chr22_with_name_index.bb')
  const ti = new BigBed({ filehandle })
  await ti.getHeader()

  const aborter = new AbortController()
  const spy = vi.spyOn(filehandle, 'read')

  await ti.readIndices({ signal: aborter.signal })

  for (const call of spy.mock.calls) {
    // bbi-js calls filehandle.read(length, position, opts); LocalFile's typed
    // arity is 2 but the third arg is forwarded at runtime
    const opts = (
      call as unknown as [number, number, { signal?: AbortSignal }]
    )[2]
    expect(opts).toMatchObject({ signal: aborter.signal })
  }
})

test('getRegionByteSize reports a positive compressed size for a populated region', async () => {
  const ti = new BigBed({ path: 'test/data/hg18.bb' })
  const bytes = await ti.getRegionByteSize('chr7', 0, 100000)
  expect(bytes).toBeGreaterThan(0)
})

test('getRegionByteSize reads only the index, not the feature blocks', async () => {
  // getFeatures reads the R-tree index AND downloads every overlapping block;
  // getRegionByteSize reads the index alone. So the byte-size probe must move
  // far fewer bytes off disk than the equivalent feature fetch.
  const probeHandle = new LocalFile('test/data/hg18.bb')
  const probeSpy = vi.spyOn(probeHandle, 'read')
  await new BigBed({ filehandle: probeHandle }).getRegionByteSize(
    'chr7',
    0,
    1_000_000,
  )
  const probeBytes = probeSpy.mock.calls.reduce(
    (sum, call) => sum + (call[0]),
    0,
  )

  const fetchHandle = new LocalFile('test/data/hg18.bb')
  const fetchSpy = vi.spyOn(fetchHandle, 'read')
  await new BigBed({ filehandle: fetchHandle }).getFeatures('chr7', 0, 1_000_000)
  const fetchBytes = fetchSpy.mock.calls.reduce(
    (sum, call) => sum + (call[0]),
    0,
  )

  expect(probeBytes).toBeLessThan(fetchBytes)
})

test('getRegionByteSize is zero for an absent ref', async () => {
  const ti = new BigBed({ path: 'test/data/hg18.bb' })
  expect(await ti.getRegionByteSize('nonexistent', 0, 100000)).toBe(0)
})

test('getRegionByteSizeMulti dedupes blocks shared across adjacent regions', async () => {
  const ti = new BigBed({ path: 'test/data/hg18.bb' })
  const whole = await ti.getRegionByteSize('chr7', 0, 100000)
  const split = await ti.getRegionByteSizeMulti([
    { refName: 'chr7', start: 0, end: 50000 },
    { refName: 'chr7', start: 50000, end: 100000 },
  ])
  // splitting the span in two and deduping by offset recovers the same set of
  // blocks as one query over the union — not a doubled count
  expect(split).toBe(whole)
})
