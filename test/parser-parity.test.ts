import { expect, test } from 'vitest'

import { BigWig } from '../src/index.ts'

// Four parsers read the same on-disk records, and which one runs is decided by
// things a caller never sees — whether the file is compressed, whether it asked
// for objects or typed arrays, whether it named one region or several:
//
//   parseBigWigBlock / parseSummaryBlock          JS, Feature[]
//   parseBigWigBlockAsArrays / ...AsArrays        JS, typed arrays
//   decompress_and_parse_bigwig / ..._summary     wasm, typed arrays (fused)
//
// So the record layouts, the coord filter and the summary mean are each stated
// more than once, in two languages. This sweeps them against each other over
// every test file and zoom level rather than trusting the comments that say
// they agree. Drift shows up here as a diff, not as a track quietly missing
// features on the one path a user happened to take.
//
// Scores compare through Math.fround because the object parsers keep a double:
// the summary mean is sumData/validCnt, computed in f64 in JS and in f32 in
// wasm, and the arrays round it to f32 on store. Every other field is a raw
// read of the same bytes and must be exactly equal.
const FILES = [
  'volvox.bw',
  'cDC.bw',
  'ENCFF826FLP.bw',
  'cow.bw',
  'fixedStep.bw',
  'pvalues.bw',
  'uncompressed.bw',
  'variable_step.bw',
  'variable_step_large.bw',
  'volvox_microarray.bw',
  'example_bigwig_unsorted_with_error_small.bw',
]

// base resolution, then two zoom levels, so both the bigwig and the summary
// parsers are swept on every file that has zoom levels at all
const SCALES = [1, 100, 10_000]
const WINDOW = 2_000_000

interface Row {
  start: number
  end: number
  score: number
  minScore?: number
  maxScore?: number
}

const fromArrays = (a: {
  starts: Int32Array
  ends: Int32Array
  scores: Float32Array
  minScores?: Float32Array
  maxScores?: Float32Array
  isSummary: boolean
}): Row[] =>
  Array.from({ length: a.starts.length }, (_, i) => ({
    start: a.starts[i]!,
    end: a.ends[i]!,
    score: a.scores[i]!,
    ...(a.isSummary
      ? { minScore: a.minScores![i], maxScore: a.maxScores![i] }
      : {}),
  }))

const fromFeatures = (feats: Row[]): Row[] =>
  feats.map(f => ({
    start: f.start,
    end: f.end,
    score: Math.fround(f.score),
    ...(f.minScore === undefined
      ? {}
      : {
          minScore: Math.fround(f.minScore),
          maxScore: Math.fround(f.maxScore!),
        }),
  }))

async function windows(bw: BigWig) {
  const header = await bw.getHeader()
  const refs = Object.values(header.refsByNumber) as {
    name: string
    length: number
  }[]
  return refs.slice(0, 2).map(r => ({
    refName: r.name,
    start: 0,
    end: Math.min(r.length, WINDOW),
  }))
}

// Windows whose edges land exactly on a record's own boundaries. The half-open
// tests are `start < reqEnd && end > reqStart`, so only a query edge that
// coincides with a record edge separates them from `<=` / `>=`; over arbitrary
// windows an off-by-one filter agrees with a correct one on every file here.
function boundaryWindows(pick: Row) {
  return [
    { start: pick.start, end: pick.end },
    { start: Math.max(0, pick.start - 1), end: pick.start },
    { start: pick.end, end: pick.end + 1 },
    { start: pick.start, end: pick.start + 1 },
    { start: Math.max(0, pick.end - 1), end: pick.end },
  ]
}

test.each(FILES)('%s: the object and typed-array parsers agree', async file => {
  const bw = new BigWig({ path: `test/data/${file}` })
  const regions = await windows(bw)
  let compared = 0
  let boundaries = 0

  const compareOne = async (
    refName: string,
    start: number,
    end: number,
    basesPerSpan: number,
  ) => {
    const opts = { basesPerSpan }
    const objects = await bw.getFeatures(refName, start, end, opts)
    const arrays = await bw.getFeaturesAsArrays(refName, start, end, opts)
    expect({ start, end, rows: fromFeatures(objects as Row[]) }).toEqual({
      start,
      end,
      rows: fromArrays(arrays),
    })
    return objects.length
  }

  for (const basesPerSpan of SCALES) {
    for (const { refName, start, end } of regions) {
      const n = await compareOne(refName, start, end, basesPerSpan)
      compared += n

      const probe = await bw.getFeatures(refName, start, end, { basesPerSpan })
      const pick = (probe as Row[])[Math.floor(probe.length / 2)]
      if (pick) {
        for (const w of boundaryWindows(pick)) {
          await compareOne(refName, w.start, w.end, basesPerSpan)
          boundaries++
        }
      }
    }

    // >= 2 regions takes the multi-region path, which parses per region in JS
    // on both sides rather than through the fused wasm call
    if (regions.length > 1) {
      const objects = await bw.getFeaturesMulti(regions, { basesPerSpan })
      const arrays = await bw.getFeaturesAsArraysMulti(regions, {
        basesPerSpan,
      })
      const { regionOffsets } = arrays
      for (const [i, region] of regions.entries()) {
        expect({
          region: region.refName,
          rows: fromFeatures(objects[i] as Row[]),
        }).toEqual({
          region: region.refName,
          rows: fromArrays({
            ...arrays,
            starts: arrays.starts.subarray(
              regionOffsets[i],
              regionOffsets[i + 1],
            ),
            ends: arrays.ends.subarray(regionOffsets[i], regionOffsets[i + 1]),
            scores: arrays.scores.subarray(
              regionOffsets[i],
              regionOffsets[i + 1],
            ),
            ...(arrays.isSummary
              ? {
                  minScores: arrays.minScores.subarray(
                    regionOffsets[i],
                    regionOffsets[i + 1],
                  ),
                  maxScores: arrays.maxScores.subarray(
                    regionOffsets[i],
                    regionOffsets[i + 1],
                  ),
                }
              : {}),
          }),
        })
      }
    }
  }

  // a file that returned nothing everywhere would pass every assertion above
  expect(compared).toBeGreaterThan(0)
  expect(boundaries).toBeGreaterThan(0)
})
