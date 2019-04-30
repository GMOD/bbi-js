/* eslint @typescript-eslint/explicit-function-return-type:0 */

import { LocalFile } from 'generic-filehandle'
import { BigBed, BigWig } from '../src/index'
import 'cross-fetch/polyfill'

describe('index formats', () => {
  it('loads small bigwig header', async () => {
    const ti = new BigWig({
      path: require.resolve('./data/volvox.bw'),
    })
    const indexData = await ti.getHeader()
    expect(indexData).toMatchSnapshot()
  })
  it('loads small bigbed header', async () => {
    const ti = new BigBed({
      path: require.resolve('./data/hg18.bb'),
    })
    const indexData = await ti.getHeader()
    expect(indexData).toMatchSnapshot()
  })
  it('uses filehandle argument', async () => {
    const ti = new BigBed({
      filehandle: new LocalFile(require.resolve('./data/hg18.bb')),
    })

    const indexData = await ti.getHeader()
    expect(indexData).toMatchSnapshot()
  })
  it('uses url argument', () => {
    const ti = new BigBed({
      url: 'http://localhost/test.bw',
    })
    expect(ti).toBeTruthy()
  })
  it('throws constructor', () => {
    expect(() => new BigBed()).toThrow(/no file/)
  })
})
