import type { BigWig } from './bigwig.ts'
import type { BigWigFeatureArrays, RequestOptions2 } from './types.ts'

export async function parseBigWig(
  bigwig: BigWig,
  opts?: RequestOptions2,
): Promise<BigWigFeatureArrays[]> {
  const header = await bigwig.getHeader(opts)
  const results: BigWigFeatureArrays[] = []
  for (const ref of Object.values(header.refsByNumber)) {
    const r = await bigwig.getFeaturesAsArrays(ref.name, 0, ref.length, opts)
    if (!r.isSummary && r.starts.length > 0) {
      results.push(r)
    }
  }
  return results
}
