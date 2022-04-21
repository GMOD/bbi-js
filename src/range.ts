/* eslint prefer-rest-params:0, no-nested-ternary:0 */

/**
 * Adapted from a combination of Range and _Compound in the
 * Dalliance Genome Explorer, (c) Thomas Down 2006-2010.
 */
export default class Range {
  public ranges: any

  public constructor(arg1: any, arg2?: any) {
    this.ranges =
      arguments.length === 2
        ? [{ min: arg1, max: arg2 }]
        : 0 in arg1
        ? Object.assign({}, arg1)
        : [arg1]
  }

  public min(): number {
    return this.ranges[0].min
  }

  public max(): number {
    return this.ranges[this.ranges.length - 1].max
  }

  public contains(pos: number): boolean {
    for (let s = 0; s < this.ranges.length; s += 1) {
      const r = this.ranges[s]
      if (r.min <= pos && r.max >= pos) {
        return true
      }
    }
    return false
  }

  public isContiguous(): boolean {
    return this.ranges.length > 1
  }

  public getRanges(): Range[] {
    return this.ranges.map((r: Range) => new Range(r.min, r.max))
  }

  public toString(): string {
    return this.ranges.map((r: Range) => `[${r.min}-${r.max}]`).join(',')
  }

  public union(s1: Range): Range {
    const ranges = this.getRanges().concat(s1.getRanges()).sort(this.rangeOrder)
    const oranges = []
    let current = ranges[0]

    for (let i = 1; i < ranges.length; i += 1) {
      const nxt = ranges[i]
      if (nxt.min() > current.max() + 1) {
        oranges.push(current)
        current = nxt
      } else if (nxt.max() > current.max()) {
        current = new Range(current.min(), nxt.max())
      }
    }
    oranges.push(current)

    if (oranges.length === 1) {
      return oranges[0]
    }
    return new Range(oranges)
  }

  public intersection(arg: Range): Range {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let s0 = this
    let s1 = arg
    const r0 = this.ranges()
    const r1 = s1.ranges()
    const l0 = r0.length

    const l1 = r1.length
    let i0 = 0

    let i1 = 0
    const or = []

    while (i0 < l0 && i1 < l1) {
      s0 = r0[i0]
      s1 = r1[i1]
      const lapMin = Math.max(s0.min(), s1.min())
      const lapMax = Math.min(s0.max(), s1.max())
      if (lapMax >= lapMin) {
        or.push(new Range(lapMin, lapMax))
      }
      if (s0.max() > s1.max()) {
        i1 += 1
      } else {
        i0 += 1
      }
    }

    if (or.length === 0) {
      throw new Error('found range of length 0')
    }
    if (or.length === 1) {
      return or[0]
    }
    return new Range(or)
  }

  public coverage(): number {
    let tot = 0
    const rl = this.ranges()
    for (let ri = 0; ri < rl.length; ri += 1) {
      const r = rl[ri]
      tot += r.max() - r.min() + 1
    }
    return tot
  }

  public rangeOrder(tmpa: Range, tmpb: Range): number {
    let a = tmpa
    let b = tmpb
    if (arguments.length < 2) {
      b = a
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      a = this
    }

    if (a.min() < b.min()) {
      return -1
    }
    if (a.min() > b.min()) {
      return 1
    }
    if (a.max() < b.max()) {
      return -1
    }
    if (b.max() > a.max()) {
      return 1
    }
    return 0
  }
}
