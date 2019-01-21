const BBI = require('../src/bbi')
const LocalFile = require('../src/localFile')

describe('index formats', () => {
  it('loads small bigwig header', async () => {
    const ti = new BBI({
      filehandle: new LocalFile(require.resolve('./data/test.bw')),
    })
    const indexData = await ti.getHeader()
    expect(indexData).toMatchSnapshot()
  })
})
