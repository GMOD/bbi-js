import type { BigWig } from './bigwig.ts'
import type { Feature, RequestOptions2 } from './types.ts'

export async function parseBigWig(
  bigwig: BigWig,
  opts?: RequestOptions2,
): Promise<Feature[]> {
  const header = await bigwig.getHeader(opts)
  const allFeatures: Feature[] = []

  for (const ref of Object.values(header.refsByNumber)) {
    const features = await bigwig.getFeatures(ref.name, 0, ref.length, opts)
    for (const feature of features) {
      allFeatures.push(feature)
    }
  }

  return allFeatures
}
