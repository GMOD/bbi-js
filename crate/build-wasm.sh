#!/usr/bin/env bash
set -euo pipefail

# Read exact wasm-bindgen version pinned in Cargo.lock
REQUIRED=$(awk '/^name = "wasm-bindgen"$/{found=1} found && /^version/{gsub(/"/, "", $3); print $3; exit}' Cargo.lock)
INSTALLED=$(wasm-bindgen --version 2>/dev/null | awk '{print $2}' || true)

if [ "$INSTALLED" != "$REQUIRED" ]; then
  echo "wasm-bindgen-cli $INSTALLED != $REQUIRED — installing $REQUIRED"
  if command -v cargo-binstall &>/dev/null; then
    cargo binstall "wasm-bindgen-cli@$REQUIRED" --no-confirm
  else
    cargo install wasm-bindgen-cli --version "$REQUIRED" --locked
  fi
fi

cargo build --release --target wasm32-unknown-unknown
wasm-bindgen --target bundler --out-dir ../src/wasm target/wasm32-unknown-unknown/release/inflate_wasm.wasm
rm -f ../src/wasm/inflate_wasm_bg.wasm.d.ts
