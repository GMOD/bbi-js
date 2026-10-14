# Concurrency

A single query issues up to six byte-range reads at once, either for the index
nodes at one level of the R-tree or for the groups of adjacent data blocks it
reads as one. Its wall-clock time is therefore the longest of those reads rather
than their sum, and the reader still returns features in file order.

The gain from overlapping reads depends on whether a query is latency-bound or
bandwidth-bound. `scripts/network-bench.sh` measures it by serving a real file
over HTTP with a round-trip delay, a bandwidth budget shared across in-flight
responses, and a six-request cap (a browser's HTTP/1.1 per-origin limit). The
table compares against `v11.1.0`, on `cDC.bw`:

| query                               | reads | 20ms/100Mbit    | 60ms/50Mbit      | 150ms/10Mbit      |
| ----------------------------------- | ----- | --------------- | ---------------- | ----------------- |
| whole-genome overview, summary zoom | 3     | 205 → 204ms     | 335 → 324ms      | 605 → 583ms       |
| 24 regions × 2Mb, base resolution   | 44    | 941 → **374ms** | 1946 → **713ms** | 4060 → **1519ms** |
| 24 regions × 2Mb, 10bp/px           | 44    | 954 → **342ms** | 1938 → **720ms** | 4013 → **1508ms** |
| one locus × 1Mb, base resolution    | 4     | 124 → 121ms     | 287 → 273ms      | 626 → 631ms       |

Every row reads the same bytes in the same number of requests, and only the
scheduling differs. A query whose blocks already merge into a handful of reads
has no round trips to overlap, so its time is unchanged. A query that touches
many block groups runs ~2.5× faster, at every latency, because bandwidth never
limited it.

BigBed gains more, ~4× on the same multi-region rows
(`BBI_DATA=test/data/clinvarCnv.bb`). BigBed has no zoom levels, so every query
reads unzoomed blocks spread across the file rather than a compact run of
summary records.

## How many requests a query makes

Read-ahead **reschedules** reads and adds none, so a query issues the same range
requests as it did without read-ahead. The number of requests depends on the
index, because the reader merges adjacent on-disk blocks into one read. A
whole-genome overview therefore makes a handful, and a multi-region
base-resolution query makes tens.

Six is not the ceiling on requests in flight either. A multi-region query walks
every region's index at once, so its fan-out is the region count, and that
behavior predates read-ahead. The table lists the peak number of reads
outstanding at the filehandle on `cDC.bw`, which is the same before and after
read-ahead:

| query                                      | peak in flight | requests |
| ------------------------------------------ | -------------- | -------- |
| 1 region, base resolution                  | 1              | 4        |
| 24 regions, base resolution                | 24             | 44       |
| 100 regions, base resolution               | 27             | 49       |
| 10 files × 24 regions, 10 files at a time  | 240            | 470      |
| 100 files × 24 regions, 10 files at a time | 240            | 4700     |

The caller's fan-out sets the peak, so a caller that bounds its fan-out bounds
the peak. In the last two rows, ten times as many files leaves the peak
unchanged and grows only the total. Whatever limit you choose, a browser on
HTTP/1.1 runs six requests per origin and queues the rest.

A caller that already fans out over files overlaps many of the round trips that
read-ahead would overlap, so it gains less from read-ahead than a single-file
query does.
