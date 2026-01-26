import { readFileSync } from 'node:fs'
import { bench, describe } from 'vitest'

import { BigBed as BigBedBranch1 } from '../esm_branch1/index.js'
import { BigBed as BigBedBranch2 } from '../esm_branch2/index.js'

const branch1Name = readFileSync('esm_branch1/branchname.txt', 'utf8').trim()
const branch2Name = readFileSync('esm_branch2/branchname.txt', 'utf8').trim()

const defaultOpts = {
  iterations: 50,
  warmupIterations: 20,
}

// Reuse instances to isolate data parsing performance from instance creation
async function benchBigBed(
  name: string,
  path: string,
  chr: string,
  start: number,
  end: number,
  opts?: { iterations?: number; warmupIterations?: number },
) {
  // Pre-create instances and warm up headers
  const bb1 = new BigBedBranch1({ path })
  const bb2 = new BigBedBranch2({ path })
  await bb1.getHeader()
  await bb2.getHeader()

  describe(name, () => {
    bench(
      branch1Name,
      async () => {
        await bb1.getFeatures(chr, start, end)
      },
      { ...defaultOpts, ...opts },
    )

    bench(
      branch2Name,
      async () => {
        await bb2.getFeatures(chr, start, end)
      },
      { ...defaultOpts, ...opts },
    )
  })
}

// BigMaf slice - tests large rest strings (~16KB each)
await benchBigBed(
  'bigMafSlice.bb full region (4.4MB, 2442 features)',
  'test/data/bigMafSlice.bb',
  'chr1',
  57149977,
  57160722,
  { iterations: 30, warmupIterations: 10 },
)

// BigMaf with narrow filter - should show big improvement from filter-before-decode
await benchBigBed(
  'bigMafSlice.bb narrow filter',
  'test/data/bigMafSlice.bb',
  'chr1',
  57150000,
  57150100,
  { iterations: 50, warmupIterations: 20 },
)
