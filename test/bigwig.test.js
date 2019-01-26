import "regenerator-runtime/runtime"

import BigWig from '../src/bigwig'
import LocalFile from '../src/localFile'
import RemoteFile from '../src/remoteFile'

describe('bigwig formats', () => {
  it('loads small bigwig file', async () => {
    const ti = new BigWig({
      filehandle: new LocalFile(require.resolve('./data/volvox.bw')),
    })
    const feats1 = await ti.getFeatures('ctgA', 0, 100, { scale: 1 })
    const feats2 = await ti.getFeatures('ctgA', 0, 100, { scale: 0.01 })
    const feats3 = await ti.getFeatures('ctgA', 0, 100, { scale: 0.001 })
    const feats4 = await ti.getFeatures('ctgA', 2000, 2100, { scale: 0.001 })
    const feats5 = await ti.getFeatures('ctgA', 20000, 21000)
    expect(feats1).toMatchSnapshot()
    expect(feats2).toMatchSnapshot()
    expect(feats3).toMatchSnapshot()
    expect(feats4).toMatchSnapshot()
    expect(feats5).toMatchSnapshot()
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
