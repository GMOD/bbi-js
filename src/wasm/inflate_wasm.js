/* @ts-self-types="./inflate_wasm.d.ts" */

import * as wasm from "./inflate_wasm_bg.wasm";
import { __wbg_set_wasm } from "./inflate_wasm_bg.js";
__wbg_set_wasm(wasm);

export {
    decompress_and_parse_bigbed, decompress_and_parse_bigwig, decompress_and_parse_summary, inflate_raw, inflate_raw_batch, inflate_raw_unknown_size, parse_bigbed_blocks, parse_bigwig_block, parse_bigwig_blocks, parse_summary_block, parse_summary_blocks
} from "./inflate_wasm_bg.js";
