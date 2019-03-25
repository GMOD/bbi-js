import BBI from './bbi'

interface Options {
  basesPerSpan?: number
  scale?: number
}
export default class BigWig extends BBI {
  async getFeatures(refName: string, start: number, end: number, opts: Options = { scale: 1 }) {
    const { chroms, header } = await this.initData()
    const chrName = this.renameRefSeqs(refName)
    let view

    if (opts.basesPerSpan) {
      view = await this.getView(1 / opts.basesPerSpan)
    } else if (opts.scale) {
      view = await this.getView(opts.scale)
    } else {
      view = await this.getView(1)
    }

    if (!view) {
      return null
    }

    return view.readWigData(chrName, start, end)
  }
}
