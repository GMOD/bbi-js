// from https://github.com/yume-chan/ya-webadb/blob/main/libraries/dataview-bigint-polyfill
// license:MIT
// needed for browsers including safari 14
import { getBigInt64, getBigUint64 } from './pure.ts'

// Note: these methods live on DataView.prototype, not the DataView constructor,
// so the feature check must test the prototype. Testing `in DataView` is always
// false and would clobber the native (fast) implementation everywhere. `has` is
// a plain (non-type-guard) helper so tsc doesn't narrow the prototype to `never`
// in the branch below (its lib types declare these methods as always present).
const has = (obj: object, key: string) => key in obj

if (!has(DataView.prototype, 'getBigInt64')) {
  DataView.prototype.getBigInt64 = function (byteOffset, littleEndian) {
    return getBigInt64(this, byteOffset, littleEndian)
  }
}

if (!has(DataView.prototype, 'getBigUint64')) {
  DataView.prototype.getBigUint64 = function (byteOffset, littleEndian) {
    return getBigUint64(this, byteOffset, littleEndian)
  }
}
