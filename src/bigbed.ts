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
   * @return Promise with an Observable of array of features
   */
  public async getFeatureStream(refName: string, start: number, end: number): Promise<Observable<Feature[]>> {
    await this.parseHeader()
    const chrName = this.renameRefSeqs(refName)

    const view = await this.getView(1)
    if (!view) {
      throw new Error('unable to get block view for data')
    }
    return new Observable((observer: Observer<Feature[]>) => {
      view.readWigData(chrName, start, end, observer)
    })
  }

  public async getFeatures(refName: string, start: number, end: number): Promise<Feature[]> {
    const observables = await this.getFeatureStream(refName, start, end)
    return observables.toPromise()
  }
}
