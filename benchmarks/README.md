# Performance Benchmarks and Profiling

This directory contains performance benchmarking and profiling tools for the BigWig/BigBed parser.

## Overview

Three main tools are provided:

1. **benchmarks/index.ts** - Comprehensive benchmark suite
2. **benchmarks/profiling.ts** - Detailed profiling with memory tracking
3. **benchmarks/cpu-profile.ts** - CPU profiling for Chrome DevTools analysis

## Running Benchmarks

### Quick Start

```bash
# Run the main benchmark suite
yarn benchmark

# Run detailed profiling
yarn profile

# Generate CPU profile for Chrome DevTools
yarn profile:cpu

# Run profiling with memory analysis (requires --expose-gc flag)
yarn profile:memory
```

### Main Benchmark Suite

The main benchmark suite (`benchmarks/index.ts`) tests:

- **Header Parsing**: Different file sizes (small, medium, large)
- **Small Region Queries**: 100-1000bp regions
- **Medium Region Queries**: 10KB-100KB regions
- **Large Region Queries**: 1MB+ regions
- **Zoom Level Performance**: Different scale factors
- **Decompression Performance**: Compressed vs uncompressed
- **BigBed Extra Index Search**: Name-based lookups
- **Feature Iteration**: Processing large numbers of features

Output includes:
- Operations per second
- Mean, median, min, max timings
- Standard deviation
- Sample count

### Detailed Profiling

The profiling script (`benchmarks/profiling.ts`) provides:

- Timing breakdown for different query sizes
- Cache performance analysis (repeated queries)
- Memory usage tracking
- Before/after memory deltas
- Garbage collection analysis

### CPU Profiling

Generate a Chrome DevTools-compatible CPU profile:

```bash
yarn profile:cpu
```

This creates a `.cpuprofile` file that you can:
1. Open Chrome DevTools (F12)
2. Go to the Performance tab
3. Click "Load profile" (⬆️ icon)
4. Select the generated `.cpuprofile` file

The flame graph will show exactly where CPU time is spent.

## Interpreting Results

### What to Look For

#### Performance Bottlenecks
- **High mean times**: Operations consistently slow
- **High standard deviation**: Inconsistent performance (possible cache issues)
- **Min vs max gaps**: Large gaps suggest I/O or cache variance

#### Optimization Opportunities
1. **Header parsing**: Should be fast (<50ms for most files)
2. **Small queries**: Should be <10ms (cache-friendly)
3. **Zoom levels**: Should be significantly faster than full resolution
4. **Decompression**: Compare compressed vs uncompressed performance

#### Memory Issues
- **Heap growth**: Large deltas suggest memory not being freed
- **Post-GC memory**: Should return close to baseline
- **RSS growth**: Indicates actual memory consumption

### Comparing Before/After Optimizations

Save benchmark results to compare:

```bash
# Before optimization
yarn benchmark > results-before.txt

# Make your optimizations...

# After optimization
yarn benchmark > results-after.txt

# Compare with automated analysis
node --experimental-strip-types benchmarks/compare.ts results-before.txt results-after.txt
```

The comparison tool shows:
- Which operations improved (with percentage gains)
- Which operations regressed (with percentage losses)
- Average improvement/regression across all benchmarks
- Overall assessment of the changes

### Key Metrics to Track

1. **Header parsing time** (should stay constant)
2. **Ops/sec for small queries** (higher is better)
3. **Mean time for large queries** (lower is better)
4. **Memory delta** (lower is better)
5. **Standard deviation** (lower is better - more consistent)

## Benchmarked Operations

### File Sizes Used

- **Small**: volvox.bw (209KB), volvox.bb (27KB)
- **Medium**: cow.bw (638KB)
- **Large**: cDC.bw (67MB) - main stress test file
- **Many contigs**: 2057.bb (2057 chromosomes)

### Query Patterns

- **Small regions**: 1KB (typical for precise zooming)
- **Medium regions**: 10KB-100KB (typical for gene views)
- **Large regions**: 1MB+ (chromosome-scale views)
- **Zoomed out**: Using summary/zoom levels

### Test Scenarios

1. **Cold cache**: First query to a region
2. **Warm cache**: Repeated queries to same region
3. **Sequential**: Adjacent regions (tests block grouping)
4. **Random access**: Scattered regions (worst case for I/O)

## Advanced Profiling

### Node.js Inspector

For deeper profiling, use Node's built-in inspector:

```bash
node --inspect-brk benchmarks/index.ts
```

Then open Chrome DevTools and connect to the inspector.

### V8 Options

Useful flags for profiling:

```bash
# Expose garbage collection
node --expose-gc benchmarks/profiling.ts

# Detailed GC logging
node --trace-gc benchmarks/index.ts

# Memory profiling
node --max-old-space-size=4096 benchmarks/index.ts
```

## Adding New Benchmarks

To add a new benchmark:

```typescript
results.push(
  await benchmark('Your benchmark name', async () => {
    // Your test code here
  }, iterations)
)
```

### Best Practices

1. **Realistic workloads**: Use actual file sizes and query patterns
2. **Sufficient iterations**: 10+ for consistent results
3. **Isolated tests**: Each benchmark should be independent
4. **Warm-up**: Consider discarding first iteration
5. **Clear naming**: Describe what's being tested

## Optimization Strategies

Based on profiling results, consider:

1. **Block grouping**: Optimize 2KB threshold in `util.ts`
2. **Cache sizing**: Tune QuickLRU maxSize (default: 1000)
3. **Decompression**: Possible WASM or native implementations
4. **Memory pooling**: Reuse buffers instead of allocating
5. **Lazy parsing**: Defer parsing until features are consumed
6. **Index caching**: Cache CIR tree traversals
7. **Parallel I/O**: Fetch multiple blocks concurrently

## Expected Performance Baselines

Typical results on modern hardware:

- Header parsing: 5-50ms
- Small queries: 5-15ms
- Medium queries: 10-50ms
- Large queries: 50-500ms
- Zoom queries: 10-100ms (much faster than full resolution)

Performance degrades with:
- Larger files
- More fragmented data
- Compressed blocks
- Network-based file handles
- Cold system cache

## Continuous Benchmarking

Consider running benchmarks:

- Before/after optimizations
- Across different Node versions
- On different hardware (CI servers)
- With different file types (compressed, various formats)

Track results over time to detect regressions.
