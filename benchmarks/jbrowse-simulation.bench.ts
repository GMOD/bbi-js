import { readFileSync } from 'node:fs'
import { bench, describe } from 'vitest'

import { BigBed as BigBedBranch1 } from '../esm_branch1/index.js'
import { BigBed as BigBedBranch2 } from '../esm_branch2/index.js'

const branch1Name = readFileSync('esm_branch1/branchname.txt', 'utf8').trim()
const branch2Name = readFileSync('esm_branch2/branchname.txt', 'utf8').trim()

const defaultOpts = {
  iterations: 20,
  warmupIterations: 5,
}

// Simulate what jbrowse-components BigBedAdapter does:
// 1. Get features
// 2. Split rest string by tabs
// 3. Process each feature

describe('BigBed jbrowse simulation - clinvarCnv.bb (3.5MB)', () => {
  const path = 'test/data/clinvarCnv.bb'
  const chr = 'chr1'
  const start = 0
  const end = 10000000

  // Current approach: getFeatures() returns Feature objects
  bench(
    `${branch1Name} getFeatures`,
    async () => {
      const bb = new BigBedBranch1({ path })
      const features = await bb.getFeatures(chr, start, end)
      // Simulate jbrowse processing
      let count = 0
      for (const feat of features) {
        const fields = feat.rest?.split('\t') || []
        count += fields.length + feat.start + feat.end
      }
      return count
    },
    defaultOpts,
  )

  bench(
    `${branch2Name} getFeatures`,
    async () => {
      const bb = new BigBedBranch2({ path })
      const features = await bb.getFeatures(chr, start, end)
      // Simulate jbrowse processing
      let count = 0
      for (const feat of features) {
        const fields = feat.rest?.split('\t') || []
        count += fields.length + feat.start + feat.end
      }
      return count
    },
    defaultOpts,
  )
})

describe('BigBed jbrowse simulation - bigMafSlice.bb (4.4MB)', () => {
  const path = 'test/data/bigMafSlice.bb'
  const chr = 'chr1'
  const start = 57149977
  const end = 57160722

  bench(
    `${branch1Name} getFeatures`,
    async () => {
      const bb = new BigBedBranch1({ path })
      const features = await bb.getFeatures(chr, start, end)
      let count = 0
      for (const feat of features) {
        const fields = feat.rest?.split('\t') || []
        count += fields.length + feat.start + feat.end
      }
      return count
    },
    defaultOpts,
  )

  bench(
    `${branch2Name} getFeatures`,
    async () => {
      const bb = new BigBedBranch2({ path })
      const features = await bb.getFeatures(chr, start, end)
      let count = 0
      for (const feat of features) {
        const fields = feat.rest?.split('\t') || []
        count += fields.length + feat.start + feat.end
      }
      return count
    },
    defaultOpts,
  )
})
