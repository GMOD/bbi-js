/* eslint @typescript-eslint/explicit-function-return-type: 0 */
import BED from '@gmod/bed'
import { BigBed } from '../src/'

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
    const ti = new BigBed({
      path: require.resolve('./data/volvox.bb'),
    })
    const feats = await ti.getFeatures('chrA', 0, 160)
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
})
