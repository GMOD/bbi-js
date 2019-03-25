import BBI from './bbi'

export default class BigBed extends BBI {
  async getFeatures(refName: string, start: number, end: number): Promise<any> {
    await this.initData()
    const chrName = this.renameRefSeqs(refName)

    const view = await this.getView(1)
    if (!view) {
      return null
    }

    return view.readWigData(chrName, start, end)
  }
}
