import BBI from './bbi'
import Feature from './feature'

export default class BigBed extends BBI {
  public async getFeatures(refName: string, start: number, end: number): Promise<Feature[]> {
    await this.initData()
    const chrName = this.renameRefSeqs(refName)

    const view = await this.getView(1)
    if (!view) {
      throw new Error('unable to get block view for data')
    }

    return view.readWigData(chrName, start, end)
  }
}
