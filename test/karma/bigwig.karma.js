import { BigWig } from '../../src/index'
import RemoteFile from '../lib/remoteFile'

describe('test a bigwig file', () => {
  it('check it out', async () => {
    const bbi = new BigWig({
      filehandle: new RemoteFile('base/test/data/volvox.bw'),
    })
    const feats = await bbi.getFeatures('ctgA', 20000, 30000)
    expect(feats.length).toEqual(10002)
    expect(feats[0].score).toEqual(19)
  })

  it('inside file deeply', async () => {
    const bbi = new BigWig({
      filehandle: new RemoteFile('base/test/data/volvox.bw'),
    })
    const feats1 = await bbi.getFeatures('ctgA', 20001, 21000)
    expect(feats1[0].score).toEqual(19)
  })
})
