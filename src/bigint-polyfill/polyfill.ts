// from https://github.com/yume-chan/ya-webadb/blob/main/libraries/dataview-bigint-polyfill
// license:MIT
// needed for browsers including safari 14
import { getBigInt64, getBigUint64 } from './pure.ts'

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
