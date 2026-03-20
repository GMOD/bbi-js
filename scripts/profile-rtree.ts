import { BigWig } from '../src/bigwig.ts'

const path = process.argv[2] || 'test/data/cDC.bw'

async function main() {
  const bw = new BigWig({ path })
  const header = await bw.getHeader()

  // warmup
  for (let i = 0; i < 3; i++) {
    const bw2 = new BigWig({ path })
    await bw2.getHeader()
    for (const ref of Object.values(header.refsByNumber)) {
      await bw2.getFeaturesAsArrays(ref.name, 0, ref.length)
    }
  }

  // now time with fresh instance per iteration
  const refs = Object.values(header.refsByNumber)
  const timings: number[] = []
  for (let iter = 0; iter < 5; iter++) {
    const bw2 = new BigWig({ path })
    await bw2.getHeader()
    let totalCollect = 0
    let totalParse = 0
    const iterStart = performance.now()
    for (const ref of refs) {
      const t0 = performance.now()
      // @ts-ignore - accessing private for profiling
      const view = bw2.view!
      const collected = await view._collectBlocks(ref.name, 0, ref.length)
      const t1 = performance.now()
      totalCollect += t1 - t0
      if (collected) {
        await view.readWigDataAsArrays(ref.name, 0, ref.length)
      }
      totalParse += performance.now() - t1
    }
    const total = performance.now() - iterStart
    console.log(
      `iter ${iter}: total=${total.toFixed(1)}ms  collectBlocks=${totalCollect.toFixed(1)}ms  parse=${totalParse.toFixed(1)}ms`,
    )
    timings.push(total)
  }
}

main().catch(console.error)
