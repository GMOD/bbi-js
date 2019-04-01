import fetch from 'cross-fetch'
import BufferCache from './bufferCache'

export default class RemoteFile {
  private position: number
  private url: string
  private cache: any
  private _stat: any

  public constructor(source: string) {
    this.position = 0
    this.url = source
    this.cache = new BufferCache({
      fetch: (start: number, length: number): Promise<Buffer> => this._fetch(start, length),
    })
  }

  private async _fetch(position: number, length: number): Promise<Buffer> {
    const headers: any = {}
    if (length < Infinity) {
      headers.range = `bytes=${position}-${position + length}`
    } else if (length === Infinity && position !== 0) {
      headers.range = `bytes=${position}-`
    }
    const response = await fetch(this.url, {
      method: 'GET',
      headers,
      redirect: 'follow',
      mode: 'cors',
    })
    if ((response.status === 200 && position === 0) || response.status === 206) {
      const nodeBuffer = Buffer.from(await response.arrayBuffer())

      // try to parse out the size of the remote file
      const sizeMatch = /\/(\d+)$/.exec(response.headers.get('content-range') || '')
      if (sizeMatch && sizeMatch[1]) this._stat = { size: parseInt(sizeMatch[1], 10) }

      return nodeBuffer
    }
    throw new Error(`HTTP ${response.status} fetching ${this.url}`)
  }

  public read(buffer: Buffer, offset: number = 0, length: number = Infinity, position: number = 0): Promise<Buffer> {
    let readPosition = position
    if (readPosition === null) {
      readPosition = this.position
      this.position += length
    }
    return this.cache.get(buffer, offset, length, position)
  }

  public async readFile(): Promise<Buffer> {
    const response = await fetch(this.url, {
      method: 'GET',
      redirect: 'follow',
      mode: 'cors',
    })
    return Buffer.from(await response.arrayBuffer())
  }

  public async stat(): Promise<any> {
    if (!this._stat) {
      const buf = Buffer.allocUnsafe(10)
      await this.read(buf, 0, 10, 0)
      if (!this._stat) throw new Error(`unable to determine size of file at ${this.url}`)
    }
    return this._stat
  }
}
