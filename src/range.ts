/**
 * Adapted from a combination of Range and _Compound in the
 * Dalliance Genome Explorer, (c) Thomas Down 2006-2010.
 */

export interface IRange {
  min: number
  max: number
}
export default class Range {
  public ranges: IRange[]

  public constructor(arg1: IRange[]) {
    this.ranges = arg1
  }

  get min() {
    return this.ranges[0]!.min
  }

  get max() {
    return this.ranges.at(-1)!.max
  }

  public contains(pos: number) {
    for (const r of this.ranges) {
      if (r.min <= pos && r.max >= pos) {
        return true
      }
    }
    return false
  }

  public isContiguous(): boolean {
    return this.ranges.length > 1
  }

  public getRanges() {
    return this.ranges.map(r => new Range([r]))
  }

  public toString(): string {
    return this.ranges.map(r => `[${r.min}-${r.max}]`).join(',')
  }

  public union(s1: Range) {
    const allRanges = [...this.ranges, ...s1.ranges].sort((a, b) => {
      return a.min !== b.min ? a.min - b.min : a.max - b.max
    })

    const merged: IRange[] = []
    let current = allRanges[0]!

    for (let i = 1; i < allRanges.length; i++) {
      const nxt = allRanges[i]!
      if (nxt.min > current.max + 1) {
        merged.push(current)
        current = nxt
      } else if (nxt.max > current.max) {
        current = { min: current.min, max: nxt.max }
      }
    }
    merged.push(current)

    return new Range(merged)
  }
}
