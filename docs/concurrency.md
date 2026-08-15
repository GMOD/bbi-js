# Concurrency

A single query issues up to six byte-range reads at once — index nodes at a
level, and the coalesced data-block groups — so its wall clock is the longest of
its reads rather than their sum. Features still come back in file order.

How much that is worth depends on whether a query is latency-bound or
bandwidth-bound. `./scripts/network-bench.sh` measures it, serving a real file
over HTTP with a round-trip delay, a bandwidth budget shared across in-flight
responses, and a six-request cap (a browser's HTTP/1.1 per-origin limit).
Against `v11.1.0`, on `cDC.bw`:

| query                               | reads | 20ms/100Mbit    | 60ms/50Mbit      | 150ms/10Mbit      |
| ----------------------------------- | ----- | --------------- | ---------------- | ----------------- |
| whole-genome overview, summary zoom | 3     | 205 → 204ms     | 335 → 324ms      | 605 → 583ms       |
| 24 regions × 2Mb, base resolution   | 44    | 941 → **374ms** | 1946 → **713ms** | 4060 → **1519ms** |
| 24 regions × 2Mb, 10bp/px           | 44    | 954 → **342ms** | 1938 → **720ms** | 4013 → **1508ms** |
| one locus × 1Mb, base resolution    | 4     | 124 → 121ms     | 287 → 273ms      | 626 → 631ms       |

Same bytes and the same number of requests in every row — only their scheduling
changed. A query that already coalesces to a handful of reads has no round trips
to overlap and is unchanged; the win is ~2.5× wherever a query touches many
block groups, and it holds at every latency because the bytes were never the
bound there.

BigBed gains more — ~4× on the same multi-region rows
(`BBI_DATA=test/data/clinvarCnv.bb`) — because it has no zoom levels, so every
query reads unzoomed blocks spread across the file rather than a compact run of
summary records.

## How many requests a query makes

Read-ahead **reschedules** reads; it never adds one. A query issues the same
range requests it always did, and how many that is depends on the index, not on
this: adjacent on-disk blocks coalesce into one read, so a whole-genome overview
is a handful and a multi-region base-resolution query is tens.

The six is not the ceiling on requests in flight either, because a multi-region
query walks every region's index at once — that fan-out is the region count, and
it predates read-ahead. Measured on `cDC.bw`, peak reads outstanding at the
filehandle, identical before and after:

| query                                      | peak in flight | requests |
| ------------------------------------------ | -------------- | -------- |
| 1 region, base resolution                  | 1              | 4        |
| 24 regions, base resolution                | 24             | 44       |
| 100 regions, base resolution               | 27             | 49       |
| 10 files × 24 regions, 10 files at a time  | 240            | 470      |
| 100 files × 24 regions, 10 files at a time | 240            | 4700     |

So a caller's own fan-out is what sets the peak, and bounding it is what bounds
the peak — note the last two rows, where ten times the files leaves the peak
unchanged and only the total grows. Whatever you choose, the transport throttles
the rest: a browser runs six per origin on HTTP/1.1 and queues the remainder.

A caller already fanning out over files has also overlapped much of what
read-ahead does, so it gains less from it than a single-file query does.
