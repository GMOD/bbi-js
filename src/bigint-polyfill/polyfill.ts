import { getBigInt64, getBigUint64 } from './pure'

if (!('getBigInt64' in DataView)) {
  DataView.prototype.getBigInt64 = function (byteOffset, littleEndian) {
    return getBigInt64(this, byteOffset, littleEndian)
  }
}

if (!('getBigUint64' in DataView)) {
  DataView.prototype.getBigUint64 = function (byteOffset, littleEndian) {
    return getBigUint64(this, byteOffset, littleEndian)
  }
}
