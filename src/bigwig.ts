import BBI from './bbi'



interface Options {
  basesPerSpan?: number;
  scale?: number;
}
export default class BigWig extends BBI {
  async getFeatures(refName:string, start:number, end:number, opts: Options={scale:1}) {
    await this.getHeader()
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
