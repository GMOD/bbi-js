# Performance Optimization Ideas

Based on analysis of the codebase, here are potential optimization opportunities ranked by expected impact.

## High Impact Optimizations

### 1. Optimize Block Grouping (`src/util.ts:16-40`)

**Current behavior**: Groups blocks within 2KB of each other

**Opportunity**: The 2KB threshold might not be optimal for all scenarios
- Small files: Might benefit from smaller threshold
- Large files: Might benefit from larger threshold
- Network files: Larger threshold reduces round trips

**Benchmark before/after**:
```bash
# Test different threshold values
# Modify GROUPING_THRESHOLD in util.ts
yarn benchmark | grep "region query"
```

**Expected gain**: 10-30% for medium/large queries on network files

---

### 2. Decompression Performance (`src/unzip.ts`)

**Current behavior**: Uses `pako-esm2` for inflation

**Opportunities**:
- Consider WASM-based zlib implementations (faster decompression)
- Worker thread pool for parallel decompression of multiple blocks
- Pre-allocate output buffers based on `uncompressBufSize`

**Current code** (src/unzip.ts:7-13):
```typescript
export function unzip(input: Buffer) {
  const inputArray = new Uint8Array(input.buffer, input.byteOffset + 2)
  const result = inflateRaw(inputArray)
  return Buffer.from(result.buffer, result.byteOffset, result.byteLength)
}
```

**Benchmark**: Compare compressed vs uncompressed performance
```bash
yarn benchmark | grep "compressed\|uncompressed"
```

**Expected gain**: 20-50% for compressed data

---

### 3. Cache Size Tuning (`src/bbi.ts:37`)

**Current behavior**: `QuickLRU` with `maxSize: 1000`

**Opportunity**:
- Profile cache hit/miss rates
- Adjust based on typical usage patterns
- Consider separate caches for headers vs data blocks
- Implement cache warming for predictable access patterns

**Test**:
```bash
# Monitor cache effectiveness
yarn profile | grep "Cached"
```

**Expected gain**: 5-20% for repeated queries

---

### 4. Lazy Feature Parsing (`src/block-view.ts`)

**Current behavior**: Parses all features in a block immediately

**Opportunity**:
- Parse features on-demand as they're consumed from the Observable
- Only parse features that fall within the requested region
- Skip parsing if only counting features

**Example** (src/block-view.ts:341-411):
The `parseBigWigBlock` function could be modified to return an iterator instead of an array.

**Expected gain**: 15-40% when querying large blocks with small target regions

---

## Medium Impact Optimizations

### 5. Index Caching (`src/block-view.ts:86-241`)

**Current behavior**: CIR tree traversal on every query

**Opportunity**:
- Cache CIR tree paths for frequently accessed regions
- Cache chromosome bounds to skip impossible queries early
- Pre-compute block boundaries for common zoom levels

**Code location**: `cirFobRecur2` function

**Expected gain**: 10-25% for repeated region queries

---

### 6. Buffer Pooling

**Current behavior**: Allocates new buffers for each read

**Opportunity**:
- Pool and reuse buffers for file reads
- Reuse typed arrays for parsing
- Single buffer for multiple small reads

**Expected gain**: 5-15% reduction in GC pressure, 10-20% memory reduction

---

### 7. Parallel Block Fetching (`src/block-view.ts:65-84`)

**Current behavior**: Blocks fetched sequentially via grouped reads

**Opportunity**:
- Fetch multiple groups in parallel
- Use HTTP/2 multiplexing for network files
- Overlap I/O with decompression

**Expected gain**: 20-40% for large queries, especially on network files

---

### 8. Binary Search Optimization

**Current behavior**: Linear filtering after block retrieval

**Opportunity**:
- Binary search within blocks when features are sorted
- Early termination when past query region
- Skip features outside range during parsing

**Expected gain**: 10-30% for small queries in large blocks

---

## Low Impact (Quick Wins)

### 9. Avoid Extra Copies (`src/unzip.ts:12`)

**Current code**:
```typescript
return Buffer.from(result.buffer, result.byteOffset, result.byteLength)
```

**Opportunity**: Return view instead of copy when safe

**Expected gain**: 5-10% memory, 2-5% speed

---

### 10. Optimize Header Reads (`src/bbi.ts:72-191`)

**Current behavior**: Reads 2000 bytes initially, may re-read

**Opportunity**:
- Analyze actual header sizes in test files
- Adjust initial read size to avoid second read
- Or read larger chunk upfront for large files

**Expected gain**: 10-20% faster header parsing for files that need re-read

---

### 11. Type Array Views

**Opportunity**: Use DataView consistently instead of creating new TypedArrays

**Current pattern** (throughout codebase):
```typescript
const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.length)
```

**Expected gain**: 3-8% reduction in object creation

---

## Profiling-Driven Optimizations

### 12. Identify Hot Paths with CPU Profiler

Run the CPU profiler to find actual bottlenecks:

```bash
yarn profile:cpu
# Open the .cpuprofile in Chrome DevTools
```

Look for:
- Functions taking >10% of total time
- Unexpected allocations in tight loops
- Redundant computations

---

### 13. Memory Profiling

Run with GC tracing:

```bash
node --trace-gc --experimental-strip-types benchmarks/profiling.ts
```

Look for:
- Frequent minor GC (suggests too many allocations)
- Major GC during queries (suggests memory leaks)
- Growing heap after queries complete

---

## Testing Strategy

For each optimization:

1. **Baseline**: Run benchmarks before changes
   ```bash
   yarn benchmark > before.txt
   ```

2. **Implement**: Make the optimization

3. **Measure**: Run benchmarks after changes
   ```bash
   yarn benchmark > after.txt
   ```

4. **Compare**: Use the comparison tool
   ```bash
   node --experimental-strip-types benchmarks/compare.ts before.txt after.txt
   ```

5. **Profile**: Verify with detailed profiling
   ```bash
   yarn profile:cpu
   ```

6. **Validate**: Ensure tests still pass
   ```bash
   yarn test --run
   ```

---

## Recommended Order

Start with the highest impact, easiest to implement:

1. **Block grouping threshold tuning** (Easy, High impact for network files)
2. **Lazy feature parsing** (Medium difficulty, High impact)
3. **Cache size tuning** (Easy, Medium impact)
4. **Decompression optimization** (Medium difficulty, High impact)
5. **Buffer pooling** (Medium difficulty, Medium impact)
6. **Parallel block fetching** (Hard, High impact for large files)

After implementing each, compare results and profile to verify improvements.

---

## Long-term Considerations

### WebAssembly

Consider WASM for:
- Decompression (zlib)
- Parsing (especially BigBed with complex records)
- Index traversal

### Streaming

Consider streaming APIs:
- Stream decompression
- Stream parsing (don't buffer entire blocks)
- Backpressure handling for large queries

### Worker Threads

For Node.js environments:
- Parallel decompression across cores
- Parallel parsing of multiple blocks
- Don't block main thread for large files
