import { readFileSync } from 'node:fs'
import { bench, describe } from 'vitest'

import { BigBed as BigBedBranch1 } from '../esm_branch1/index.js'
import { BigBed as BigBedBranch2 } from '../esm_branch2/index.js'

const branch1Name = readFileSync('esm_branch1/branchname.txt', 'utf8').trim()
const branch2Name = readFileSync('esm_branch2/branchname.txt', 'utf8').trim()

const defaultOpts = {
  iterations: 30,
  warmupIterations: 10,
}

// Simulate what jbrowse-components BigBedAdapter does:
// 1. Get features
// 2. Split rest string by tabs
// 3. Process each feature

const path = 'test/data/bigMafSlice.bb'
const chr = 'chr1'
const start = 57149977
const end = 57160722

// Pre-create instances and warm up headers
const bb1 = new BigBedBranch1({ path })
const bb2 = new BigBedBranch2({ path })
await bb1.getHeader()
await bb2.getHeader()

describe('BigBed jbrowse simulation - bigMafSlice.bb (4.4MB)', () => {
  bench(
    `${branch1Name} getFeatures`,
    async () => {
      const features = await bb1.getFeatures(chr, start, end)
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
      const features = await bb2.getFeatures(chr, start, end)
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
