const BBI = require('./bbi')

export default class BigWig extends BBI {
  async getFeatures(refName, start, end, opts = {}) {
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
