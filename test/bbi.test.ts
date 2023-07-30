import { LocalFile } from 'generic-filehandle'
import { BigBed, BigWig } from '../src/index'
import { TextDecoder } from 'util'

// @ts-expect-error
window.TextDecoder = TextDecoder

test('loads small bigwig header', async () => {
  const ti = new BigWig({
    path: 'test/data/volvox.bw',
  })
  const indexData = await ti.getHeader()
  expect(indexData).toMatchSnapshot()
})
test('loads small bigbed header', async () => {
  const ti = new BigBed({
    path: 'test/data/hg18.bb',
  })
  const indexData = await ti.getHeader()
  expect(indexData).toMatchSnapshot()
})
test('uses filehandle argument', async () => {
  const ti = new BigBed({
    filehandle: new LocalFile('test/data/hg18.bb'),
  })

  const indexData = await ti.getHeader()
  expect(indexData).toMatchSnapshot()
})
