import BBI from './bbi'
import Feature from './feature'
import { Observable, Observer } from 'rxjs'

import BlockView from './blockView'
interface Options {
  basesPerSpan?: number
  scale?: number
}
export default class BigWig extends BBI {
  /**
   * Gets features from a BigWig file
   *
   * @param refName - The chromosome name
   * @param start - The start of a region
   * @param end - The end of a region
   * @param opts - An object containing basesPerSpan (e.g. pixels per basepair) or scale used to infer the zoomLevel to use
   */
  public async getFeatureStream(
    refName: string,
    start: number,
    end: number,
    opts: Options = { scale: 1 },
  ): Promise<Observable<Feature[]>> {
    await this.initData()
    const chrName = this.renameRefSeqs(refName)
    let view: BlockView

    if (opts.basesPerSpan) {
      view = await this.getView(1 / opts.basesPerSpan)
    } else if (opts.scale) {
      view = await this.getView(opts.scale)
    } else {
      view = await this.getView(1)
    }

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
    const observables = await this.getFeatureStream(refName, start, end, opts)
    return observables.toPromise()
  }
}
