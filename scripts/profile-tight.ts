const branch = process.argv[2] || '1'
const path = process.argv[3] || 'test/data/uncompressed.bw'
const iterations = Number(process.argv[4] || '50')

async function main() {
  const mod =
    branch === '1'
      ? await import('../esm_branch1/index.js')
      : await import('../esm_branch2/index.js')

  const { BigWig, parseBigWig } = mod

  // warmup
  for (let i = 0; i < 5; i++) {
    const bw = new BigWig({ path })
    await parseBigWig(bw)
  }

  // force GC before measurement
  if (global.gc) {
    global.gc()
  }

  console.profile('parseBigWig')
  const timings: number[] = []
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    const bw = new BigWig({ path })
    await parseBigWig(bw)
    timings.push(performance.now() - start)
  }
  console.profileEnd('parseBigWig')

  const sorted = [...timings].sort((a, b) => a - b)
  console.log(`branch${branch} - ${path} (${iterations} runs):`)
  console.log(`  min=${sorted[0]!.toFixed(2)}ms`)
  console.log(`  p25=${sorted[Math.floor(sorted.length * 0.25)]!.toFixed(2)}ms`)
  console.log(`  p50=${sorted[Math.floor(sorted.length * 0.5)]!.toFixed(2)}ms`)
  console.log(`  p75=${sorted[Math.floor(sorted.length * 0.75)]!.toFixed(2)}ms`)
  console.log(
    `  mean=${(timings.reduce((a, b) => a + b) / timings.length).toFixed(2)}ms`,
  )
}

main().catch(console.error)
