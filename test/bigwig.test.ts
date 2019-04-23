import BigWig from '../src/bigwig'

class HalfAbortController {
  public signal: any
  public constructor() {
    this.signal = { aborted: false }
  }

  public abort(): void {
    this.signal.aborted = true
  }
}

describe('bigwig formats', () => {
  it('loads bedgraph bigwig file', async () => {
    const ti = new BigWig({
      path: require.resolve('./data/volvox.bw'),
    })
    const feats1 = await ti.getFeatures('ctgA', 0, 100, { scale: 1 })
    const feats2 = await ti.getFeatures('ctgA', 0, 100, { scale: 0.01 })
    const feats3 = await ti.getFeatures('ctgA', 0, 100, { scale: 0.001 })
    const feats4 = await ti.getFeatures('ctgA', 2000, 2100, { scale: 0.001 })
    expect(feats1).toMatchSnapshot()
    expect(feats2).toMatchSnapshot()
    expect(feats3).toMatchSnapshot()
    expect(feats4).toMatchSnapshot()
  })
  it('loads variable step bigwig', async () => {
    const ti = new BigWig({
      path: require.resolve('./data/variable_step.bw'),
    })
    const feats1 = await ti.getFeatures('chr1', 0, 51, { scale: 1 })
    const feats2 = await ti.getFeatures('chr1', 0, 52, { scale: 1 })
    expect(feats1).toMatchSnapshot()
    expect(feats1[feats1.length - 1].start).toEqual(47)
    expect(feats2[feats2.length - 1].start).toEqual(51)
  })
  it('loads fixedstep bigwig', async () => {
    const ti = new BigWig({
      path: require.resolve('./data/volvox_microarray.bw'),
    })
    const feats1 = await ti.getFeatures('ctgA', 0, 1000, { scale: 1 })
    const feats2 = await ti.getFeatures('ctgA', 0, 1000, { scale: 0.01 })
    const feats3 = await ti.getFeatures('ctgA', 0, 1000, { scale: 0.001 })
    const feats4 = await ti.getFeatures('ctgA', 2000, 2100, { scale: 0.001 })
    expect(feats1).toMatchSnapshot()
    expect(feats2).toMatchSnapshot()
    expect(feats3).toMatchSnapshot()
    expect(feats4).toMatchSnapshot()
  })

  it('inside file deeply', async () => {
    const ti = new BigWig({
      path: require.resolve('./data/volvox.bw'),
    })
    const feats5 = await ti.getFeatures('ctgA', 20000, 21000)
    expect(feats5.slice(10, 20)).toMatchSnapshot()
  })

  it('missing data', async () => {
    const ti = new BigWig({
      path: require.resolve('./data/volvox.bw'),
    })
    const feats = await ti.getFeatures('ctgA', 4200, 5600)
    expect(feats.length).toEqual(1401)
    expect(feats.slice(10, 20)).toMatchSnapshot()
    expect(feats.slice(1000, 1010)).toMatchSnapshot()
  })

  it('loads a larger bigwig file at different scales', async () => {
    const ti = new BigWig({
      path: require.resolve('./data/cow.bw'),
    })
    const feats1 = await ti.getFeatures('GK000001.2', 2000000, 2100000, {
      scale: 1,
    })
    const feats2 = await ti.getFeatures('GK000001.2', 2000000, 2100000, {
      scale: 0.01,
    })
    const feats3 = await ti.getFeatures('GK000001.2', 2000000, 2100000, {
      scale: 0.001,
    })
    const feats4 = await ti.getFeatures('GK000001.2', 2000000, 2100000, {
      scale: 0.001,
    })
    const feats5 = await ti.getFeatures('GK000001.2', 2000000, 2100000, {
      scale: 0.00001,
    })
    const f4max = Math.max(...feats4.map(s => s.score))
    const f5max = Math.max(...feats5.map(s => s.maxScore))
    expect(feats5).toMatchSnapshot() // summary block
    expect(feats1.slice(10, 20)).toMatchSnapshot()
    expect(feats2.slice(10, 20)).toMatchSnapshot()
    expect(feats3.slice(10, 20)).toMatchSnapshot()
    expect(feats4.slice(10, 20)).toMatchSnapshot()
  })

  it('performs regularization', async () => {
    const ti = new BigWig({
      path: require.resolve('./data/volvox.bw'),
      renameRefSeqs: ref => ref.replace('contig', 'ctg'),
    })
    const feats = await ti.getFeatures('contigA', 4200, 5600)
    expect(feats.length).toEqual(1401)
  })

  it('matches bigWigToBedGraph', async () => {
    const ti = new BigWig({
      path: require.resolve('./data/cow.bw'),
    })
    const feats = await ti.getFeatures('GK000001.2', 1000000, 1001000)

    // match bigWigToBedGraph output approximately, the start and ends are not clipped like bedGraphToBigWig does though
    const ret = `GK000001.2	999003	1000189	0
    GK000001.2	1000189	1000210	1
    GK000001.2	1000210	1000245	2
    GK000001.2	1000245	1000276	1
    GK000001.2	1000276	1000716	0
    GK000001.2	1000716	1000803	2
    GK000001.2	1000803	1000933	0
    GK000001.2	1000933	1000972	2
    GK000001.2	1000972	1000977	1
    GK000001.2	1000977	1001000	0`
      .split('\n')
      .map(s => {
        const r = s.split('\t')
        return {
          start: +r[1],
          end: +r[2],
          score: +r[3],
        }
      })
    expect(feats).toEqual(ret)
  })

  it('test memoize', async () => {
    const ti = new BigWig({
      path: require.resolve('./data/cow.bw'),
    })
    const ret = await ti.getHeader()
    ret.iWasMemoized = true
    expect((await ti.getHeader()).iWasMemoized).toEqual(true)
  })

  it('abort loading a bigwig file', async () => {
    const ti = new BigWig({
      path: require.resolve('./data/volvox.bw'),
    })
    const aborter = new HalfAbortController()
    const indexDataP = ti.getHeader(aborter.signal)
    aborter.abort()
    await expect(indexDataP).rejects.toThrow(/aborted/)
    const header = await ti.getHeader()
    expect(header.isBigEndian).toEqual(false)
  })

  it('test a slow loading getfeatures', async () => {
    const ti = new BigWig({
      path: require.resolve('./data/volvox.bw'),
    })
    const indexDataP = ti.getHeader()
    const feats = await ti.getFeatures('ctgA', 10000, 40000)
    expect(feats.length).toEqual(30001)
  })
})
