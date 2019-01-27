import "regenerator-runtime/runtime"
import {BigWig} from '../../src/index'
import RemoteFile from '../../src/remoteFile'

describe("test a bigwig file", () => {
  it("check it out", async () => {
    const bbi = new BigWig({
      filehandle: new RemoteFile('base/test/data/volvox.bw')
    })
    const header = await bbi.getHeader()
    var feats = await bbi.getFeatures('ctgA',20000,30000)
    expect(feats.length).toEqual(5313)
    expect(feats[0].score).toEqual(19)
  })


  it('inside file deeply', async () => {
    const bbi = new BigWig({
      filehandle: new RemoteFile('base/test/data/volvox.bw')
    })
    const header = await bbi.getHeader()
    const feats = await bbi.getFeatures('ctgA', 20000, 21000)
    expect(feats[0].score).toEqual(19)
  })
})
