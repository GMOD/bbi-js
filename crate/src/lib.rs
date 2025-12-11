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

fn decompress_into_buffer(
    input: &[u8],
    decompressor: &mut Decompressor,
    output: &mut [u8],
) -> Result<usize, JsError> {
    decompressor
        .deflate_decompress(input, output)
        .map_err(|e| JsError::new(&format!("decompression failed: {:?}", e)))
}

#[wasm_bindgen]
pub fn inflate_raw_batch(
    inputs: &[u8],
    input_offsets: &[u32],
    input_lengths: &[u32],
    max_output_size: u32,
) -> Result<Box<[u8]>, JsError> {
    let mut decompressor = Decompressor::new();
    let num_blocks = input_offsets.len();
    let max_out = max_output_size as usize;

    let header_size = 4 + (num_blocks + 1) * 4;
    let max_data_size = num_blocks * max_out;
    let mut result = vec![0u8; header_size + max_data_size];

    result[0..4].copy_from_slice(&(num_blocks as u32).to_le_bytes());

    let offsets_start = 4;
    let data_start = header_size;
    let mut data_offset = 0usize;

    for i in 0..num_blocks {
        let start = input_offsets[i] as usize + ZLIB_HEADER_SIZE;
        let len = input_lengths[i] as usize - ZLIB_HEADER_SIZE;
        let input = &inputs[start..start + len];

        let offset_pos = offsets_start + i * 4;
        result[offset_pos..offset_pos + 4].copy_from_slice(&(data_offset as u32).to_le_bytes());

        let out_slice = &mut result[data_start + data_offset..data_start + data_offset + max_out];
        let actual_size = decompress_into_buffer(input, &mut decompressor, out_slice)?;
        data_offset += actual_size;
    }

    let final_offset_pos = offsets_start + num_blocks * 4;
    result[final_offset_pos..final_offset_pos + 4]
        .copy_from_slice(&(data_offset as u32).to_le_bytes());

    result.truncate(header_size + data_offset);

    Ok(result.into_boxed_slice())
}
