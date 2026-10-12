#!/usr/bin/env bash
# Run after `pnpm build`: fails when the rebuilt wasm bundle differs from the
# committed one, so a crate/ change can't land without its regenerated bundle.
set -euo pipefail

cd "$(dirname "$0")/.."
DRIFT="$(git status --porcelain -- src/wasm)"
if [ -n "$DRIFT" ]; then
  echo "$DRIFT" >&2
  echo "src/wasm does not match a fresh build of crate/." >&2
  echo "Run pnpm build:wasm, then commit src/wasm." >&2
  exit 1
fi
echo "src/wasm matches a fresh build"
