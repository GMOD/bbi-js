const zlib = require('zlib')
const { promisify } = require('es6-promisify')

const gunzip = promisify(zlib.gunzip)

const pako = require('pako')

// in node, just use the native unzipping with Z_SYNC_FLUSH
function nodeUnzip(input) {
  return gunzip(input, {
    finishFlush: (zlib.constants || zlib).Z_SYNC_FLUSH,
  })
}
function pakoUnzip(input) {
  return pako.inflate(input)
}

module.exports = {
  unzip: typeof __webpack_require__ === 'function' ? pakoUnzip : nodeUnzip, // eslint-disable-line
  nodeUnzip,
  pakoUnzip,
}
