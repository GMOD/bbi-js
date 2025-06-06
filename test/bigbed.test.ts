import BED from '@gmod/bed'
import { LocalFile } from 'generic-filehandle2'
import { expect, test, vi } from 'vitest'

import { BigBed } from '../src/'

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
