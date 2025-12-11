import './bigint-polyfill/polyfill.ts'
export { BigWig } from './bigwig.ts'
export { BigBed } from './bigbed.ts'
export { parseBigWig } from './parse-bigwig.ts'
export type {
  BigWigHeader,
  Feature,
  RequestOptions,
  BigWigFeatureArrays,
  SummaryFeatureArrays,
} from './types.ts'
