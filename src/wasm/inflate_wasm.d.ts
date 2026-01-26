/* tslint:disable */
/* eslint-disable */

/**
 * Combined decompress + parse for BigBed blocks
 * Returns: [count: u32][starts: i32*n][ends: i32*n][uid_offsets: u32*n][string_offsets: u32*(n+1)][string_data: bytes]
 */
export function decompress_and_parse_bigbed(inputs: Uint8Array, input_offsets: Uint32Array, input_lengths: Uint32Array, block_file_offsets: Uint32Array, max_block_size: number, req_chr_id: number, req_start: number, req_end: number): Uint8Array;

/**
 * Combined decompress + parse for BigWig blocks
 * Returns same format as parse_bigwig_block but handles multiple compressed blocks
 */
export function decompress_and_parse_bigwig(inputs: Uint8Array, input_offsets: Uint32Array, input_lengths: Uint32Array, max_block_size: number, req_start: number, req_end: number): Uint8Array;

/**
 * Combined decompress + parse for summary blocks
 */
export function decompress_and_parse_summary(inputs: Uint8Array, input_offsets: Uint32Array, input_lengths: Uint32Array, max_block_size: number, req_chr_id: number, req_start: number, req_end: number): Uint8Array;

export function inflate_raw(input: Uint8Array, output_size: number): Uint8Array;

export function inflate_raw_batch(inputs: Uint8Array, input_offsets: Uint32Array, input_lengths: Uint32Array, max_block_size: number): Uint8Array;

export function inflate_raw_unknown_size(input: Uint8Array): Uint8Array;

/**
 * Parse multiple uncompressed BigBed blocks
 * Returns: [count: u32][starts: i32*n][ends: i32*n][uid_offsets: u32*n][string_offsets: u32*(n+1)][string_data: bytes]
 */
export function parse_bigbed_blocks(inputs: Uint8Array, input_offsets: Uint32Array, input_lengths: Uint32Array, block_file_offsets: Uint32Array, req_chr_id: number, req_start: number, req_end: number): Uint8Array;

/**
 * Parse a BigWig data block and return packed typed arrays
 * Block types: 1 = bedGraph, 2 = varstep, 3 = fixedstep
 *
 * Returns packed binary: [count: u32][starts: i32*count][ends: i32*count][scores: f32*count]
 */
export function parse_bigwig_block(data: Uint8Array, req_start: number, req_end: number): Uint8Array;

/**
 * Parse multiple uncompressed BigWig blocks
 * Same as decompress_and_parse_bigwig but skips decompression
 */
export function parse_bigwig_blocks(inputs: Uint8Array, input_offsets: Uint32Array, input_lengths: Uint32Array, req_start: number, req_end: number): Uint8Array;

/**
 * Parse a BigWig summary block and return packed typed arrays
 * Summary blocks contain: chromId, start, end, validCnt, minScore, maxScore, sumData, sumSqData
 *
 * Returns: [count: u32][starts: i32*n][ends: i32*n][scores: f32*n][minScores: f32*n][maxScores: f32*n]
 */
export function parse_summary_block(data: Uint8Array, req_chr_id: number, req_start: number, req_end: number): Uint8Array;

/**
 * Parse multiple uncompressed summary blocks
 */
export function parse_summary_blocks(inputs: Uint8Array, input_offsets: Uint32Array, input_lengths: Uint32Array, req_chr_id: number, req_start: number, req_end: number): Uint8Array;
