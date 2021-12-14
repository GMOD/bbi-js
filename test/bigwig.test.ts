/* eslint @typescript-eslint/explicit-function-return-type: 0 */
import { BigWig, Header } from '../src/'

class HalfAbortController {
  public signal: any

  public constructor() {
    this.signal = { aborted: false }
  }

  public abort(): void {
    this.signal.aborted = true
  }
}

interface ExtendedHeader extends Header {
  iWasMemoized: boolean
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
  it('loads simple fixedstep bigwig', async () => {
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
  it('loads fixedstep bigwig with starts', async () => {
    const ti = new BigWig({
      path: require.resolve('./data/fixedStep.bw'),
    })
    const feats1 = await ti.getFeatures('chr1', 0, 1000, { scale: 1 })
    const feats2 = await ti.getFeatures('chr1', 11000, 12000, { scale: 1 })
    expect(feats1).toMatchSnapshot()
    expect(feats2).toMatchSnapshot()
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
    const f5max = Math.max(...feats5.map(s => s.maxScore || 0))
    expect(f4max).toEqual(f5max)
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
    const ret = `GK000001.2\t999003\t1000189\t0
    GK000001.2\t1000189\t1000210\t1
    GK000001.2\t1000210\t1000245\t2
    GK000001.2\t1000245\t1000276\t1
    GK000001.2\t1000276\t1000716\t0
    GK000001.2\t1000716\t1000803\t2
    GK000001.2\t1000803\t1000933\t0
    GK000001.2\t1000933\t1000972\t2
    GK000001.2\t1000972\t1000977\t1
    GK000001.2\t1000977\t1001000\t0`
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
    const ret = (await ti.getHeader()) as ExtendedHeader
    ret.iWasMemoized = true
    const ret2 = (await ti.getHeader()) as ExtendedHeader
    expect(ret2.iWasMemoized).toEqual(true)
  })

  it('abort loading a bigwig file', async () => {
    const ti = new BigWig({
      path: require.resolve('./data/volvox.bw'),
    })
    const aborter = new HalfAbortController()
    const indexDataP = ti.getHeader({ signal: aborter.signal })
    aborter.abort()
    await expect(indexDataP).rejects.toThrow(/aborted/)
    const header = await ti.getHeader()
    expect(header.isBigEndian).toEqual(false)
  })

  it('abort loading a bigwig file (plain abortsignal passed in)', async () => {
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
    const feats = await ti.getFeatures('ctgA', 10000, 40000)
    expect(feats.length).toEqual(30001)
  })

  it('should load a lot of summary data', async () => {
    const ti = new BigWig({
      path: require.resolve('./data/ENCFF826FLP.bw'),
    })
    const feats = await ti.getFeatures('chr22', 0, 51222087, { scale: 0.00001 })
    expect(feats.slice(0, 10)).toMatchSnapshot()
    expect(feats.slice(-10)).toMatchSnapshot()
    expect(feats.length).toEqual(595)
  })

  it('abort with getFeatures', async () => {
    const ti = new BigWig({
      path: require.resolve('./data/volvox.bw'),
    })
    const aborter = new HalfAbortController()
    const ob = ti.getFeatures('ctgA', 0, 100, { signal: aborter.signal })
    aborter.abort()
    await expect(ob).rejects.toThrow(/aborted/)
  })
  it('abort with getFeatureStream', async () => {
    const ti = new BigWig({
      path: require.resolve('./data/volvox.bw'),
    })
    const aborter = new HalfAbortController()
    const ob = await ti.getFeatureStream('ctgA', 0, 100, { signal: aborter.signal })
    aborter.abort()
    await expect(ob.toPromise()).rejects.toThrow(/aborted/)
  })
  it('test uncompressed bw (-unc from wigToBigWig)', async () => {
    const ti = new BigWig({
      path: require.resolve('./data/uncompressed.bw'),
    })
    const ob = await ti.getFeatures('ctgA', 40000, 40100)
    expect(ob.slice(0, 10)).toMatchSnapshot()
  })
})
