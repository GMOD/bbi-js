#!/bin/bash
#
# Compare two revisions' query wall clock over a simulated network link and
# print the table. Defaults to HEAD against the previous release tag:
#
#   ./scripts/network-bench.sh                 # HEAD vs the last tag
#   ./scripts/network-bench.sh v11.1.0 HEAD
#
# Uses a detached git worktree rather than checking branches out in place, so it
# is safe to run with the tree dirty and in a checkout someone else is using.
# Both revisions run from source under node's type stripping - no build step,
# and no chance of measuring a stale dist/.

set -euo pipefail

BASE="${1:-$(git describe --tags --abbrev=0)}"
HEADREV="${2:-HEAD}"
TRIALS="${BBI_TRIALS:-5}"

ROOT=$(git rev-parse --show-toplevel)
WORK=$(mktemp -d)
trap 'git -C "$ROOT" worktree remove --force "$WORK/base" 2>/dev/null || true; rm -rf "$WORK"' EXIT

git -C "$ROOT" worktree add --detach "$WORK/base" "$BASE" >/dev/null
# resolution walks up from the worktree, which is outside the repo
ln -s "$ROOT/node_modules" "$WORK/base/node_modules"

run() {
  BBI_LABEL="$1" BBI_SRC="$2" BBI_TRIALS="$TRIALS" \
    node --experimental-strip-types "$ROOT/benchmarks/network-bench.ts"
}

{
  if [[ $HEADREV == HEAD ]]; then
    run "$HEADREV" "$ROOT/src/index.ts"
  else
    git -C "$ROOT" worktree add --detach "$WORK/head" "$HEADREV" >/dev/null
    ln -s "$ROOT/node_modules" "$WORK/head/node_modules"
    run "$HEADREV" "$WORK/head/src/index.ts"
  fi
  run "$BASE" "$WORK/base/src/index.ts"
} >"$WORK/results.jsonl"

BASE="$BASE" HEADREV="$HEADREV" node -e '
const rows = require("fs").readFileSync(process.argv[1], "utf8").trim().split("\n").map(l => JSON.parse(l))
const {BASE, HEADREV} = process.env
const rowsByKey = new Map()
for (const r of rows) {
  const k = r.profile + "|" + r.scenario
  const e = rowsByKey.get(k) ?? {}
  e[r.label] = r
  e.any = r
  rowsByKey.set(k, e)
}
const pad = (s, n) => String(s).padEnd(n)
console.log(pad("profile", 28) + pad("scenario", 50) + pad("reqs", 6) + pad(BASE, 10) + pad(HEADREV, 10) + "speedup")
for (const [k, e] of rowsByKey) {
  const [p, s] = k.split("|")
  const a = e[BASE].medianMs
  const b = e[HEADREV].medianMs
  console.log(pad(p, 28) + pad(s, 50) + pad(e.any.requests, 6) + pad(a + "ms", 10) + pad(b + "ms", 10) + (a / b).toFixed(2) + "x")
}
' "$WORK/results.jsonl"
