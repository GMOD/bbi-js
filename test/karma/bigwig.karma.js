import "regenerator-runtime/runtime"
import {BigWig} from '../../src/index'
import RemoteFile from '../../src/remoteFile'
console.log("WOWOWOWOW")
console.log(BigWig, RemoteFile)


describe("wtf", () => {
  it("wtf2", async () => {
    const bbi = new BigWig({
      filehandle: new RemoteFile('base/test/data/volvox.bw')
    })
    const header = await bbi.getHeader()
    var feat = await bbi.getFeatures('ctgA',20000,21000)
    console.log(feat)
    expect(1).toEqual(1)
  })
})
