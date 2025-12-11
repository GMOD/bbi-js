use libdeflater::Decompressor;
use wasm_bindgen::prelude::*;

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

fn decompress_into_vec(
    input: &[u8],
    decompressor: &mut Decompressor,
    output: &mut Vec<u8>,
) -> Result<usize, JsError> {
    let start_len = output.len();
    let mut size = input.len() * 4;

    loop {
        output.resize(start_len + size, 0);
        let out_slice = &mut output[start_len..];

        match decompressor.deflate_decompress(input, out_slice) {
            Ok(actual_size) => {
                output.truncate(start_len + actual_size);
                return Ok(actual_size);
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
) -> Result<Box<[u8]>, JsError> {
    let mut decompressor = Decompressor::new();
    let num_blocks = input_offsets.len();

    let mut data = Vec::with_capacity(inputs.len() * 4);
    let mut offsets_data: Vec<u8> = Vec::with_capacity((num_blocks + 1) * 4);

    for i in 0..num_blocks {
        let start = input_offsets[i] as usize;
        let len = input_lengths[i] as usize;
        let input = &inputs[start..start + len];

        let offset = data.len() as u32;
        offsets_data.extend_from_slice(&offset.to_le_bytes());

        decompress_into_vec(input, &mut decompressor, &mut data)?;
    }

    let final_offset = data.len() as u32;
    offsets_data.extend_from_slice(&final_offset.to_le_bytes());

    let mut result = Vec::with_capacity(4 + offsets_data.len() + data.len());
    result.extend_from_slice(&(num_blocks as u32).to_le_bytes());
    result.extend_from_slice(&offsets_data);
    result.extend_from_slice(&data);

    Ok(result.into_boxed_slice())
}
