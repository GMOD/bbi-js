import { readFileSync } from 'node:fs'
import { bench, describe } from 'vitest'

import { BigBed as BigBedBranch1 } from '../esm_branch1/index.js'
import { BigBed as BigBedBranch2 } from '../esm_branch2/index.js'

const branch1Name = readFileSync('esm_branch1/branchname.txt', 'utf8').trim()
const branch2Name = readFileSync('esm_branch2/branchname.txt', 'utf8').trim()

const defaultOpts = {
  iterations: 50,
  warmupIterations: 10,
}

function benchBigBed(
  name: string,
  path: string,
  chr: string,
  start: number,
  end: number,
  opts?: { iterations?: number },
) {
  describe(name, () => {
    bench(
      branch1Name,
      async () => {
        const bb = new BigBedBranch1({ path })
        await bb.getFeatures(chr, start, end)
      },
      { ...defaultOpts, ...opts },
    )

    bench(
      branch2Name,
      async () => {
        const bb = new BigBedBranch2({ path })
        await bb.getFeatures(chr, start, end)
      },
      { ...defaultOpts, ...opts },
    )
  })
}

benchBigBed('clinvarCnv.bb (3.5MB)', 'test/data/clinvarCnv.bb', 'chr1', 0, 10000000, {
  iterations: 20,
})

// BigMaf slice - tests large rest strings (~16KB each)
benchBigBed(
  'bigMafSlice.bb full region (4.4MB, 2442 features)',
  'test/data/bigMafSlice.bb',
  'chr1',
  57149977,
  57160722,
  { iterations: 20 },
)

// BigMaf with narrow filter - should show big improvement from filter-before-decode
benchBigBed(
  'bigMafSlice.bb narrow filter',
  'test/data/bigMafSlice.bb',
  'chr1',
  57150000,
  57150100,
  { iterations: 30 },
)
