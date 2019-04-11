import BBI from './bbi'
import { Observable, Observer } from 'rxjs'
import { flatten } from './util'

export default class BigBed extends BBI {
  /**
   * Gets features from a BigWig file
   *
   * @param refName - The chromosome name
   * @param start - The start of a region
   * @param end - The end of a region
   * @return Promise with an Observable of array of features
   */
  public async getFeatureStream(
    refName: string,
    start: number,
    end: number,
    opts: Options = {},
  ): Promise<Observable<Feature[]>> {
    await this.getHeader(opts.signal)
    const chrName = this.renameRefSeqs(refName)

    const view = await this.getView(1)
    if (!view) {
      throw new Error('unable to get block view for data')
    }
    return new Observable((observer: Observer<Feature[]>) => {
      view.readWigData(chrName, start, end, observer)
    })
  }

  public async getFeatures(
    refName: string,
    start: number,
    end: number,
    opts: Options = { scale: 1 },
  ): Promise<Feature[]> {
    let features: Feature[][] = []
    const ob = await this.getFeatureStream(refName, start, end, opts)
    return new Promise((resolve, reject) => {
      // prettier-ignore
      ob.subscribe(
        feats => features = features.concat(feats),
        error => reject(error),
        () => {
          resolve(flatten(features))
        }
      )
    })
  }
}
