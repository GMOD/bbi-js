 

export function inflate_raw(input: Uint8Array, output_size: number): Uint8Array;

export function inflate_raw_batch(inputs: Uint8Array, input_offsets: Uint32Array, input_lengths: Uint32Array, max_block_size: number): Uint8Array;

export function inflate_raw_unknown_size(input: Uint8Array): Uint8Array;
