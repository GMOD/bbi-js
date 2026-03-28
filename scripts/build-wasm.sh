#!/bin/bash
set -e

cd "$(dirname "$0")/../crate"

WB_VERSION=$(grep -A1 '^name = "wasm-bindgen"$' Cargo.lock | grep version | head -1 | sed 's/.*"\(.*\)"/\1/')
INSTALLED_VERSION=$(wasm-bindgen --version 2>/dev/null | awk '{print $2}')
if [ "$INSTALLED_VERSION" != "$WB_VERSION" ]; then
  echo "Installing wasm-bindgen-cli@${WB_VERSION} (have: ${INSTALLED_VERSION:-none})..."
  cargo install wasm-bindgen-cli --version "$WB_VERSION"
fi

echo "Building WASM..."
cargo build --release --target wasm32-unknown-unknown

echo "Generating JS bindings..."
wasm-bindgen --target bundler --out-dir ../src/wasm target/wasm32-unknown-unknown/release/inflate_wasm.wasm

echo "Bundling with webpack..."
cd ..
npx webpack --config crate/webpack.config.js

echo "WASM build complete!"
