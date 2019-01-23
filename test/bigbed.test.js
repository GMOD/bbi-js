import BigWig from '../src/bigwig'

const LocalFile = require('../src/localFile')

describe('bigwig formats', () => {
  it('loads small bigwig file', async () => {
    const ti = new BigWig({
      filehandle: new LocalFile(require.resolve('./data/hg18.bb')),
    })
    await ti.getHeader()
    const feats1 = await ti.getFeatures('chr7', 0, 100000)
    expect(feats1).toMatchSnapshot()
  })

})
