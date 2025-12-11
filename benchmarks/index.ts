import { BigWig } from '../src/bigwig.js'
import { BigBed } from '../src/bigbed.js'
import { LocalFile } from 'generic-filehandle2'
import { performance } from 'node:perf_hooks'

interface BenchmarkResult {
  name: string
  ops: number
  mean: number
  median: number
  min: number
  max: number
  stdDev: number
  samples: number
}

async function benchmark(
  name: string,
  fn: () => Promise<void>,
  iterations = 10,
): Promise<BenchmarkResult> {
  const times: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await fn()
    const end = performance.now()
    times.push(end - start)
  }

  times.sort((a, b) => a - b)
  const mean = times.reduce((a, b) => a + b, 0) / times.length
  const median = times[Math.floor(times.length / 2)]
  const min = times[0]
  const max = times[times.length - 1]

  const variance =
    times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) /
    times.length
  const stdDev = Math.sqrt(variance)

  const ops = 1000 / mean

  return {
    name,
    ops,
    mean,
    median,
    min,
    max,
    stdDev,
    samples: iterations,
  }
}

function formatResult(result: BenchmarkResult) {
  console.log(`\n${result.name}`)
  console.log(`  ${result.ops.toFixed(2)} ops/sec`)
  console.log(`  ${result.mean.toFixed(2)}ms mean`)
  console.log(`  ${result.median.toFixed(2)}ms median`)
  console.log(`  ${result.min.toFixed(2)}ms min`)
  console.log(`  ${result.max.toFixed(2)}ms max`)
  console.log(`  ±${result.stdDev.toFixed(2)}ms std dev`)
  console.log(`  ${result.samples} samples`)
}

async function runBenchmarks() {
  console.log('='.repeat(60))
  console.log('BigWig/BigBed Performance Benchmarks')
  console.log('='.repeat(60))

  const results: BenchmarkResult[] = []

  console.log('\n--- Header Parsing ---')

  results.push(
    await benchmark('BigWig header (small: volvox.bw 209KB)', async () => {
      const file = new LocalFile('test/data/volvox.bw')
      const bw = new BigWig({ filehandle: file })
      await bw.getHeader()
    }),
  )

  results.push(
    await benchmark('BigWig header (medium: cow.bw 638KB)', async () => {
      const file = new LocalFile('test/data/cow.bw')
      const bw = new BigWig({ filehandle: file })
      await bw.getHeader()
    }),
  )

  results.push(
    await benchmark('BigWig header (large: cDC.bw 67MB)', async () => {
      const file = new LocalFile('test/data/cDC.bw')
      const bw = new BigWig({ filehandle: file })
      await bw.getHeader()
    }),
  )

  results.push(
    await benchmark('BigBed header (small: volvox.bb 27KB)', async () => {
      const file = new LocalFile('test/data/volvox.bb')
      const bb = new BigBed({ filehandle: file })
      await bb.getHeader()
    }),
  )

  results.push(
    await benchmark(
      'BigBed header (many contigs: 2057.bb 2057 contigs)',
      async () => {
        const file = new LocalFile('test/data/2057.bb')
        const bb = new BigBed({ filehandle: file })
        await bb.getHeader()
      },
    ),
  )

  console.log('\n--- Small Region Queries (100-1000bp) ---')

  results.push(
    await benchmark(
      'BigWig small region query (volvox chr1:1-1000)',
      async () => {
        const file = new LocalFile('test/data/volvox.bw')
        const bw = new BigWig({ filehandle: file })
        const features = await bw.getFeatures('ctgA', 0, 1000, { scale: 1 })
        for await (const _ of features) {
        }
      },
    ),
  )

  results.push(
    await benchmark(
      'BigWig small region query (cDC.bw chr1:1000000-1001000)',
      async () => {
        const file = new LocalFile('test/data/cDC.bw')
        const bw = new BigWig({ filehandle: file })
        const features = await bw.getFeatures('chr1', 1000000, 1001000, {
          scale: 1,
        })
        for await (const _ of features) {
        }
      },
    ),
  )

  results.push(
    await benchmark(
      'BigBed small region query (volvox.bb ctgA:1-1000)',
      async () => {
        const file = new LocalFile('test/data/volvox.bb')
        const bb = new BigBed({ filehandle: file })
        const features = await bb.getFeatures('ctgA', 0, 1000)
        for await (const _ of features) {
        }
      },
    ),
  )

  console.log('\n--- Medium Region Queries (10KB-100KB) ---')

  results.push(
    await benchmark(
      'BigWig medium region query (volvox chr1:1-50000)',
      async () => {
        const file = new LocalFile('test/data/volvox.bw')
        const bw = new BigWig({ filehandle: file })
        const features = await bw.getFeatures('ctgA', 0, 50000, { scale: 1 })
        for await (const _ of features) {
        }
      },
    ),
  )

  results.push(
    await benchmark(
      'BigWig medium region query (cDC.bw chr1:1000000-1100000)',
      async () => {
        const file = new LocalFile('test/data/cDC.bw')
        const bw = new BigWig({ filehandle: file })
        const features = await bw.getFeatures('chr1', 1000000, 1100000, {
          scale: 1,
        })
        for await (const _ of features) {
        }
      },
    ),
  )

  console.log('\n--- Large Region Queries (1MB+) ---')

  results.push(
    await benchmark(
      'BigWig large region query (cDC.bw chr1:1000000-2000000)',
      async () => {
        const file = new LocalFile('test/data/cDC.bw')
        const bw = new BigWig({ filehandle: file })
        const features = await bw.getFeatures('chr1', 1000000, 2000000, {
          scale: 1,
        })
        for await (const _ of features) {
        }
      },
      5,
    ),
  )

  results.push(
    await benchmark(
      'BigBed large region query (chr22.bb chr22:1-10000000)',
      async () => {
        const file = new LocalFile('test/data/chr22.bb')
        const bb = new BigBed({ filehandle: file })
        const features = await bb.getFeatures('chr22', 0, 10000000)
        for await (const _ of features) {
        }
      },
      5,
    ),
  )

  console.log('\n--- Zoom Level Performance ---')

  results.push(
    await benchmark(
      'BigWig zoom level (cDC.bw chr1:0-10000000, scale: 0.01)',
      async () => {
        const file = new LocalFile('test/data/cDC.bw')
        const bw = new BigWig({ filehandle: file })
        const features = await bw.getFeatures('chr1', 0, 10000000, {
          scale: 0.01,
        })
        for await (const _ of features) {
        }
      },
    ),
  )

  results.push(
    await benchmark(
      'BigWig zoom level (cDC.bw chr1:0-10000000, scale: 0.001)',
      async () => {
        const file = new LocalFile('test/data/cDC.bw')
        const bw = new BigWig({ filehandle: file })
        const features = await bw.getFeatures('chr1', 0, 10000000, {
          scale: 0.001,
        })
        for await (const _ of features) {
        }
      },
    ),
  )

  console.log('\n--- Decompression Performance ---')

  results.push(
    await benchmark(
      'BigWig compressed (volvox.bw chr1:1-50000)',
      async () => {
        const file = new LocalFile('test/data/volvox.bw')
        const bw = new BigWig({ filehandle: file })
        const features = await bw.getFeatures('ctgA', 0, 50000, { scale: 1 })
        for await (const _ of features) {
        }
      },
    ),
  )

  results.push(
    await benchmark(
      'BigWig uncompressed (uncompressed.bw chr1:1-50000)',
      async () => {
        const file = new LocalFile('test/data/uncompressed.bw')
        const bw = new BigWig({ filehandle: file })
        const features = await bw.getFeatures('chr1', 0, 50000, { scale: 1 })
        for await (const _ of features) {
        }
      },
    ),
  )

  console.log('\n--- BigBed Extra Index Search ---')

  results.push(
    await benchmark(
      'BigBed search by name (chr22_with_name_index.bb)',
      async () => {
        const file = new LocalFile('test/data/chr22_with_name_index.bb')
        const bb = new BigBed({ filehandle: file })
        await bb.searchExtraIndex('NM_000044')
      },
    ),
  )

  console.log('\n--- Feature Iteration Performance ---')

  results.push(
    await benchmark(
      'BigWig feature count (cDC.bw chr1:0-5000000)',
      async () => {
        const file = new LocalFile('test/data/cDC.bw')
        const bw = new BigWig({ filehandle: file })
        const features = await bw.getFeatures('chr1', 0, 5000000, { scale: 1 })
        let count = 0
        for await (const _ of features) {
          count++
        }
      },
      5,
    ),
  )

  console.log('\n='.repeat(60))
  console.log('Summary')
  console.log('='.repeat(60))

  results.forEach(formatResult)

  console.log('\n='.repeat(60))
  console.log('Top 5 Fastest Operations')
  console.log('='.repeat(60))
  const fastest = [...results].sort((a, b) => a.mean - b.mean).slice(0, 5)
  fastest.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name}: ${r.mean.toFixed(2)}ms`)
  })

  console.log('\n='.repeat(60))
  console.log('Top 5 Slowest Operations')
  console.log('='.repeat(60))
  const slowest = [...results].sort((a, b) => b.mean - a.mean).slice(0, 5)
  slowest.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name}: ${r.mean.toFixed(2)}ms`)
  })
}

runBenchmarks().catch(console.error)
