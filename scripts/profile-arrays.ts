import { BigWig } from '../src/bigwig.ts'

const path = process.argv[2] || 'test/data/cDC.bw'
const iterations = Number(process.argv[3] || '5')

async function main() {
  // warmup
  for (let i = 0; i < 3; i++) {
    const bw = new BigWig({ path })
    const header = await bw.getHeader()
    for (const ref of Object.values(header.refsByNumber)) {
      await bw.getFeaturesAsArrays(ref.name, 0, ref.length)
    }
  }
  if (global.gc) {
    global.gc()
  }

  const timings: number[] = []
  for (let i = 0; i < iterations; i++) {
    if (global.gc) {
      global.gc()
    }
    const start = performance.now()
    const bw = new BigWig({ path })
    const header = await bw.getHeader()
    for (const ref of Object.values(header.refsByNumber)) {
      await bw.getFeaturesAsArrays(ref.name, 0, ref.length)
    }
    timings.push(performance.now() - start)
  }

  const sorted = [...timings].sort((a, b) => a - b)
  console.log(`getFeaturesAsArrays - ${path} (${iterations} runs):`)
  console.log(
    `  min=${sorted[0]!.toFixed(1)}ms  p50=${sorted[Math.floor(sorted.length / 2)]!.toFixed(1)}ms  max=${sorted[sorted.length - 1]!.toFixed(1)}ms`,
  )
}

main().catch(console.error)
