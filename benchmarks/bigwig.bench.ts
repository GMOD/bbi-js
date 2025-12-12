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
  warmupIterations: 10,
}

function benchBigWig(name: string, path: string, opts?: { time?: number }) {
  describe(name, () => {
    bench(
      branch1Name,
      async () => {
        const bw = new BigWigBranch1({ path })
        await parseBigWigBranch1(bw)
      },
      { ...defaultOpts, ...opts },
    )

    bench(
      branch2Name,
      async () => {
        const bw = new BigWigBranch2({ path })
        await parseBigWigBranch2(bw)
      },
      { ...defaultOpts, ...opts },
    )
  })
}

benchBigWig('volvox.bw (209KB)', 'test/data/volvox.bw')
benchBigWig(
  'volvox_microarray.bw (98KB, fixed step)',
  'test/data/volvox_microarray.bw',
)
benchBigWig('variable_step.bw (19KB)', 'test/data/variable_step.bw')
benchBigWig('fixedStep.bw (698KB)', 'test/data/fixedStep.bw')
benchBigWig('uncompressed.bw (1.0MB)', 'test/data/uncompressed.bw')
benchBigWig('cow.bw (638KB)', 'test/data/cow.bw')
benchBigWig('ENCFF826FLP.bw (2.7MB)', 'test/data/ENCFF826FLP.bw', {
  iterations: 20,
})
benchBigWig(
  'example_bigwig_unsorted_with_error_small.bw (22MB)',
  'test/data/example_bigwig_unsorted_with_error_small.bw',
  { iterations: 10 },
)
benchBigWig('cDC.bw (67MB)', 'test/data/cDC.bw', { iterations: 5 })
