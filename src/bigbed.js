const BBI = require('./bbi')

export default class BigBed extends BBI {
  getFeatures(refName, start, end, opts = {}) {
    const chrName = this.renameRefSeq(refName)
    let view

    view = this.getView(1)
    if (!view) {
      return null
    }

    return view.readWigData(chrName, start, end)
  }

  parseBigBedBlock(bytes, startOffset) {
    const data = this.window.bwg.newDataView(bytes, startOffset)

    let offset = 0
    while (offset < bytes.byteLength) {
      const chromId = data.getUint32(offset)
      const start = data.getInt32(offset + 4)
      const end = data.getInt32(offset + 8)
      offset += 12
      if (chromId !== this.chr) {
        console.warn('BigBed block is out of current range')
        return
      }

      let rest = ''
      while (offset < bytes.byteLength) {
        const ch = data.getUint8(offset)
        offset += 1
        if (ch !== 0) {
          rest += String.fromCharCode(ch)
        } else {
          break
        }
      }

      const featureData = this.parseBedText(start, end, rest)
      featureData.id = `bb-${startOffset + offset}`
      this.maybeCreateFeature(start, end, featureData)
    }
  }


}
