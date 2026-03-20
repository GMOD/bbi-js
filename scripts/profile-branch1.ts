import { BigWig, parseBigWig } from '../esm_branch1/index.js'

const path = process.argv[2] || 'test/data/volvox.bw'
const iterations = Number(process.argv[3] || '20')

async function main() {
  // warmup
  for (let i = 0; i < 3; i++) {
    const bw = new BigWig({ path })
    await parseBigWig(bw)
  }

  const timings: number[] = []
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    const bw = new BigWig({ path })
    const features = await parseBigWig(bw)
    const elapsed = performance.now() - start
    timings.push(elapsed)
    if (i === 0) {
      console.log(`features: ${features.length}`)
    }
  }

  const sorted = [...timings].sort((a, b) => a - b)
  console.log(`branch1 (${iterations} runs):`)
  console.log(`  min=${sorted[0]!.toFixed(2)}ms`)
  console.log(`  p50=${sorted[Math.floor(sorted.length / 2)]!.toFixed(2)}ms`)
  console.log(
    `  mean=${(timings.reduce((a, b) => a + b) / timings.length).toFixed(2)}ms`,
  )
  console.log(`  max=${sorted[sorted.length - 1]!.toFixed(2)}ms`)
  console.log(`  all: [${timings.map(t => t.toFixed(1)).join(', ')}]`)
}

main().catch(console.error)
