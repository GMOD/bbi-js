use bytemuck;
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

// BigWig block parsing functions

fn read_i32_le(data: &[u8], offset: usize) -> i32 {
    i32::from_le_bytes([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]])
}

fn read_u32_le(data: &[u8], offset: usize) -> u32 {
    u32::from_le_bytes([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]])
}

fn read_u16_le(data: &[u8], offset: usize) -> u16 {
    u16::from_le_bytes([data[offset], data[offset + 1]])
}

/// Decompress one or more zlib-compressed BigWig blocks and parse them into
/// packed typed arrays: [count: u32][starts: i32*count][ends: i32*count][scores: f32*count]
#[wasm_bindgen]
pub fn decompress_and_parse_bigwig(
    inputs: &[u8],
    input_offsets: &[u32],
    input_lengths: &[u32],
    max_block_size: u32,
    req_start: i32,
    req_end: i32,
) -> Result<Box<[u8]>, JsError> {
    let mut decompressor = Decompressor::new();
    let num_blocks = input_offsets.len();
    let max_out = max_block_size as usize;

    let mut temp_buf = vec![0u8; max_out];

    // Estimate output: assume ~1000 features per block average
    let estimated_features = num_blocks * 1000;
    let mut starts: Vec<i32> = Vec::with_capacity(estimated_features);
    let mut ends: Vec<i32> = Vec::with_capacity(estimated_features);
    let mut scores: Vec<f32> = Vec::with_capacity(estimated_features);

    for i in 0..num_blocks {
        let start = input_offsets[i] as usize + ZLIB_HEADER_SIZE;
        let len = input_lengths[i] as usize - ZLIB_HEADER_SIZE;
        let input = &inputs[start..start + len];

        let actual_size = decompressor
            .deflate_decompress(input, &mut temp_buf)
            .map_err(|e| JsError::new(&format!("decompression failed: {:?}", e)))?;

        let data = &temp_buf[..actual_size];
        parse_bigwig_block_into(data, req_start, req_end, &mut starts, &mut ends, &mut scores);
    }

    let count = starts.len() as u32;
    let result_size = 4 + count as usize * 12;
    let mut result = Vec::with_capacity(result_size);

    result.extend_from_slice(&count.to_le_bytes());
    result.extend_from_slice(bytemuck::cast_slice(&starts));
    result.extend_from_slice(bytemuck::cast_slice(&ends));
    result.extend_from_slice(bytemuck::cast_slice(&scores));

    Ok(result.into_boxed_slice())
}

fn parse_bigwig_block_into(
    data: &[u8],
    req_start: i32,
    req_end: i32,
    starts: &mut Vec<i32>,
    ends: &mut Vec<i32>,
    scores: &mut Vec<f32>,
) {
    if data.len() < 24 {
        return;
    }

    let block_start = read_i32_le(data, 4);
    let item_step = read_u32_le(data, 12) as i32;
    let item_span = read_u32_le(data, 16) as i32;
    let block_type = data[20];
    let item_count = read_u16_le(data, 22) as usize;

    let body = &data[24..];
    let filter = req_start != 0 || req_end != 0;

    match block_type {
        1 => {
            // bedGraph: start(i32), end(i32), score(f32) per item — 12 bytes
            for rec in body.chunks_exact(12).take(item_count) {
                let start = i32::from_le_bytes(rec[0..4].try_into().unwrap());
                let end = i32::from_le_bytes(rec[4..8].try_into().unwrap());
                if !filter || (start < req_end && end > req_start) {
                    let score = f32::from_le_bytes(rec[8..12].try_into().unwrap());
                    starts.push(start);
                    ends.push(end);
                    scores.push(score);
                }
            }
        }
        2 => {
            // varstep: start(i32), score(f32) per item — 8 bytes; end = start + span
            for rec in body.chunks_exact(8).take(item_count) {
                let start = i32::from_le_bytes(rec[0..4].try_into().unwrap());
                let end = start + item_span;
                if !filter || (start < req_end && end > req_start) {
                    let score = f32::from_le_bytes(rec[4..8].try_into().unwrap());
                    starts.push(start);
                    ends.push(end);
                    scores.push(score);
                }
            }
        }
        3 => {
            // fixedstep: score(f32) per item — 4 bytes; start/end derived from index
            for (i, rec) in body.chunks_exact(4).take(item_count).enumerate() {
                let start = block_start + (i as i32) * item_step;
                let end = start + item_span;
                if !filter || (start < req_end && end > req_start) {
                    let score = f32::from_le_bytes(rec[0..4].try_into().unwrap());
                    starts.push(start);
                    ends.push(end);
                    scores.push(score);
                }
            }
        }
        _ => {}
    }
}

/// Combined decompress + parse for summary blocks
#[wasm_bindgen]
pub fn decompress_and_parse_summary(
    inputs: &[u8],
    input_offsets: &[u32],
    input_lengths: &[u32],
    max_block_size: u32,
    req_chr_id: u32,
    req_start: i32,
    req_end: i32,
) -> Result<Box<[u8]>, JsError> {
    let mut decompressor = Decompressor::new();
    let num_blocks = input_offsets.len();
    let max_out = max_block_size as usize;

    let mut temp_buf = vec![0u8; max_out];

    let estimated_features = num_blocks * 100;
    let mut starts: Vec<i32> = Vec::with_capacity(estimated_features);
    let mut ends: Vec<i32> = Vec::with_capacity(estimated_features);
    let mut scores: Vec<f32> = Vec::with_capacity(estimated_features);
    let mut min_scores: Vec<f32> = Vec::with_capacity(estimated_features);
    let mut max_scores: Vec<f32> = Vec::with_capacity(estimated_features);

    let filter = req_start != 0 || req_end != 0;

    for i in 0..num_blocks {
        let start = input_offsets[i] as usize + ZLIB_HEADER_SIZE;
        let len = input_lengths[i] as usize - ZLIB_HEADER_SIZE;
        let input = &inputs[start..start + len];

        let actual_size = decompressor
            .deflate_decompress(input, &mut temp_buf)
            .map_err(|e| JsError::new(&format!("decompression failed: {:?}", e)))?;

        let data = &temp_buf[..actual_size];
        // summary record: chromId, start, end, validCnt (u32), min, max, sum, sumSq (f32) — 32 bytes
        for rec in data.chunks_exact(32) {
            let chrom_id = u32::from_le_bytes(rec[0..4].try_into().unwrap());
            let feat_start = u32::from_le_bytes(rec[4..8].try_into().unwrap()) as i32;
            let feat_end = u32::from_le_bytes(rec[8..12].try_into().unwrap()) as i32;
            let passes = !filter || (chrom_id == req_chr_id && feat_start < req_end && feat_end > req_start);
            if passes {
                let valid_cnt = u32::from_le_bytes(rec[12..16].try_into().unwrap());
                let min_score = f32::from_le_bytes(rec[16..20].try_into().unwrap());
                let max_score = f32::from_le_bytes(rec[20..24].try_into().unwrap());
                let sum_data = f32::from_le_bytes(rec[24..28].try_into().unwrap());
                starts.push(feat_start);
                ends.push(feat_end);
                let score = if valid_cnt > 0 { sum_data / valid_cnt as f32 } else { sum_data };
                scores.push(score);
                min_scores.push(min_score);
                max_scores.push(max_score);
            }
        }
    }

    let count = starts.len() as u32;
    let result_size = 4 + count as usize * 20;
    let mut result = Vec::with_capacity(result_size);

    result.extend_from_slice(&count.to_le_bytes());
    result.extend_from_slice(bytemuck::cast_slice(&starts));
    result.extend_from_slice(bytemuck::cast_slice(&ends));
    result.extend_from_slice(bytemuck::cast_slice(&scores));
    result.extend_from_slice(bytemuck::cast_slice(&min_scores));
    result.extend_from_slice(bytemuck::cast_slice(&max_scores));

    Ok(result.into_boxed_slice())
}
