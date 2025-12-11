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
