import BigBed from '../src/bigbed'
import BED from '@gmod/bed'

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
  it('lookup returns null on file with no extra index', async () => {
    const ti = new BigBed({
      path: require.resolve('./data/volvox.bb'),
    })
    await ti.readIndices()
    const res = await ti.lookup('EDEN.1')
    expect(res).toMatchSnapshot()
  })
  it('lookup name in gencode', async () => {
    const ti = new BigBed({
      path: require.resolve('./data/gencode.bb'),
    })
    await ti.readIndices()
    const res = await ti.lookup('ENST00000023939.5')
    expect(res).toMatchSnapshot()
  })
})
