import { execSync } from 'node:child_process'
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const comparisonBranch = process.argv[2] || 'master'
const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
  encoding: 'utf-8',
}).trim()

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
const resultsDir = join(process.cwd(), 'benchmark-results')

try {
  mkdirSync(resultsDir, { recursive: true })
} catch {
  // Directory already exists
}

const currentResults = join(
  resultsDir,
  `${currentBranch}-${timestamp}.txt`,
)
const comparisonResults = join(
  resultsDir,
  `${comparisonBranch}-${timestamp}.txt`,
)

interface StepConfig {
  title: string
  skipBuild?: boolean
}

function log(message: string) {
  console.log(message)
}

function logSection(title: string) {
  log('')
  log('='.repeat(70))
  log(title)
  log('='.repeat(70))
  log('')
}

function exec(command: string, description: string) {
  log(`${description}...`)
  try {
    execSync(command, { stdio: 'inherit' })
  } catch (error) {
    log(`Error: Failed to execute: ${command}`)
    throw error
  }
}

function execQuiet(command: string) {
  return execSync(command, { encoding: 'utf-8' }).trim()
}

function hasUncommittedChanges() {
  try {
    execSync('git diff-index --quiet HEAD --')
    return false
  } catch {
    return true
  }
}

async function runStep(step: string, config: StepConfig, action: () => void) {
  logSection(`Step ${step}: ${config.title}`)
  action()
}

async function main() {
  logSection('Branch Performance Comparison')
  log(`Current branch:    ${currentBranch}`)
  log(`Comparison branch: ${comparisonBranch}`)
  log(`Results directory: ${resultsDir}`)
  log('')

  if (currentBranch === comparisonBranch) {
    log('Error: Current branch and comparison branch are the same')
    process.exit(1)
  }

  let stashed = false

  if (hasUncommittedChanges()) {
    log('Warning: You have uncommitted changes')
    log('Stashing changes...')
    exec(
      `git stash push -m "Benchmark comparison stash ${timestamp}"`,
      'Stashing uncommitted changes',
    )
    stashed = true
    log('')
  }

  try {
    await runStep('1', { title: `Building current branch (${currentBranch})` }, () => {
      exec('yarn build', 'Building current branch')
    })

    await runStep('2', { title: `Benchmarking current branch (${currentBranch})` }, () => {
      log(`Running benchmarks on ${currentBranch}...`)
      const output = execQuiet('yarn benchmark')
      writeFileSync(currentResults, output)
      log(`Results saved to: ${currentResults}`)
    })

    await runStep('3', { title: `Switching to ${comparisonBranch}` }, () => {
      exec(`git checkout ${comparisonBranch}`, `Checking out ${comparisonBranch}`)
    })

    await runStep('4', { title: `Building comparison branch (${comparisonBranch})` }, () => {
      exec('yarn build', 'Building comparison branch')
    })

    await runStep('5', { title: `Benchmarking comparison branch (${comparisonBranch})` }, () => {
      log(`Running benchmarks on ${comparisonBranch}...`)
      const output = execQuiet('yarn benchmark')
      writeFileSync(comparisonResults, output)
      log(`Results saved to: ${comparisonResults}`)
    })

    await runStep('6', { title: `Returning to ${currentBranch}` }, () => {
      exec(`git checkout ${currentBranch}`, `Checking out ${currentBranch}`)

      if (stashed) {
        exec('git stash pop', 'Restoring stashed changes')
      }
    })

    await runStep('7', { title: 'Rebuilding current branch' }, () => {
      exec('yarn build', 'Building current branch')
    })

    await runStep('8', { title: 'Comparing Results' }, () => {
      log('')
      log('Comparison: (baseline → current)')
      log(`  ${comparisonBranch} → ${currentBranch}`)
      log('')

      const compareCommand = `node --experimental-strip-types benchmarks/compare.ts "${comparisonResults}" "${currentResults}"`
      execSync(compareCommand, { stdio: 'inherit' })
    })

    logSection('Comparison Complete')
    log('Results files:')
    log(`  - Current branch (${currentBranch}):`)
    log(`    ${currentResults}`)
    log(`  - Comparison branch (${comparisonBranch}):`)
    log(`    ${comparisonResults}`)
    log('')
    log('These files have been saved for future reference.')
  } catch (error) {
    log('')
    log('Error occurred during comparison. Attempting cleanup...')

    try {
      const branch = execQuiet('git rev-parse --abbrev-ref HEAD')
      if (branch !== currentBranch) {
        log(`Returning to ${currentBranch}...`)
        execSync(`git checkout ${currentBranch}`, { stdio: 'inherit' })
      }

      if (stashed) {
        log('Restoring stashed changes...')
        execSync('git stash pop', { stdio: 'inherit' })
      }

      log('Rebuilding...')
      execSync('yarn build', { stdio: 'inherit' })
    } catch (cleanupError) {
      log('Cleanup failed. Manual intervention may be required.')
    }

    throw error
  }
}

main().catch(error => {
  console.error('Benchmark comparison failed:', error.message)
  process.exit(1)
})
