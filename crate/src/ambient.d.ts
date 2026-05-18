// Webpack's asset/inline rule turns .wasm imports into data URL strings at
// build time. wasm-bindgen ships a .wasm.d.ts that disagrees (typing it as
// a wasm exports namespace), so the build:wasm script deletes that file and
// this ambient module takes over.
declare module '*.wasm' {
  const url: string
  export default url
}

// inflate_wasm_bg.js is wasm-bindgen's internal glue and ships without a
// .d.ts. We only need __wbg_set_wasm from it to wire up wasm exports after
// our custom fetch+instantiate; public-API calls go through inflate_wasm.js.
declare module '*/inflate_wasm_bg.js' {
  export function __wbg_set_wasm(exports: WebAssembly.Exports): void
}
