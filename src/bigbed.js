const BBI = require('./bbi')

export default class BigBed extends BBI {
  async getFeatures(refName, start, end) {
    await this.gotHeader
    const chrName = this.renameRefSeq(refName)

    const view = this.getView(1)
    if (!view) {
      return null
    }

    return view.readWigData(chrName, start, end)
  }
}
