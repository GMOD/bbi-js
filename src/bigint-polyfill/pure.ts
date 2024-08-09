const BigInt32 = BigInt(32)

export function getBigInt64(
  dataView: DataView,
  byteOffset: number,
  littleEndian: boolean | undefined,
): bigint {
  const littleEndianMask = Number(!!littleEndian)
  const bigEndianMask = Number(!littleEndian)

  return (
    (BigInt(
      dataView.getInt32(byteOffset, littleEndian) * bigEndianMask +
        dataView.getInt32(byteOffset + 4, littleEndian) * littleEndianMask,
    ) <<
      BigInt32) |
    BigInt(
      dataView.getUint32(byteOffset, littleEndian) * littleEndianMask +
        dataView.getUint32(byteOffset + 4, littleEndian) * bigEndianMask,
    )
  )
}

export function getBigUint64(
  dataView: DataView,
  byteOffset: number,
  littleEndian: boolean | undefined,
): bigint {
  const a = dataView.getUint32(byteOffset, littleEndian)
  const b = dataView.getUint32(byteOffset + 4, littleEndian)

  const littleEndianMask = Number(!!littleEndian)
  const bigEndianMask = Number(!littleEndian)

  // This branch-less optimization is 77x faster than normal ternary operator.
  // and only 3% slower than native implementation
  // https://jsbench.me/p8kyhg1eqv/1
  return (
    (BigInt(a * bigEndianMask + b * littleEndianMask) << BigInt32) |
    BigInt(a * littleEndianMask + b * bigEndianMask)
  )
}
