/**
 * Combined decompress + parse for BigBed blocks
 * Returns: [count: u32][starts: i32*n][ends: i32*n][uid_offsets: u32*n][string_offsets: u32*(n+1)][string_data: bytes]
 * @param {Uint8Array} inputs
 * @param {Uint32Array} input_offsets
 * @param {Uint32Array} input_lengths
 * @param {Uint32Array} block_file_offsets
 * @param {number} max_block_size
 * @param {number} req_chr_id
 * @param {number} req_start
 * @param {number} req_end
 * @returns {Uint8Array}
 */
export function decompress_and_parse_bigbed(inputs, input_offsets, input_lengths, block_file_offsets, max_block_size, req_chr_id, req_start, req_end) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(inputs, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(input_offsets, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray32ToWasm0(input_lengths, wasm.__wbindgen_export);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passArray32ToWasm0(block_file_offsets, wasm.__wbindgen_export);
        const len3 = WASM_VECTOR_LEN;
        wasm.decompress_and_parse_bigbed(retptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, max_block_size, req_chr_id, req_start, req_end);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v5 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v5;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Combined decompress + parse for BigWig blocks
 * Returns same format as parse_bigwig_block but handles multiple compressed blocks
 * @param {Uint8Array} inputs
 * @param {Uint32Array} input_offsets
 * @param {Uint32Array} input_lengths
 * @param {number} max_block_size
 * @param {number} req_start
 * @param {number} req_end
 * @returns {Uint8Array}
 */
export function decompress_and_parse_bigwig(inputs, input_offsets, input_lengths, max_block_size, req_start, req_end) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(inputs, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(input_offsets, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray32ToWasm0(input_lengths, wasm.__wbindgen_export);
        const len2 = WASM_VECTOR_LEN;
        wasm.decompress_and_parse_bigwig(retptr, ptr0, len0, ptr1, len1, ptr2, len2, max_block_size, req_start, req_end);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v4 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v4;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Combined decompress + parse for summary blocks
 * @param {Uint8Array} inputs
 * @param {Uint32Array} input_offsets
 * @param {Uint32Array} input_lengths
 * @param {number} max_block_size
 * @param {number} req_chr_id
 * @param {number} req_start
 * @param {number} req_end
 * @returns {Uint8Array}
 */
export function decompress_and_parse_summary(inputs, input_offsets, input_lengths, max_block_size, req_chr_id, req_start, req_end) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(inputs, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(input_offsets, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray32ToWasm0(input_lengths, wasm.__wbindgen_export);
        const len2 = WASM_VECTOR_LEN;
        wasm.decompress_and_parse_summary(retptr, ptr0, len0, ptr1, len1, ptr2, len2, max_block_size, req_chr_id, req_start, req_end);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v4 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v4;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {Uint8Array} input
 * @param {number} output_size
 * @returns {Uint8Array}
 */
export function inflate_raw(input, output_size) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(input, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.inflate_raw(retptr, ptr0, len0, output_size);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {Uint8Array} inputs
 * @param {Uint32Array} input_offsets
 * @param {Uint32Array} input_lengths
 * @param {number} max_block_size
 * @returns {Uint8Array}
 */
export function inflate_raw_batch(inputs, input_offsets, input_lengths, max_block_size) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(inputs, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(input_offsets, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray32ToWasm0(input_lengths, wasm.__wbindgen_export);
        const len2 = WASM_VECTOR_LEN;
        wasm.inflate_raw_batch(retptr, ptr0, len0, ptr1, len1, ptr2, len2, max_block_size);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v4 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v4;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * @param {Uint8Array} input
 * @returns {Uint8Array}
 */
export function inflate_raw_unknown_size(input) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(input, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.inflate_raw_unknown_size(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Parse multiple uncompressed BigBed blocks
 * Returns: [count: u32][starts: i32*n][ends: i32*n][uid_offsets: u32*n][string_offsets: u32*(n+1)][string_data: bytes]
 * @param {Uint8Array} inputs
 * @param {Uint32Array} input_offsets
 * @param {Uint32Array} input_lengths
 * @param {Uint32Array} block_file_offsets
 * @param {number} req_chr_id
 * @param {number} req_start
 * @param {number} req_end
 * @returns {Uint8Array}
 */
export function parse_bigbed_blocks(inputs, input_offsets, input_lengths, block_file_offsets, req_chr_id, req_start, req_end) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(inputs, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(input_offsets, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray32ToWasm0(input_lengths, wasm.__wbindgen_export);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passArray32ToWasm0(block_file_offsets, wasm.__wbindgen_export);
        const len3 = WASM_VECTOR_LEN;
        wasm.parse_bigbed_blocks(retptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, req_chr_id, req_start, req_end);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v5 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v5;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Parse a BigWig data block and return packed typed arrays
 * Block types: 1 = bedGraph, 2 = varstep, 3 = fixedstep
 *
 * Returns packed binary: [count: u32][starts: i32*count][ends: i32*count][scores: f32*count]
 * @param {Uint8Array} data
 * @param {number} req_start
 * @param {number} req_end
 * @returns {Uint8Array}
 */
export function parse_bigwig_block(data, req_start, req_end) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.parse_bigwig_block(retptr, ptr0, len0, req_start, req_end);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Parse multiple uncompressed BigWig blocks
 * Same as decompress_and_parse_bigwig but skips decompression
 * @param {Uint8Array} inputs
 * @param {Uint32Array} input_offsets
 * @param {Uint32Array} input_lengths
 * @param {number} req_start
 * @param {number} req_end
 * @returns {Uint8Array}
 */
export function parse_bigwig_blocks(inputs, input_offsets, input_lengths, req_start, req_end) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(inputs, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(input_offsets, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray32ToWasm0(input_lengths, wasm.__wbindgen_export);
        const len2 = WASM_VECTOR_LEN;
        wasm.parse_bigwig_blocks(retptr, ptr0, len0, ptr1, len1, ptr2, len2, req_start, req_end);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v4 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v4;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Parse a BigWig summary block and return packed typed arrays
 * Summary blocks contain: chromId, start, end, validCnt, minScore, maxScore, sumData, sumSqData
 *
 * Returns: [count: u32][starts: i32*n][ends: i32*n][scores: f32*n][minScores: f32*n][maxScores: f32*n]
 * @param {Uint8Array} data
 * @param {number} req_chr_id
 * @param {number} req_start
 * @param {number} req_end
 * @returns {Uint8Array}
 */
export function parse_summary_block(data, req_chr_id, req_start, req_end) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.parse_summary_block(retptr, ptr0, len0, req_chr_id, req_start, req_end);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Parse multiple uncompressed summary blocks
 * @param {Uint8Array} inputs
 * @param {Uint32Array} input_offsets
 * @param {Uint32Array} input_lengths
 * @param {number} req_chr_id
 * @param {number} req_start
 * @param {number} req_end
 * @returns {Uint8Array}
 */
export function parse_summary_blocks(inputs, input_offsets, input_lengths, req_chr_id, req_start, req_end) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(inputs, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(input_offsets, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray32ToWasm0(input_lengths, wasm.__wbindgen_export);
        const len2 = WASM_VECTOR_LEN;
        wasm.parse_summary_blocks(retptr, ptr0, len0, ptr1, len1, ptr2, len2, req_chr_id, req_start, req_end);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v4 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v4;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}
export function __wbg_Error_8c4e43fe74559d73(arg0, arg1) {
    const ret = Error(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
}
function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getObject(idx) { return heap[idx]; }

let heap = new Array(128).fill(undefined);
heap.push(undefined, null, true, false);

let heap_next = heap.length;

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;


let wasm;
export function __wbg_set_wasm(val) {
    wasm = val;
}
