#!/bin/bash

set -e

COMPARISON_BRANCH="${1:-master}"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
CURRENT_RESULTS="benchmark-results-${CURRENT_BRANCH}-${TIMESTAMP}.txt"
COMPARISON_RESULTS="benchmark-results-${COMPARISON_BRANCH}-${TIMESTAMP}.txt"

echo "======================================================================"
echo "Branch Performance Comparison"
echo "======================================================================"
echo ""
echo "Current branch:    $CURRENT_BRANCH"
echo "Comparison branch: $COMPARISON_BRANCH"
echo ""

if [ "$CURRENT_BRANCH" = "$COMPARISON_BRANCH" ]; then
  echo "Error: Current branch and comparison branch are the same"
  exit 1
fi

if ! git diff-index --quiet HEAD --; then
  echo "Warning: You have uncommitted changes"
  echo ""
  read -p "Stash changes and continue? (y/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Stashing changes..."
    git stash push -m "Benchmark comparison stash ${TIMESTAMP}"
    STASHED=true
  else
    echo "Aborted"
    exit 1
  fi
fi

echo "======================================================================"
echo "Step 1: Building and benchmarking current branch ($CURRENT_BRANCH)"
echo "======================================================================"
echo ""

yarn build
echo ""
echo "Running benchmarks on $CURRENT_BRANCH..."
yarn benchmark > "$CURRENT_RESULTS"
echo "Results saved to: $CURRENT_RESULTS"
echo ""

echo "======================================================================"
echo "Step 2: Switching to $COMPARISON_BRANCH"
echo "======================================================================"
echo ""

git checkout "$COMPARISON_BRANCH"

echo "======================================================================"
echo "Step 3: Building and benchmarking comparison branch ($COMPARISON_BRANCH)"
echo "======================================================================"
echo ""

yarn build
echo ""
echo "Running benchmarks on $COMPARISON_BRANCH..."
yarn benchmark > "$COMPARISON_RESULTS"
echo "Results saved to: $COMPARISON_RESULTS"
echo ""

echo "======================================================================"
echo "Step 4: Switching back to $CURRENT_BRANCH"
echo "======================================================================"
echo ""

git checkout "$CURRENT_BRANCH"

if [ "$STASHED" = true ]; then
  echo "Restoring stashed changes..."
  git stash pop
  echo ""
fi

echo "======================================================================"
echo "Step 5: Rebuilding current branch"
echo "======================================================================"
echo ""

yarn build
echo ""

echo "======================================================================"
echo "Step 6: Comparing Results"
echo "======================================================================"
echo ""

node --experimental-strip-types benchmarks/compare.ts "$COMPARISON_RESULTS" "$CURRENT_RESULTS"

echo ""
echo "======================================================================"
echo "Comparison Complete"
echo "======================================================================"
echo ""
echo "Results files:"
echo "  - Current branch ($CURRENT_BRANCH):    $CURRENT_RESULTS"
echo "  - Comparison branch ($COMPARISON_BRANCH): $COMPARISON_RESULTS"
echo ""
echo "These files have been saved for future reference."
