import { BigWig, parseBigWig } from './esm/index.js'

const bw = new BigWig({ path: 'test/data/cDC.bw' })

const result = await parseBigWig(bw)
