import BigWig from '../src/bigwig'

const LocalFile = require('../src/localFile')

describe('bigwig formats', () => {
  it('loads small bigwig file', async () => {
    const ti = new BigWig({
      filehandle: new LocalFile(require.resolve('./data/volvox.bw')),
    })
    await ti.getHeader()
    const feats = await ti.getFeatures('ctgA', 0, 100, { scale: 1 })
    expect(feats).toMatchSnapshot()
  })
})
