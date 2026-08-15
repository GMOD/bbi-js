// Wall-clock cost of a query over a simulated network link, for one build of
// the library. `scripts/network-bench.sh` runs it once per build and prints the
// comparison; run it directly to measure a single build:
//
//   BBI_SRC=./src/index.ts node --experimental-strip-types benchmarks/network-bench.ts
//
// One build per process, deliberately: two versions in one process share
// undici's connection pool and the wasm instance, so whichever ran second would
// inherit the first's warm state.
//
// Reads are timed against a link, not a disk — see link-server.ts. What that
// buys is the ability to tell a latency-bound query from a bandwidth-bound one,
// which is the whole question for read scheduling: only the first kind can be
// made faster by issuing reads concurrently, and a benchmark against a local
// file cannot tell them apart because both are free.
import { RemoteFile } from 'generic-filehandle2'

import { startLinkServer } from './link-server.ts'

import type { LinkProfile } from './link-server.ts'
import type { BigWig as BigWigType } from '../src/index.ts'

const SRC = process.env.BBI_SRC ?? '../src/index.ts'
const DATA = process.env.BBI_DATA ?? 'test/data/cDC.bw'
const LABEL = process.env.BBI_LABEL ?? SRC
const TRIALS = Number(process.env.BBI_TRIALS ?? 5)

const { BigWig } = (await import(SRC)) as {
  BigWig: new (args: { filehandle: RemoteFile }) => BigWigType
}

const PROFILES: Record<string, LinkProfile> = {
  // a CDN edge in the same region, fast wired link
  'edge-20ms-100mbit': { rttMs: 20, bandwidth: 100e6 / 8, maxInFlight: 6 },
  // cross-country to a single-region bucket, typical home broadband
  'cross-country-60ms-50mbit': {
    rttMs: 60,
    bandwidth: 50e6 / 8,
    maxInFlight: 6,
  },
  // cross-continent, or 4G — where round trips dominate everything
  'transatlantic-150ms-10mbit': {
    rttMs: 150,
    bandwidth: 10e6 / 8,
    maxInFlight: 6,
  },
}

interface Ref {
  name: string
  length: number
}

interface Scenario {
  name: string
  regions: (refs: Ref[]) => { refName: string; start: number; end: number }[]
  basesPerSpan: number
}

const SCENARIOS: Scenario[] = [
  {
    // an LGV showing every contig at once, which is what a bigwig overview is
    name: 'whole-genome overview (24 regions, summary zoom)',
    regions: refs =>
      refs.map(r => ({ refName: r.name, start: 0, end: r.length })),
    basesPerSpan: 250_000_000 / 1000,
  },
  {
    // a multi-region or collapsed-intron view: the shape that turns into many
    // block groups spread across the file
    name: 'multi-region base resolution (24 x 2Mb)',
    regions: refs =>
      refs.map(r => ({
        refName: r.name,
        start: 0,
        end: Math.min(r.length, 2_000_000),
      })),
    basesPerSpan: 1,
  },
  {
    name: 'multi-region moderate zoom (24 x 2Mb, 10bp/px)',
    regions: refs =>
      refs.map(r => ({
        refName: r.name,
        start: 0,
        end: Math.min(r.length, 2_000_000),
      })),
    basesPerSpan: 10,
  },
  {
    name: 'single locus base resolution (1 x 1Mb)',
    regions: refs => [{ refName: refs[0]!.name, start: 0, end: 1_000_000 }],
    basesPerSpan: 1,
  },
]

const median = (xs: number[]) => xs.toSorted((a, b) => a - b)[xs.length >> 1]!

for (const [profileName, profile] of Object.entries(PROFILES)) {
  const server = await startLinkServer(DATA, profile)
  const probe = new BigWig({ filehandle: new RemoteFile(server.url) })
  const refs = Object.values((await probe.getHeader()).refsByNumber) as Ref[]

  for (const scenario of SCENARIOS) {
    const regions = scenario.regions(refs)
    const times: number[] = []
    let requests = 0
    let bytes = 0
    let features = 0

    for (let trial = 0; trial < TRIALS; trial++) {
      // a fresh BigWig each trial: its caches would make trial 2 free, and a
      // user navigating to a new locus gets a cold read either way. The header
      // is read outside the timed section for the same reason - it is one
      // request that every path pays identically.
      const bw = new BigWig({ filehandle: new RemoteFile(server.url) })
      await bw.getHeader()
      server.reset()
      const t0 = performance.now()
      const res = await bw.getFeaturesAsArraysMulti(regions, {
        basesPerSpan: scenario.basesPerSpan,
      })
      times.push(performance.now() - t0)
      requests = server.stats.requests
      bytes = server.stats.bytes
      features = res.starts.length
    }

    console.log(
      JSON.stringify({
        label: LABEL,
        profile: profileName,
        scenario: scenario.name,
        medianMs: Math.round(median(times)),
        allMs: times.map(t => Math.round(t)),
        requests,
        kb: Math.round(bytes / 1024),
        peakInFlight: server.stats.peakInFlight,
        features,
      }),
    )
  }

  await server.close()
}
