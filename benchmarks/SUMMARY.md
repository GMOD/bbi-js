# Performance Benchmarking Suite - Summary

## What's Included

A complete performance benchmarking and profiling infrastructure for the @gmod/bbi library.

### Files Created

```
benchmarks/
├── index.ts              # Main benchmark suite (20+ benchmarks)
├── profiling.ts          # Detailed profiling with memory tracking
├── cpu-profile.ts        # CPU profiler for Chrome DevTools analysis
├── compare.ts            # Compare before/after benchmark results
├── README.md             # Complete documentation
├── OPTIMIZATION_IDEAS.md # Specific optimization suggestions
├── SUMMARY.md            # This file
└── tsconfig.json         # TypeScript config for benchmarks
```

### Package Scripts Added

```json
{
  "benchmark": "Run full benchmark suite",
  "profile": "Detailed profiling with timing breakdown",
  "profile:memory": "Memory profiling with GC analysis",
  "profile:cpu": "Generate CPU profile for Chrome DevTools"
}
```

## Quick Start

```bash
# Run the main benchmark suite
yarn benchmark

# Run detailed profiling
yarn profile

# Generate CPU profile
yarn profile:cpu

# Compare before/after optimizations
yarn benchmark > before.txt
# ... make your changes ...
yarn benchmark > after.txt
node --experimental-strip-types benchmarks/compare.ts before.txt after.txt
```

## What Gets Benchmarked

### Header Parsing (5 benchmarks)
- Small, medium, and large BigWig files
- Small BigBed file
- BigBed with many chromosomes (2057 contigs)

### Region Queries (8 benchmarks)
- Small regions (100-1000bp)
- Medium regions (10KB-100KB)
- Large regions (1MB+)
- Both BigWig and BigBed formats

### Zoom Levels (2 benchmarks)
- Different scale factors (0.01, 0.001)
- Tests summary/aggregated data performance

### Decompression (2 benchmarks)
- Compressed vs uncompressed performance comparison

### BigBed Features (1 benchmark)
- Extra index search by name

### Iteration (1 benchmark)
- Feature counting/processing performance

**Total: 19 comprehensive benchmarks**

## Output Example

```
============================================================
BigWig/BigBed Performance Benchmarks
============================================================

--- Header Parsing ---

BigWig header (small: volvox.bw 209KB)
  200.50 ops/sec
  4.99ms mean
  4.85ms median
  4.12ms min
  6.34ms max
  ±0.67ms std dev
  10 samples

[... more benchmarks ...]

============================================================
Summary
============================================================

Top 5 Fastest Operations
1. BigWig small region query (volvox): 3.42ms
2. BigBed small region query (volvox.bb): 4.12ms
3. BigWig header (small): 4.99ms
[...]

Top 5 Slowest Operations
1. BigWig large region query (cDC.bw chr1:1000000-2000000): 458.23ms
2. BigBed large region query (chr22.bb): 324.56ms
[...]
```

## Profiling Output Example

```
============================================================
BigWig Detailed Profiling
============================================================

--- Header Parsing ---
Header parsing: 5.23ms
  Zoom levels: 10
  Chromosomes: 25

--- Small Region Query (1KB) ---
Small region query (1KB): 4.56ms
  Features retrieved: 42

[... timing for each operation ...]

============================================================
Memory Usage Profiling
============================================================

Baseline memory:
  RSS: 45.23 MB
  Heap Used: 12.34 MB
  Heap Total: 18.50 MB

After header parsing:
  RSS: 47.12 MB
  Heap Used: 13.45 MB
  Delta: 1.11 MB

[... memory tracking ...]
```

## Workflow for Optimization

### 1. Establish Baseline
```bash
yarn benchmark > baseline.txt
```

### 2. Identify Bottlenecks
```bash
yarn profile:cpu
# Open the .cpuprofile in Chrome DevTools
```

### 3. Review Optimization Ideas
- See `OPTIMIZATION_IDEAS.md` for specific suggestions
- Focus on high-impact, low-effort optimizations first

### 4. Implement Changes
- Make your optimization
- Ensure tests still pass: `yarn test --run`

### 5. Measure Impact
```bash
yarn benchmark > optimized.txt
node --experimental-strip-types benchmarks/compare.ts baseline.txt optimized.txt
```

### 6. Iterate
- If improvement is significant (>5%), keep the change
- If regression occurs, investigate or revert
- Move to next optimization

## Key Performance Indicators

Track these metrics:

1. **Header parsing**: Should be <50ms for most files
2. **Small queries**: Should be <10ms (highly cacheable)
3. **Large queries**: Proportional to data size, watch for outliers
4. **Memory usage**: Should stabilize after queries, return near baseline after GC
5. **Cache effectiveness**: Repeated queries should be much faster

## Files Used for Benchmarking

- **volvox.bw** (209KB) - Small file baseline
- **cow.bw** (638KB) - Medium file
- **cDC.bw** (67MB) - Large file stress test (primary test file)
- **volvox.bb** (27KB) - Small BigBed
- **chr22.bb** (280KB) - Medium BigBed
- **2057.bb** - Many chromosomes test
- **uncompressed.bw** - Decompression comparison

## Expected Performance Ranges

Based on typical hardware (SSD, modern CPU):

| Operation | Expected Time | Concern If |
|-----------|--------------|------------|
| Header parse (small) | 5-20ms | >50ms |
| Header parse (large) | 10-50ms | >100ms |
| Small query (1KB) | 5-15ms | >30ms |
| Medium query (100KB) | 10-50ms | >100ms |
| Large query (1MB) | 50-500ms | >1000ms |
| Zoom query | 10-100ms | >200ms |

## Tips for Best Results

1. **Run multiple times**: First run may be slower (cold cache)
2. **Close other apps**: Reduce system noise
3. **Use consistent hardware**: Don't compare laptop vs desktop results
4. **Save results**: Keep history to track regressions
5. **Focus on relative changes**: Absolute times vary by system

## Next Steps

1. Run baseline benchmarks to understand current performance
2. Review OPTIMIZATION_IDEAS.md for specific optimization targets
3. Pick an optimization to implement
4. Measure the impact
5. Repeat!

## Questions or Issues?

- Check README.md for detailed documentation
- Review OPTIMIZATION_IDEAS.md for specific suggestions
- Profile with `yarn profile:cpu` to identify hotspots
