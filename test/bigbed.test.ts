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
      return parser.parseBedText('chr7', feat.start, feat.end, feat.rest, { uniqueId: feat.uniqueId, offset: 3 })
    })
    expect(lines.slice(0, 5)).toMatchSnapshot()
  })
  it('loads volvox.bb', async () => {
    const ti = new BigBed({
      path: require.resolve('./data/volvox.bb'),
    })
    await ti.getHeader()
    const feats = await ti.getFeatures('chrA', 0, 160)
    expect(feats).toEqual([])
  })
})
