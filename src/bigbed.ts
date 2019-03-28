import BBI from './bbi'
import Feature from './feature'
import { Observable, Observer } from 'rxjs'

export default class BigBed extends BBI {
  /**
   * Gets features from a BigWig file
   *
   * @param refName - The chromosome name
   * @param start - The start of a region
   * @param end - The end of a region
   * @param opts - An object containing basesPerSpan (e.g. pixels per basepair) or scale used to infer the zoomLevel to use
   * @return array of features
   */
  public async getFeatures(refName: string, start: number, end: number): Promise<Observable<Feature[]>> {
    await this.initData()
    const chrName = this.renameRefSeqs(refName)

    const view = await this.getView(1)
    if (!view) {
      throw new Error('unable to get block view for data')
    }
    return new Observable((observer: Observer<Feature[]>) => {
      view.readWigData(chrName, start, end, observer)
    })
  }
}
