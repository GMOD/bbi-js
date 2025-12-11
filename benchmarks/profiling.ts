import { BigWig } from '../src/bigwig.js'
import { LocalFile } from 'generic-filehandle2'
import { performance, PerformanceObserver } from 'node:perf_hooks'

const obs = new PerformanceObserver(list => {
  const entries = list.getEntries()
  entries.forEach(entry => {
    console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`)
  })
})
obs.observe({ entryTypes: ['measure'] })

async function profileBigWigOperations() {
  console.log('='.repeat(60))
  console.log('BigWig Detailed Profiling')
  console.log('='.repeat(60))
  console.log()

  const file = new LocalFile('test/data/cDC.bw')
  const bw = new BigWig({ filehandle: file })

  console.log('--- Header Parsing ---')
  performance.mark('header-start')
  const header = await bw.getHeader()
  performance.mark('header-end')
  performance.measure('Header parsing', 'header-start', 'header-end')
  console.log(`  Zoom levels: ${header.zoomLevels.length}`)
  console.log(
    `  Chromosomes: ${Object.keys(header.refsByName || {}).length}\n`,
  )

  console.log('--- Small Region Query (1KB) ---')
  performance.mark('small-query-start')
  const smallFeatures = await bw.getFeatures('chr1', 1000000, 1001000, {
    scale: 1,
  })
  let smallCount = 0
  for await (const _ of smallFeatures) {
    smallCount++
  }
  performance.mark('small-query-end')
  performance.measure(
    'Small region query (1KB)',
    'small-query-start',
    'small-query-end',
  )
  console.log(`  Features retrieved: ${smallCount}\n`)

  console.log('--- Medium Region Query (100KB) ---')
  performance.mark('medium-query-start')
  const mediumFeatures = await bw.getFeatures('chr1', 1000000, 1100000, {
    scale: 1,
  })
  let mediumCount = 0
  for await (const _ of mediumFeatures) {
    mediumCount++
  }
  performance.mark('medium-query-end')
  performance.measure(
    'Medium region query (100KB)',
    'medium-query-start',
    'medium-query-end',
  )
  console.log(`  Features retrieved: ${mediumCount}\n`)

  console.log('--- Large Region Query (1MB) ---')
  performance.mark('large-query-start')
  const largeFeatures = await bw.getFeatures('chr1', 1000000, 2000000, {
    scale: 1,
  })
  let largeCount = 0
  for await (const _ of largeFeatures) {
    largeCount++
  }
  performance.mark('large-query-end')
  performance.measure(
    'Large region query (1MB)',
    'large-query-start',
    'large-query-end',
  )
  console.log(`  Features retrieved: ${largeCount}\n`)

  console.log('--- Zoom Level Query (10MB, zoomed out) ---')
  performance.mark('zoom-query-start')
  const zoomFeatures = await bw.getFeatures('chr1', 0, 10000000, {
    scale: 0.001,
  })
  let zoomCount = 0
  for await (const _ of zoomFeatures) {
    zoomCount++
  }
  performance.mark('zoom-query-end')
  performance.measure(
    'Zoom level query (10MB)',
    'zoom-query-start',
    'zoom-query-end',
  )
  console.log(`  Features retrieved: ${zoomCount}\n`)

  console.log('--- Repeated Query (cache test) ---')
  performance.mark('cached-query-start')
  const cachedFeatures = await bw.getFeatures('chr1', 1000000, 1001000, {
    scale: 1,
  })
  let cachedCount = 0
  for await (const _ of cachedFeatures) {
    cachedCount++
  }
  performance.mark('cached-query-end')
  performance.measure(
    'Cached region query (1KB)',
    'cached-query-start',
    'cached-query-end',
  )
  console.log(`  Features retrieved: ${cachedCount}\n`)

  console.log('='.repeat(60))
  console.log('Profiling complete')
  console.log('='.repeat(60))
}

async function profileMemoryUsage() {
  console.log('\n')
  console.log('='.repeat(60))
  console.log('Memory Usage Profiling')
  console.log('='.repeat(60))
  console.log()

  const baseline = process.memoryUsage()
  console.log('Baseline memory:')
  console.log(`  RSS: ${(baseline.rss / 1024 / 1024).toFixed(2)} MB`)
  console.log(
    `  Heap Used: ${(baseline.heapUsed / 1024 / 1024).toFixed(2)} MB`,
  )
  console.log(
    `  Heap Total: ${(baseline.heapTotal / 1024 / 1024).toFixed(2)} MB\n`,
  )

  const file = new LocalFile('test/data/cDC.bw')
  const bw = new BigWig({ filehandle: file })

  await bw.getHeader()
  const afterHeader = process.memoryUsage()
  console.log('After header parsing:')
  console.log(`  RSS: ${(afterHeader.rss / 1024 / 1024).toFixed(2)} MB`)
  console.log(
    `  Heap Used: ${(afterHeader.heapUsed / 1024 / 1024).toFixed(2)} MB`,
  )
  console.log(
    `  Delta: ${((afterHeader.heapUsed - baseline.heapUsed) / 1024 / 1024).toFixed(2)} MB\n`,
  )

  const features = await bw.getFeatures('chr1', 0, 10000000, { scale: 1 })
  let count = 0
  for await (const _ of features) {
    count++
  }

  const afterQuery = process.memoryUsage()
  console.log('After large query (10MB region):')
  console.log(`  RSS: ${(afterQuery.rss / 1024 / 1024).toFixed(2)} MB`)
  console.log(
    `  Heap Used: ${(afterQuery.heapUsed / 1024 / 1024).toFixed(2)} MB`,
  )
  console.log(
    `  Delta: ${((afterQuery.heapUsed - afterHeader.heapUsed) / 1024 / 1024).toFixed(2)} MB`,
  )
  console.log(`  Features processed: ${count}\n`)

  global.gc?.()
  await new Promise(resolve => setTimeout(resolve, 100))

  const afterGC = process.memoryUsage()
  console.log('After garbage collection:')
  console.log(`  RSS: ${(afterGC.rss / 1024 / 1024).toFixed(2)} MB`)
  console.log(`  Heap Used: ${(afterGC.heapUsed / 1024 / 1024).toFixed(2)} MB`)
  console.log(
    `  Freed: ${((afterQuery.heapUsed - afterGC.heapUsed) / 1024 / 1024).toFixed(2)} MB\n`,
  )
}

async function main() {
  await profileBigWigOperations()
  await profileMemoryUsage()
}

main().catch(console.error)
