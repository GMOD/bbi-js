import BBI from './bbi'

export default class BigBed extends BBI {
  async getFeatures(refName:string, start:number, end:number) {
    await this.getHeader()
    const chrName = this.renameRefSeq(refName)

    const view = this.getView(1)
    if (!view) {
      return null
    }

    return view.readWigData(chrName, start, end)
  }
}
