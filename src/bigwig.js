import BBI from './bbi'

export default class BigWig extends BBI {
  getFeatures(refName, start, end, opts = {}) {
    const res = this.getFeatureChunks(refName, start, end, opts)
    console.log('wtf', res)
    return res.then(console.error)
  }

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
}
