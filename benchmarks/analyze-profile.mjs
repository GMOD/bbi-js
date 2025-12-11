import { readFileSync } from 'node:fs'

const files = [
  'cDC_bw.cpuprofile',
  'ENCFF826FLP_bw.cpuprofile',
  'example_bigwig_unsorted_with_error_small_bw.cpuprofile',
]

for (const file of files) {
  console.log(`\n=== ${file} ===`)
  const profile = JSON.parse(readFileSync(file, 'utf8'))

  const nodeMap = new Map()
  for (const node of profile.nodes) {
    nodeMap.set(node.id, node)
  }

  // Aggregate hit counts by function
  const funcHits = new Map()
  for (const node of profile.nodes) {
    const name = node.callFrame.functionName || '(anonymous)'
    const url = node.callFrame.url || ''
    const key = `${name} (${url.split('/').pop() || 'native'})`
    funcHits.set(key, (funcHits.get(key) || 0) + (node.hitCount || 0))
  }

  // Sort by hits
  const sorted = [...funcHits.entries()]
    .filter(([_, hits]) => hits > 0)
    .sort((a, b) => b[1] - a[1])

  const total = sorted.reduce((sum, [_, hits]) => sum + hits, 0)

  console.log(`Total samples: ${total}`)
  console.log('\nTop functions by CPU time:')
  for (const [func, hits] of sorted.slice(0, 15)) {
    const pct = ((hits / total) * 100).toFixed(1)
    console.log(`  ${pct}% (${hits}) - ${func}`)
  }
}
