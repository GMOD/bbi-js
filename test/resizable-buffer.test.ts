import { expect, test } from 'vitest'

// Browsers back WebAssembly.Memory with a RESIZABLE ArrayBuffer, and
// TextDecoder.decode rejects a view over one:
//
//   TypeError: Failed to execute 'decode' on 'TextDecoder':
//   The provided ArrayBuffer value must not be resizable
//
// wasm-bindgen's getStringFromWasm0 decodes exactly such a view, so without a
// copy every string leaving Rust throws in a browser. The only strings this
// crate returns are error messages, which means the module cannot report its own
// errors and consumers get the TypeError above in place of the real cause.
// crate/build-wasm.sh patches the generated glue to copy; full rationale is in
// bgzf-filehandle agent-docs/adr/0002.
//
// Node's TextDecoder accepts the view, so nothing else in this suite would ever
// catch a regression here — which is the point of stating it outright.

test('node TextDecoder is lenient where browsers are not', () => {
  const resizable = new ArrayBuffer(8, { maxByteLength: 64 })
  expect(resizable.resizable).toBe(true)
  const view = new Uint8Array(resizable)
  view.set([104, 101, 108, 108, 111])
  // Passes here, throws in a browser. That asymmetry is the whole hazard, and
  // it is why a green suite says nothing about resizable-buffer handling.
  expect(new TextDecoder().decode(view.subarray(0, 5))).toBe('hello')
  // A copy is accepted by both.
  expect(view.subarray(0, 5).slice().buffer.resizable).toBeFalsy()
})

test('the generated glue copies before decoding strings', async () => {
  const { readFile } = await import('node:fs/promises')
  for (const f of ['inflate_wasm_bg.js', 'inflate-wasm-inlined.js']) {
    const src = await readFile(
      new URL(`../src/wasm/${f}`, import.meta.url),
      'utf8',
    )
    expect(src).toContain('subarray(ptr, ptr + len).slice()')
    expect(src).not.toMatch(/subarray\(ptr, ptr \+ len\)\);/)
  }
})
