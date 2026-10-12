#!/usr/bin/env bash
# The wasm bundle's bytes depend on the build machine (libdeflate's C goes
# through the system clang), so a fresh build can't be compared with the
# committed bundle. Instead build:wasm records a hash of crate/, which holds
# every input, next to a hash of the bundle it produced, and the check fails
# when either has changed since.
#
#   wasm-stamp.sh write   record both hashes (build:wasm runs this)
#   wasm-stamp.sh check   fail unless both still match
set -euo pipefail

cd "$(dirname "$0")/.."
STAMP=crate/wasm-inputs.sha256
BUNDLE=src/wasm/inflate-wasm-inlined.js

current() {
  git ls-files -z --cached --others --exclude-standard -- crate ":(exclude)$STAMP" |
    LC_ALL=C sort -z |
    xargs -0 sha256sum |
    sha256sum |
    sed 's|-$|crate/|'
  sha256sum "$BUNDLE"
}

case "${1:-}" in
  write)
    current >"$STAMP"
    ;;
  check)
    if ! diff <(current) "$STAMP" >/dev/null; then
      diff <(current) "$STAMP" >&2 || true
      echo "crate/ or $BUNDLE changed since build:wasm last ran." >&2
      echo "Run pnpm build:wasm, then commit $BUNDLE and $STAMP." >&2
      exit 1
    fi
    echo "$BUNDLE was built from the current crate/"
    ;;
  *)
    echo "usage: $0 write|check" >&2
    exit 2
    ;;
esac
