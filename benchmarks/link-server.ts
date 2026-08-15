// An HTTP file server that behaves like a network link rather than a disk:
// one RTT before the first byte of every response, a bandwidth budget SHARED
// across all in-flight responses, and a cap on how many requests can be in
// flight at once (what a browser enforces per origin on HTTP/1.1).
//
// The shared budget is the part that keeps the benchmark honest: on a
// bandwidth-bound transfer, issuing reads concurrently cannot beat
// bytes/bandwidth, and a per-response throttle would invent a speedup that no
// real link gives you.
import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'

import type { Server } from 'node:http'

const sleep = (ms: number) =>
  ms > 0 ? new Promise(resolve => setTimeout(resolve, ms)) : undefined

// One link's bandwidth, handed out in ticks to whoever is waiting. FIFO, so N
// concurrent responses interleave and each gets ~1/N of the pipe.
class SharedLink {
  private tokens = 0
  private waiters: { bytes: number; resolve: () => void }[] = []
  private timer: NodeJS.Timeout | undefined
  private readonly perTick: number
  private readonly bytesPerSec: number

  constructor(bytesPerSec: number) {
    this.bytesPerSec = bytesPerSec
    this.perTick = bytesPerSec / 100
  }

  start() {
    if (this.bytesPerSec === Infinity) {
      return
    }
    this.timer = setInterval(() => {
      this.tokens += this.perTick
      while (this.waiters.length > 0 && this.tokens >= this.waiters[0]!.bytes) {
        const w = this.waiters.shift()!
        this.tokens -= w.bytes
        w.resolve()
      }
    }, 10)
    this.timer.unref()
  }

  stop() {
    clearInterval(this.timer)
  }

  send(bytes: number) {
    if (this.bytesPerSec === Infinity) {
      return undefined
    }
    return new Promise<void>(resolve => {
      this.waiters.push({ bytes, resolve })
    })
  }
}

export interface LinkProfile {
  /** one-way-ish request→first-byte delay, ms */
  rttMs: number
  /** bytes/sec shared across every in-flight response */
  bandwidth: number
  /** max requests in flight; 6 is a browser's HTTP/1.1 per-origin cap */
  maxInFlight: number
}

export interface ServerStats {
  requests: number
  bytes: number
  peakInFlight: number
}

const CHUNK = 32 * 1024

export async function startLinkServer(path: string, profile: LinkProfile) {
  const size = statSync(path).size
  const link = new SharedLink(profile.bandwidth)
  link.start()

  const stats: ServerStats = { requests: 0, bytes: 0, peakInFlight: 0 }
  let inFlight = 0
  const queue: (() => void)[] = []

  const acquire = () => {
    if (inFlight < profile.maxInFlight) {
      inFlight++
      stats.peakInFlight = Math.max(stats.peakInFlight, inFlight)
      return undefined
    }
    return new Promise<void>(resolve => {
      queue.push(() => {
        inFlight++
        stats.peakInFlight = Math.max(stats.peakInFlight, inFlight)
        resolve()
      })
    })
  }
  const release = () => {
    inFlight--
    queue.shift()?.()
  }

  const server: Server = createServer((req, res) => {
    void (async () => {
      await acquire()
      try {
        // one round trip before anything comes back
        await sleep(profile.rttMs)

        const range = /bytes=(\d+)-(\d+)?/.exec(req.headers.range ?? '')
        const start = range ? Number(range[1]) : 0
        const end = range?.[2] ? Math.min(Number(range[2]), size - 1) : size - 1
        stats.requests++
        stats.bytes += end - start + 1

        res.writeHead(range ? 206 : 200, {
          'content-type': 'application/octet-stream',
          'content-length': String(end - start + 1),
          'accept-ranges': 'bytes',
          ...(range
            ? { 'content-range': `bytes ${start}-${end}/${size}` }
            : {}),
        })

        const stream = createReadStream(path, {
          start,
          end,
          highWaterMark: CHUNK,
        })
        for await (const chunk of stream) {
          const buf = chunk as Buffer
          await link.send(buf.length)
          if (!res.write(buf)) {
            await new Promise(resolve => res.once('drain', resolve))
          }
        }
        res.end()
      } finally {
        release()
      }
    })()
  })

  // keep-alive on, like a browser: a request costs one RTT, not a handshake
  server.keepAliveTimeout = 60_000
  await new Promise<void>(resolve => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const { port } = server.address() as { port: number }

  return {
    url: `http://127.0.0.1:${port}/data.bw`,
    stats,
    reset() {
      stats.requests = 0
      stats.bytes = 0
      stats.peakInFlight = 0
    },
    async close() {
      link.stop()
      await new Promise(resolve => {
        server.closeAllConnections()
        server.close(resolve)
      })
    },
  }
}
