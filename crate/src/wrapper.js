import wasmData from '../../src/wasm/inflate_wasm_bg.wasm';
import * as bg from '../../src/wasm/inflate_wasm_bg.js';

let wasm = null;
let initPromise = null;

async function init() {
    if (wasm) return wasm;

    if (!initPromise) {
        initPromise = (async () => {
            const response = await fetch(wasmData);
            const bytes = await response.arrayBuffer();
            const { instance } = await WebAssembly.instantiate(bytes, {
                './inflate_wasm_bg.js': bg
            });
            wasm = instance.exports;
            bg.__wbg_set_wasm(wasm);
            return wasm;
        })();
    }

    return initPromise;
}

export async function inflateRaw(input, outputSize) {
    await init();
    return bg.inflate_raw(input, outputSize);
}

export async function inflateRawUnknownSize(input) {
    await init();
    return bg.inflate_raw_unknown_size(input);
}
