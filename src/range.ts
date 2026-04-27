export interface IRange {
  min: number
  max: number
}

// Merges overlapping or adjacent byte ranges so that nearby R-tree nodes can
// be fetched in a single read rather than many small reads
export function mergeRanges(ranges: IRange[]) {
  if (ranges.length === 0) {
    return []
  }
  const sorted = [...ranges].sort((a, b) =>
    a.min !== b.min ? a.min - b.min : a.max - b.max,
  )

  const merged: IRange[] = []
  let current = sorted[0]!

  for (let i = 1; i < sorted.length; i++) {
    const nxt = sorted[i]!
    if (nxt.min > current.max + 1) {
      merged.push(current)
      current = nxt
    } else if (nxt.max > current.max) {
      current = { min: current.min, max: nxt.max }
    }
  }
  merged.push(current)

  return merged
}
