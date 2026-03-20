import {
  BigWig as BigWigBranch1,
  parseBigWig as parseBigWigBranch1,
} from '../esm_branch1/index.js'
import {
  BigWig as BigWigBranch2,
  parseBigWig as parseBigWigBranch2,
} from '../esm_branch2/index.js'
import { readFileSync } from 'node:fs'

const branch1Name = readFileSync('esm_branch1/branchname.txt', 'utf8').trim()
const branch2Name = readFileSync('esm_branch2/branchname.txt', 'utf8').trim()

const files = [
  'test/data/fixedStep.bw',
  'test/data/uncompressed.bw',
  'test/data/cDC.bw',
]

async function profileParseBigWig(
  name: string,
  BigWig: typeof BigWigBranch1,
  parseBigWig: typeof parseBigWigBranch1,
  path: string,
  iterations: number,
) {
  // warmup
  for (let i = 0; i < 2; i++) {
    const bw = new BigWig({ path })
    await parseBigWig(bw)
  }

  const timings: number[] = []
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    const bw = new BigWig({ path })
    await parseBigWig(bw)
    timings.push(performance.now() - start)
  }

  const sorted = timings.sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]!
  const mean = timings.reduce((a, b) => a + b, 0) / timings.length
  const min = sorted[0]!
  const max = sorted[sorted.length - 1]!

  console.log(
    `  ${name}: median=${median.toFixed(1)}ms mean=${mean.toFixed(1)}ms min=${min.toFixed(1)}ms max=${max.toFixed(1)}ms (${iterations} runs)`,
  )
  return { median, mean, min, max }
}

async function profileGetFeatures(
  name: string,
  BigWig: typeof BigWigBranch1,
  path: string,
  iterations: number,
) {
  // get header to know what refs exist
  const bw0 = new BigWig({ path })
  const header = await bw0.getHeader()
  const refs = Object.values(
    header.refsByNumber as Record<string, { name: string; length: number }>,
  )

  // warmup
  for (let i = 0; i < 2; i++) {
    const bw = new BigWig({ path })
    await bw.getHeader()
    for (const ref of refs) {
      await bw.getFeatures(ref.name, 0, ref.length)
    }
  }

  const headerTimings: number[] = []
  const perChromTimings: Map<string, number[]> = new Map()
  const totalTimings: number[] = []

  for (let i = 0; i < iterations; i++) {
    const totalStart = performance.now()
    const bw = new BigWig({ path })

    const hStart = performance.now()
    await bw.getHeader()
    headerTimings.push(performance.now() - hStart)

    for (const ref of refs) {
      const cStart = performance.now()
      await bw.getFeatures(ref.name, 0, ref.length)
      const elapsed = performance.now() - cStart
      if (!perChromTimings.has(ref.name)) {
        perChromTimings.set(ref.name, [])
      }
      perChromTimings.get(ref.name)!.push(elapsed)
    }

    totalTimings.push(performance.now() - totalStart)
  }

  const medianOf = (arr: number[]) =>
    [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)]!

  console.log(`  ${name} breakdown (median of ${iterations} runs):`)
  console.log(`    getHeader: ${medianOf(headerTimings).toFixed(2)}ms`)

  const chromEntries = [...perChromTimings.entries()].sort(
    (a, b) => medianOf(b[1]) - medianOf(a[1]),
  )

  let shownCount = 0
  for (const [chrom, times] of chromEntries) {
    const med = medianOf(times)
    if (med > 0.5 || shownCount < 5) {
      console.log(`    ${chrom}: ${med.toFixed(2)}ms`)
      shownCount++
    }
  }
  if (chromEntries.length > shownCount) {
    const restTimes = chromEntries
      .slice(shownCount)
      .map(([, times]) => medianOf(times))
    console.log(
      `    ...${chromEntries.length - shownCount} more chroms, total median: ${restTimes.reduce((a, b) => a + b, 0).toFixed(2)}ms`,
    )
  }
  console.log(`    TOTAL: ${medianOf(totalTimings).toFixed(2)}ms`)
}

async function main() {
  for (const path of files) {
    const iterations = path.includes('cDC') ? 3 : 10
    console.log(`\n=== ${path} ===`)

    console.log(`\nparseBigWig timings:`)
    const r1 = await profileParseBigWig(
      branch1Name,
      BigWigBranch1,
      parseBigWigBranch1,
      path,
      iterations,
    )
    const r2 = await profileParseBigWig(
      branch2Name,
      BigWigBranch2,
      parseBigWigBranch2,
      path,
      iterations,
    )
    const ratio = r1.median / r2.median
    console.log(
      `  ratio: ${ratio > 1 ? branch2Name : branch1Name} is ${Math.max(ratio, 1 / ratio).toFixed(2)}x faster`,
    )

    console.log(`\ngetFeatures per-chrom breakdown:`)
    await profileGetFeatures(branch1Name, BigWigBranch1, path, iterations)
    await profileGetFeatures(branch2Name, BigWigBranch2, path, iterations)
  }
}

main().catch(console.error)
