import "regenerator-runtime/runtime"
import {BigWig} from '../../src/index'
import RemoteFile from '../../src/remoteFile'

describe("test a bigwig file", () => {
  it("check it out", async () => {
    const bbi = new BigWig({
      filehandle: new RemoteFile('base/test/data/volvox.bw')
    })
    const header = await bbi.getHeader()
    var feat = await bbi.getFeatures('ctgA',20000,30000)
    console.log(feat)
    expect(1).toEqual(1)
  })
})
