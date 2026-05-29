/* tslint:disable */
/* eslint-disable */

/**
 * Decompress one or more zlib-compressed BigWig blocks and parse them into
 * packed typed arrays: [count: u32][starts: i32*count][ends: i32*count][scores: f32*count]
 */
export function decompress_and_parse_bigwig(inputs: Uint8Array, input_offsets: Uint32Array, input_lengths: Uint32Array, max_block_size: number, req_start: number, req_end: number): Uint8Array;

/**
 * Combined decompress + parse for summary blocks
 */
export function decompress_and_parse_summary(inputs: Uint8Array, input_offsets: Uint32Array, input_lengths: Uint32Array, max_block_size: number, req_chr_id: number, req_start: number, req_end: number): Uint8Array;

export function inflate_raw(input: Uint8Array, output_size: number): Uint8Array;

export function inflate_raw_batch(inputs: Uint8Array, input_offsets: Uint32Array, input_lengths: Uint32Array, max_block_size: number): Uint8Array;

export function inflate_raw_unknown_size(input: Uint8Array): Uint8Array;
