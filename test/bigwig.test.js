import BigWig from '../src/bigwig'

const LocalFile = require('../src/localFile')
const RemoteFile = require('../src/remoteFile')

describe('bigwig formats', () => {
  it('loads small bigwig file', async () => {
    const ti = new BigWig({
      filehandle: new LocalFile(require.resolve('./data/volvox.bw')),
    })
    const feats1 = await ti.getFeatures('ctgA', 0, 100, { scale: 1 })
    const feats2 = await ti.getFeatures('ctgA', 0, 100, { scale: 0.01 })
    const feats3 = await ti.getFeatures('ctgA', 0, 100, { scale: 0.001 })
    const feats4 = await ti.getFeatures('ctgA', 2000, 2100, { scale: 0.001 })
    expect(feats1).toMatchSnapshot()
    expect(feats2).toMatchSnapshot()
    expect(feats3).toMatchSnapshot()
    expect(feats4).toMatchSnapshot()
  })

  it('loads a larger bigwig file', async () => {
    const ti = new BigWig({
      filehandle: new LocalFile(require.resolve('./data/cow.bw')),
    })
    const feats1 = await ti.getFeatures('GK000001.2', 2000000, 2100000, {
      scale: 1,
    })
    expect(feats1).toMatchSnapshot()
  })
})

if (process.env.REMOTE) {
  describe('bigwig formats remote', () => {
    it('loads small bigwig file remote', async () => {
      const ti = new BigWig({
        filehandle: new RemoteFile('http://localhost:8080/test/data/volvox.bw'),
      })
      const feats1 = await ti.getFeatures('ctgA', 0, 100, { scale: 1 })
      const feats2 = await ti.getFeatures('ctgA', 0, 100, { scale: 0.01 })
      const feats3 = await ti.getFeatures('ctgA', 0, 100, { scale: 0.001 })
      const feats4 = await ti.getFeatures('ctgA', 2000, 2100, { scale: 0.001 })
      expect(feats1).toMatchSnapshot()
      expect(feats2).toMatchSnapshot()
      expect(feats3).toMatchSnapshot()
      expect(feats4).toMatchSnapshot()
    })

    it('loads a larger bigwig file remote', async () => {
      const ti = new BigWig({
        filehandle: new RemoteFile('http://localhost:8080/test/data/cow.bw'),
      })
      const feats1 = await ti.getFeatures('GK000001.2', 2000000, 2100000, {
        scale: 1,
      })
      expect(feats1).toMatchSnapshot()
    })
  })
}
