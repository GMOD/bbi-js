import { readFileSync } from 'node:fs'
import { bench, describe } from 'vitest'

import {
  BigWig as BigWigBranch1,
  parseBigWig as parseBigWigBranch1,
} from '../esm_branch1/index.js'
import {
  BigWig as BigWigBranch2,
  parseBigWig as parseBigWigBranch2,
} from '../esm_branch2/index.js'

const branch1Name = readFileSync('esm_branch1/branchname.txt', 'utf8').trim()
const branch2Name = readFileSync('esm_branch2/branchname.txt', 'utf8').trim()

const defaultOpts = {
  iterations: 50,
  warmupIterations: 20,
}

// Reuse instances to isolate data parsing performance from instance creation
async function benchBigWig(
  name: string,
  path: string,
  opts?: { iterations?: number; warmupIterations?: number },
) {
  // Pre-create instances and warm up headers
  const bw1 = new BigWigBranch1({ path })
  const bw2 = new BigWigBranch2({ path })
  await bw1.getHeader()
  await bw2.getHeader()

  describe(name, () => {
    bench(
      branch1Name,
      async () => {
        await parseBigWigBranch1(bw1)
      },
      { ...defaultOpts, ...opts },
    )

    bench(
      branch2Name,
      async () => {
        await parseBigWigBranch2(bw2)
      },
      { ...defaultOpts, ...opts },
    )
  })
}

await benchBigWig('ENCFF826FLP.bw (2.7MB)', 'test/data/ENCFF826FLP.bw', {
  iterations: 30,
  warmupIterations: 10,
})
await benchBigWig(
  'example_bigwig_unsorted_with_error_small.bw (22MB)',
  'test/data/example_bigwig_unsorted_with_error_small.bw',
  { iterations: 15, warmupIterations: 5 },
)
await benchBigWig('cDC.bw (67MB)', 'test/data/cDC.bw', {
  iterations: 10,
  warmupIterations: 3,
})
