import type { BigWig } from './bigwig.ts'
import type { BigWigFeatureArrays, RequestOptions2 } from './types.ts'

/**
 * Reads all base-resolution features from every chromosome in a BigWig file.
 * Zoom levels and chromosomes with no data are skipped.
 *
 * @param bigwig - a `BigWig` instance
 * @param opts - optional `RequestOptions` (e.g. `opts.signal` for abort)
 * @returns `Promise<BigWigFeatureArrays[]>` — one entry per chromosome that
 *   has data, in chromosome order
 */
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
