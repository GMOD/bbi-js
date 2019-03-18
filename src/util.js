export function filterBlocks(b, chr, min, max) {
  return (
    (b.startChrom < chr || (b.startChrom === chr && b.startBase <= max)) &&
    (b.endChrom > chr || (b.endChrom === chr && b.endBase >= min))
  )
}

export function hello() {
  console.log('hello')
}
