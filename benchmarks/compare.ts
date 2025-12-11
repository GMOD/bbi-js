import { readFile } from 'node:fs/promises'

interface BenchmarkLine {
  name: string
  value: number
  unit: string
}

function parseBenchmarkOutput(content: string): Map<string, BenchmarkLine> {
  const results = new Map<string, BenchmarkLine>()
  const lines = content.split('\n')

  let currentName = ''
  for (const line of lines) {
    if (line.startsWith('  ') && line.includes('ops/sec')) {
      const match = line.match(/([\d.]+) ops\/sec/)
      if (match && currentName) {
        results.set(currentName, {
          name: currentName,
          value: parseFloat(match[1]),
          unit: 'ops/sec',
        })
      }
    } else if (line && !line.startsWith('=') && !line.startsWith('  ') && !line.startsWith('---') && !line.includes('Summary') && !line.includes('Top 5')) {
      currentName = line.trim()
    }
  }

  return results
}

async function compare(beforeFile: string, afterFile: string) {
  console.log('='.repeat(60))
  console.log('Benchmark Comparison')
  console.log('='.repeat(60))
  console.log()

  const beforeContent = await readFile(beforeFile, 'utf-8')
  const afterContent = await readFile(afterFile, 'utf-8')

  const before = parseBenchmarkOutput(beforeContent)
  const after = parseBenchmarkOutput(afterContent)

  console.log(`Before: ${beforeFile}`)
  console.log(`After:  ${afterFile}`)
  console.log()

  const improvements: Array<{ name: string; change: number; percentChange: number }> = []
  const regressions: Array<{ name: string; change: number; percentChange: number }> = []

  for (const [name, afterResult] of after) {
    const beforeResult = before.get(name)
    if (beforeResult) {
      const change = afterResult.value - beforeResult.value
      const percentChange = (change / beforeResult.value) * 100

      const entry = { name, change, percentChange }

      if (change > 0) {
        improvements.push(entry)
      } else if (change < 0) {
        regressions.push(entry)
      }
    }
  }

  improvements.sort((a, b) => b.percentChange - a.percentChange)
  regressions.sort((a, b) => a.percentChange - b.percentChange)

  if (improvements.length > 0) {
    console.log('✅ Improvements:')
    console.log()
    improvements.forEach(({ name, change, percentChange }) => {
      console.log(`  ${name}`)
      console.log(`    ${change > 0 ? '+' : ''}${change.toFixed(2)} ops/sec (${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%)`)
    })
    console.log()
  }

  if (regressions.length > 0) {
    console.log('⚠️  Regressions:')
    console.log()
    regressions.forEach(({ name, change, percentChange }) => {
      console.log(`  ${name}`)
      console.log(`    ${change.toFixed(2)} ops/sec (${percentChange.toFixed(1)}%)`)
    })
    console.log()
  }

  if (improvements.length === 0 && regressions.length === 0) {
    console.log('No significant changes detected')
    console.log()
  }

  const avgImprovement = improvements.length > 0
    ? improvements.reduce((sum, { percentChange }) => sum + percentChange, 0) / improvements.length
    : 0

  const avgRegression = regressions.length > 0
    ? regressions.reduce((sum, { percentChange }) => sum + percentChange, 0) / regressions.length
    : 0

  console.log('='.repeat(60))
  console.log('Summary')
  console.log('='.repeat(60))
  console.log(`Total benchmarks: ${after.size}`)
  console.log(`Improvements: ${improvements.length}`)
  console.log(`Regressions: ${regressions.length}`)
  console.log(`Unchanged: ${after.size - improvements.length - regressions.length}`)

  if (improvements.length > 0) {
    console.log(`Average improvement: +${avgImprovement.toFixed(1)}%`)
  }

  if (regressions.length > 0) {
    console.log(`Average regression: ${avgRegression.toFixed(1)}%`)
  }

  console.log()

  const netChange = avgImprovement + avgRegression
  if (netChange > 5) {
    console.log(`🎉 Overall: SIGNIFICANT IMPROVEMENT (+${netChange.toFixed(1)}%)`)
  } else if (netChange > 1) {
    console.log(`✅ Overall: Slight improvement (+${netChange.toFixed(1)}%)`)
  } else if (netChange < -5) {
    console.log(`🚨 Overall: SIGNIFICANT REGRESSION (${netChange.toFixed(1)}%)`)
  } else if (netChange < -1) {
    console.log(`⚠️  Overall: Slight regression (${netChange.toFixed(1)}%)`)
  } else {
    console.log(`➡️  Overall: No significant change`)
  }
}

const args = process.argv.slice(2)
if (args.length !== 2) {
  console.error('Usage: node compare.ts <before.txt> <after.txt>')
  process.exit(1)
}

compare(args[0], args[1]).catch(console.error)
