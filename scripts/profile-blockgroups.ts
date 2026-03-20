import { BigWig } from '../src/bigwig.ts'

const path = process.argv[2] || 'test/data/cDC.bw'

async function main() {
  const bw = new BigWig({ path })
  const header = await bw.getHeader()
  let totalBlocks = 0
  let totalFeatures = 0
  for (const ref of Object.values(header.refsByNumber)) {
    const result = await bw.getFeaturesAsArrays(ref.name, 0, ref.length)
    totalFeatures += result.starts.length
  }
  console.log(`totalFeatures: ${totalFeatures}`)
}

main().catch(console.error)
