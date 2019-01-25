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
    expect(feats1).toMatchSnapshot()
    expect(feats2).toMatchSnapshot()
    expect(feats3).toMatchSnapshot()
    const feats4 = await ti.getFeatures('ctgA', 0, 1000)
    const feats5 = await ti.getFeatures('ctgA', 2000, 2100, { scale: 0.001 })
  })

  it('loads a larger bigwig file', async () => {
    const ti = new BigWig({
      filehandle: new LocalFile(require.resolve('./data/cow.bw')),
    })
    const feats1 = await ti.getFeatures('GK000001.2', 10000, 20000, { scale: 1 })
    console.log(feats1)
    expect(feats1).toMatchSnapshot()
  })
})


describe('bigwig formats remote', () => {
  it('loads small bigwig file remote', async () => {
    const ti = new BigWig({
      filehandle: new RemoteFile('http://localhost/volvox.bw'),
    })
    const feats1 = await ti.getFeatures('ctgA', 0, 100, { scale: 1 })
    const feats2 = await ti.getFeatures('ctgA', 0, 100, { scale: 0.01 })
    const feats3 = await ti.getFeatures('ctgA', 0, 100, { scale: 0.001 })
    expect(feats1).toMatchSnapshot()
    expect(feats2).toMatchSnapshot()
    expect(feats3).toMatchSnapshot()
    const feats4 = await ti.getFeatures('ctgA', 0, 1000)
    const feats5 = await ti.getFeatures('ctgA', 2000, 2100, { scale: 0.001 })
  })

  it('loads a larger bigwig file remote', async () => {
    const ti = new BigWig({
      filehandle: new RemoteFile('http://localhost/cow.bw'),
    })
    const feats1 = await ti.getFeatures('GK000001.2', 10000, 20000, { scale: 1 })
    console.log(feats1)
    expect(feats1).toMatchSnapshot()
  })
})
