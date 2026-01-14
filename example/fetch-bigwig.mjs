/**
 * Pure ESM example demonstrating @gmod/bbi usage
 *
 * Run with: node fetch-bigwig.mjs
 */

import { BigWig } from '@gmod/bbi'

const url =
  'https://jbrowse.org/code/jb2/main/test_data/volvox/volvox_microarray.bw'

async function main() {
  console.log('Creating BigWig instance...')
  const bigwig = new BigWig({ url })

  console.log('Fetching header...')
  const header = await bigwig.getHeader()

  console.log('\nFile info:')
  console.log(`  Type: ${header.fileType}`)
  console.log(`  Version: ${header.version}`)
  console.log(`  Zoom levels: ${header.numZoomLevels}`)
  console.log(`  Chromosomes: ${header.refsByNumber.length}`)

  console.log('\nChromosomes:')
  for (const ref of header.refsByNumber) {
    console.log(`  ${ref.name}: ${ref.length.toLocaleString()} bp`)
  }

  console.log('\nFetching features for ctgA:0-40000...')
  const features = await bigwig.getFeatures('ctgA', 0, 40000)

  console.log(`\nFound ${features.length} features`)
  console.log('\nFirst 5 features:')
  for (const f of features.slice(0, 5)) {
    console.log(`  ${f.start}-${f.end}: ${f.score}`)
  }
}

main().catch(console.error)
