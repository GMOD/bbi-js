import BBI from './bbi'

export default class BigWig extends BBI {
  async getFeatureChunks(refName, start, end, opts = {}) {
    await this.gotHeader
    const chrName = this.renameRefSeq(refName)
    let view

    if (opts.basesPerSpan) {
      view = this.getView(1 / opts.basesPerSpan)
    } else if (opts.scale) {
      view = this.getView(opts.scale)
    } else {
      view = this.getView(1)
    }

    if (!view) {
      return null
    }

    return view.readWigData(chrName, start, end)
  }

  async getFeatures(refName, start, end, opts = {}) {
    const tmp = await this.getFeatureChunks(refName, start, end, opts)
    const ret = await Promise.all(tmp).then(res => res.flat())
    const ret2 = await Promise.all(ret).then(res => res.flat())
    return ret2.flat().flat()
  }
}
