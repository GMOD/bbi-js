const { promisify } = require('es6-promisify')
declare var __webpack_require__: any

// don't load fs native module if running in webpacked code
const fs = typeof __webpack_require__ !== 'function' ? require('fs') : null // eslint-disable-line camelcase

const fsOpen = fs && promisify(fs.open)
const fsRead = fs && promisify(fs.read)
const fsFStat = fs && promisify(fs.fstat)
const fsReadFile = fs && promisify(fs.readFile)

export default class LocalFile {
  private fd: any
  private position: number
  private filename: string
  constructor(source: string) {
    this.position = 0
    this.filename = source
    this.fd = fsOpen(this.filename, 'r')
  }

  async read(buffer: Buffer, offset: number = 0, length: number, position: number) {
    let readPosition = position
    if (readPosition === null) {
      readPosition = this.position
      this.position += length
    }
    const ret = await fsRead(await this.fd, buffer, offset, length, position)
    if (typeof ret === 'object') return ret.bytesRead
    return ret
  }

  async readFile() {
    return fsReadFile(this.filename)
  }
  // todo memoize
  async stat() {
    return fsFStat(await this.fd)
  }
}
