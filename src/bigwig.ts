import BlockView from './blockView'
import BBI from './bbi'

export default class BigWig extends BBI {
  protected async getView(scale: number, abortSignal?: AbortSignal): Promise<BlockView> {
    const { zoomLevels, refsByName, fileSize, isBigEndian, uncompressBufSize } = await this.getHeader(abortSignal)
    const { bbi } = this
    const basesPerPx = 1 / scale
    let maxLevel = zoomLevels.length
    if (!fileSize) {
      // if we don't know the file size, we can't fetch the highest zoom level :-(
      maxLevel -= 1
    }

    for (let i = maxLevel; i > 0; i -= 1) {
      const zh = zoomLevels[i]
      if (zh && zh.reductionLevel <= 2 * basesPerPx) {
        const indexLength =
          i < zoomLevels.length - 1 ? zoomLevels[i + 1].dataOffset - zh.indexOffset : fileSize - 4 - zh.indexOffset
        return new BlockView(
          bbi,
          refsByName,
          zh.indexOffset,
          indexLength,
          isBigEndian,
          uncompressBufSize > 0,
          'summary',
        )
      }
    }
    return this.getUnzoomedView(abortSignal)
  }
}
