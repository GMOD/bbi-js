import { Session } from 'node:inspector'
import { promisify } from 'node:util'
import { writeFile } from 'node:fs/promises'
import { BigWig } from '../src/bigwig.js'
import { LocalFile } from 'generic-filehandle2'

async function profileWithInspector() {
  const session = new Session()
  session.connect()

  const post = promisify(session.post.bind(session))

  console.log('Starting CPU profiler...')
  await post('Profiler.enable')
  await post('Profiler.start')

  console.log('Running BigWig operations...')

  const file = new LocalFile('test/data/cDC.bw')
  const bw = new BigWig({ filehandle: file })

  await bw.getHeader()

  for (let i = 0; i < 10; i++) {
    const features = await bw.getFeatures('chr1', i * 1000000, (i + 1) * 1000000, {
      scale: 1,
    })
    for await (const _ of features) {
    }
  }

  const zoomFeatures = await bw.getFeatures('chr1', 0, 10000000, { scale: 0.001 })
  for await (const _ of zoomFeatures) {
  }

  console.log('Stopping profiler...')
  const { profile } = (await post('Profiler.stop')) as { profile: unknown }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `cpu-profile-${timestamp}.cpuprofile`

  await writeFile(filename, JSON.stringify(profile))
  console.log(`\nCPU profile saved to: ${filename}`)
  console.log('Open this file in Chrome DevTools (Performance tab) to analyze')

  session.disconnect()
}

profileWithInspector().catch(console.error)
