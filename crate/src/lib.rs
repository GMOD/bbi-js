use libdeflater::Decompressor;
use wasm_bindgen::prelude::*;

const ZLIB_HEADER_SIZE: usize = 2;

#[wasm_bindgen]
pub fn inflate_raw(input: &[u8], output_size: usize) -> Result<Vec<u8>, JsError> {
    let mut decompressor = Decompressor::new();
    let mut output = vec![0u8; output_size];
    decompressor
        .deflate_decompress(input, &mut output)
        .map_err(|e| JsError::new(&format!("decompression failed: {:?}", e)))?;
    Ok(output)
}

#[wasm_bindgen]
pub fn inflate_raw_unknown_size(input: &[u8]) -> Result<Vec<u8>, JsError> {
    let mut decompressor = Decompressor::new();
    let mut size = input.len() * 4;

    loop {
        let mut output = vec![0u8; size];
        match decompressor.deflate_decompress(input, &mut output) {
            Ok(actual_size) => {
                output.truncate(actual_size);
                return Ok(output);
            }
            Err(libdeflater::DecompressionError::InsufficientSpace) => {
                size *= 2;
                if size > 256 * 1024 * 1024 {
                    return Err(JsError::new("decompression output too large"));
                }
            }
            Err(e) => {
                return Err(JsError::new(&format!("decompression failed: {:?}", e)));
            }
        }
    }
}

#[wasm_bindgen]
pub fn inflate_raw_batch(
    inputs: &[u8],
    input_offsets: &[u32],
    input_lengths: &[u32],
    max_block_size: u32,
) -> Result<Box<[u8]>, JsError> {
    let mut decompressor = Decompressor::new();
    let num_blocks = input_offsets.len();
    let max_out = max_block_size as usize;

    let header_size = 4 + (num_blocks + 1) * 4;

    let mut total_input_size = 0usize;
    for i in 0..num_blocks {
        total_input_size += input_lengths[i] as usize;
    }
    let estimated_output = total_input_size * 4;

    let mut result = Vec::with_capacity(header_size + estimated_output);
    result.resize(header_size, 0);

    result[0..4].copy_from_slice(&(num_blocks as u32).to_le_bytes());

    let offsets_start = 4;
    let mut data_offset = 0u32;

    let mut temp_buf = vec![0u8; max_out];

    for i in 0..num_blocks {
        let start = input_offsets[i] as usize + ZLIB_HEADER_SIZE;
        let len = input_lengths[i] as usize - ZLIB_HEADER_SIZE;
        let input = &inputs[start..start + len];

        let offset_pos = offsets_start + i * 4;
        result[offset_pos..offset_pos + 4].copy_from_slice(&data_offset.to_le_bytes());

        let actual_size = decompressor
            .deflate_decompress(input, &mut temp_buf)
            .map_err(|e| JsError::new(&format!("decompression failed: {:?}", e)))?;

        result.extend_from_slice(&temp_buf[..actual_size]);
        data_offset += actual_size as u32;
    }

    let final_offset_pos = offsets_start + num_blocks * 4;
    result[final_offset_pos..final_offset_pos + 4].copy_from_slice(&data_offset.to_le_bytes());

    Ok(result.into_boxed_slice())
}
