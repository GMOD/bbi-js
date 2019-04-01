import LRU from 'quick-lru'

interface Options {
  fetch?: (start: number, length: number) => Promise<Buffer>
  size?: number
  chunkSize?: number
}

interface Chunk {
  data: Buffer
  chunkNumber: number
}
export default class BufferCache {
  private fetch: (start: number, length: number) => Promise<Buffer>
  private chunkSize: number
  private lruCache: LRU<any, Promise<Buffer>>

  public constructor(opts: Options) {
    if (!opts.fetch) throw new Error('fetch function required')
    this.fetch = opts.fetch
    this.chunkSize = opts.chunkSize || 32768
    const size = opts.size || 10000000
    this.lruCache = new LRU({ maxSize: Math.floor(size / this.chunkSize) })
  }

  public async get(outputBuffer: Buffer, offset: number, length: number, position: number): Promise<void> {
    if (outputBuffer.length < offset + length) throw new Error('output buffer not big enough for request')

    // calculate the list of chunks involved in this fetch
    const firstChunk = Math.floor(position / this.chunkSize)
    const lastChunk = Math.floor((position + length) / this.chunkSize)

    // fetch them all as necessary
    const fetches = new Array(lastChunk - firstChunk + 1)
    for (let chunk = firstChunk; chunk <= lastChunk; chunk += 1) {
      fetches[chunk - firstChunk] = this._getChunk(chunk).then(data => ({
        data,
        chunkNumber: chunk,
      }))
    }

    // stitch together the response buffer using them
    const chunks = await Promise.all(fetches)
    const chunksOffset = position - chunks[0].chunkNumber * this.chunkSize
    chunks.forEach(
      (c: Chunk): void => {
        const { chunkNumber, data } = c
        const chunkPositionStart = chunkNumber * this.chunkSize
        let copyStart = 0
        let copyEnd = this.chunkSize
        let copyOffset = offset + (chunkNumber - firstChunk) * this.chunkSize - chunksOffset

        if (chunkNumber === firstChunk) {
          copyOffset = offset
          copyStart = chunksOffset
        }
        if (chunkNumber === lastChunk) {
          copyEnd = position + length - chunkPositionStart
        }

        data.copy(outputBuffer, copyOffset, copyStart, copyEnd)
      },
    )
  }

  private _getChunk(chunkNumber: number): Promise<Buffer> {
    const cachedPromise = this.lruCache.get(chunkNumber)
    if (cachedPromise) return cachedPromise

    const freshPromise = this.fetch(chunkNumber * this.chunkSize, this.chunkSize)
    this.lruCache.set(chunkNumber, freshPromise)
    return freshPromise
  }
}
