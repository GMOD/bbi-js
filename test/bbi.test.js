const BBI = require('../src/bbi')
const LocalFile = require('../src/localFile')

describe('index formats', () => {
  it('loads small bigwig header', async () => {
    const ti = new BBI({
      filehandle: new LocalFile(require.resolve('./data/volvox.bw')),
    })
    const indexData = await ti.getHeader()
    expect(indexData).toMatchSnapshot()
    console.log(indexData)
  })
  it('loads small bigbed header', async () => {
    const ti = new BBI({
      filehandle: new LocalFile(require.resolve('./data/hg18.bb')),
    })
    const indexData = await ti.getHeader()
    expect(indexData).toMatchSnapshot()
    console.log(indexData)
  })
})


