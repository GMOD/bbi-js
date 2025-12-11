import { Session } from 'node:inspector/promises'
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { BigWig, parseBigWig } = require('../dist/index.js')

const session = new Session()
session.connect()

async function profile(name, path) {
  console.log(`Profiling ${name}...`)

  // Warm up
  const bw = new BigWig({ path })
  await parseBigWig(bw)

  // Profile
  await session.post('Profiler.enable')
  await session.post('Profiler.start')

  const bw2 = new BigWig({ path })
  await parseBigWig(bw2)

  const { profile } = await session.post('Profiler.stop')

  const filename = `${name.replace(/[^a-zA-Z0-9]/g, '_')}.cpuprofile`
  writeFileSync(filename, JSON.stringify(profile))
  console.log(`Wrote ${filename}`)
}

async function main() {
  const files = [
    ['cDC.bw', 'test/data/cDC.bw'],
    ['ENCFF826FLP.bw', 'test/data/ENCFF826FLP.bw'],
    [
      'example_bigwig_unsorted_with_error_small.bw',
      'test/data/example_bigwig_unsorted_with_error_small.bw',
    ],
  ]

  for (const [name, path] of files) {
    await profile(name, path)
  }

  session.disconnect()
}

main().catch(console.error)
