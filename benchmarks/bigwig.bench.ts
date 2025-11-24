import { bench, describe } from 'vitest'

import {
  BigWig as BigWigMaster,
  parseBigWig as parseBigWigMaster,
} from '../esm_master/index.js'
import {
  BigWig as BigWigOptimized,
  parseBigWig as parseBigWigOptimized,
} from '../esm_thisbranch/index.js'

function benchBigWig(name: string, path: string, opts?: { time?: number }) {
  describe(name, () => {
    bench(
      'master',
      async () => {
        const bw = new BigWigMaster({ path })
        await parseBigWigMaster(bw)
      },
      opts,
    )

    bench(
      'optimized',
      async () => {
        const bw = new BigWigOptimized({ path })
        await parseBigWigOptimized(bw)
      },
      opts,
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
benchBigWig('ENCFF826FLP.bw (2.7MB)', 'test/data/ENCFF826FLP.bw')
benchBigWig(
  'example_bigwig_unsorted_with_error_small.bw (22MB)',
  'test/data/example_bigwig_unsorted_with_error_small.bw',
)
benchBigWig('cDC.bw (67MB)', 'test/data/cDC.bw', { time: 10000 })
