import BBI from './bbi'
import Feature from './feature'
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
  public async getFeatures(
    refName: string,
    start: number,
    end: number,
    opts: Options = { scale: 1 },
  ): Promise<Feature[]> {
    await this.initData()
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
      throw new Error('unable to get block view for data')
    }

    return view.readWigData(chrName, start, end)
  }
}
