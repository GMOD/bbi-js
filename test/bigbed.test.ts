/* eslint @typescript-eslint/explicit-function-return-type: 0 */
import BED from '@gmod/bed'
import { BigBed } from '../src/'
import { LocalFile } from 'generic-filehandle'

describe('bigbed formats', () => {
  it('loads small bigbed file', async () => {
    const ti = new BigBed({
      path: require.resolve('./data/hg18.bb'),
    })
    const { autoSql } = await ti.getHeader()
    const feats = await ti.getFeatures('chr7', 0, 100000)
    const parser = new BED({ autoSql })
    const lines = feats.map(feat => {
      const { start, end, rest, uniqueId } = feat
      return parser.parseLine(`chr7\t${start}\t${end}\t${rest}`, { uniqueId })
    })
    expect(lines.slice(0, 5)).toMatchSnapshot()
  })
  it('loads volvox.bb', async () => {
    const filehandle = new LocalFile(require.resolve('./data/volvox.bb'))
    const ti = new BigBed({
      filehandle,
    })
    const spy = jest.spyOn(filehandle, 'read')
    const feats = await ti.getFeatures('chrA', 0, 160)
    expect(spy.mock.calls.length).toBeLessThanOrEqual(3)
    expect(feats).toEqual([])
  })
  it('searchExtraIdex returns null on file with no extra index', async () => {
    const ti = new BigBed({
      path: require.resolve('./data/volvox.bb'),
    })
    await ti.readIndices()
    const res = await ti.searchExtraIndex('EDEN.1')
    expect(res).toMatchSnapshot()
  })

  it('searchExtraIndex on file with no name index', async () => {
    const ti = new BigBed({
      path: require.resolve('./data/chr22.bb'),
    })
    await ti.readIndices()
    const res = await ti.searchExtraIndex('ENST00000467796.2')
    expect(res).toEqual([])
  })

  it('searchExtraIndex name in gencode', async () => {
    const ti = new BigBed({
      path: require.resolve('./data/chr22_with_name_index.bb'),
    })
    await ti.readIndices()
    const res = await ti.searchExtraIndex('ENST00000467796.2')
    expect(res).toMatchSnapshot()
  })

  it('searchExtraIndex in bigbed with multiple extra indexes on the gene name index', async () => {
    const ti = new BigBed({
      path: require.resolve('./data/chr22_with_name_and_geneName_index.bb'),
    })
    await ti.readIndices()
    const res2 = await ti.searchExtraIndex('SYCE3')
    expect(res2).toMatchSnapshot()
  })
  it('2057 contigs', async () => {
    const ti = new BigBed({
      path: require.resolve('./data/2057.bb'),
    })
    const header = await ti.getHeader()
    expect(Object.keys(header.refsByName).length).toEqual(2057)
  })
  it('bigbed file with large header', async () => {
    const filehandle = new LocalFile(require.resolve('./data/clinvarCnv.bb'))
    const ti = new BigBed({
      filehandle,
    })
    const spy = jest.spyOn(filehandle, 'read')
    const header = await ti.getHeader()
    expect(spy.mock.calls.length).toBeLessThanOrEqual(3)
    expect(header).toBeTruthy()
  })
  it('bigbed file consistent file ID', async () => {
    const filehandle = new LocalFile(require.resolve('./data/clinvarCnv.bb'))
    const ti = new BigBed({
      filehandle,
    })
    const feats1 = await ti.getFeatures('chr21', 8850000, 10050000)
    const feats2 = await ti.getFeatures('chr21', 9550000, 10750000)
    const f1 = feats1.find(f => f.start === 9734795)
    const f2 = feats2.find(f => f.start === 9734795)
    expect(f1?.uniqueId).toEqual(f2?.uniqueId)
    const f11 = feats1.filter(f => f.start === 9734795)
    const f22 = feats2.filter(f => f.start === 9734795)
    expect(f11).toEqual(f22)
  })
})
