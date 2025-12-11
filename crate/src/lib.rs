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

fn read_f32_le(data: &[u8], offset: usize) -> f32 {
    f32::from_le_bytes([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]])
}

/// Parse a BigWig data block and return packed typed arrays
/// Block types: 1 = bedGraph, 2 = varstep, 3 = fixedstep
///
/// Returns packed binary: [count: u32][starts: i32*count][ends: i32*count][scores: f32*count]
#[wasm_bindgen]
pub fn parse_bigwig_block(data: &[u8], req_start: i32, req_end: i32) -> Box<[u8]> {
    if data.len() < 24 {
        let mut result = vec![0u8; 4];
        result[0..4].copy_from_slice(&0u32.to_le_bytes());
        return result.into_boxed_slice();
    }

    let block_start = read_i32_le(data, 4);
    let item_step = read_u32_le(data, 12) as i32;
    let item_span = read_u32_le(data, 16) as i32;
    let block_type = data[20];
    let item_count = read_u16_le(data, 22) as usize;

    let filter = req_start != 0 || req_end != 0;

    // First pass: count items that pass filter to allocate exact size
    let mut count = 0usize;
    let mut offset = 24usize;

    match block_type {
        1 => {
            for _ in 0..item_count {
                let start = read_i32_le(data, offset);
                let end = read_i32_le(data, offset + 4);
                offset += 12;
                if !filter || (start < req_end && end > req_start) {
                    count += 1;
                }
            }
        }
        2 => {
            for _ in 0..item_count {
                let start = read_i32_le(data, offset);
                offset += 8;
                let end = start + item_span;
                if !filter || (start < req_end && end > req_start) {
                    count += 1;
                }
            }
        }
        3 => {
            for i in 0..item_count {
                let start = block_start + (i as i32) * item_step;
                let end = start + item_span;
                if !filter || (start < req_end && end > req_start) {
                    count += 1;
                }
            }
        }
        _ => {}
    }

    // Allocate exact size: 4 bytes count + 12 bytes per feature (start + end + score)
    let result_size = 4 + count * 12;
    let mut result = vec![0u8; result_size];

    result[0..4].copy_from_slice(&(count as u32).to_le_bytes());

    // Calculate offsets for each array in result buffer
    let starts_offset = 4;
    let ends_offset = 4 + count * 4;
    let scores_offset = 4 + count * 8;

    // Second pass: write directly to result buffer
    let mut write_idx = 0usize;
    offset = 24;

    match block_type {
        1 => {
            for _ in 0..item_count {
                let start = read_i32_le(data, offset);
                let end = read_i32_le(data, offset + 4);
                let score = read_f32_le(data, offset + 8);
                offset += 12;
                if !filter || (start < req_end && end > req_start) {
                    let s_pos = starts_offset + write_idx * 4;
                    let e_pos = ends_offset + write_idx * 4;
                    let sc_pos = scores_offset + write_idx * 4;
                    result[s_pos..s_pos + 4].copy_from_slice(&start.to_le_bytes());
                    result[e_pos..e_pos + 4].copy_from_slice(&end.to_le_bytes());
                    result[sc_pos..sc_pos + 4].copy_from_slice(&score.to_le_bytes());
                    write_idx += 1;
                }
            }
        }
        2 => {
            for _ in 0..item_count {
                let start = read_i32_le(data, offset);
                let score = read_f32_le(data, offset + 4);
                offset += 8;
                let end = start + item_span;
                if !filter || (start < req_end && end > req_start) {
                    let s_pos = starts_offset + write_idx * 4;
                    let e_pos = ends_offset + write_idx * 4;
                    let sc_pos = scores_offset + write_idx * 4;
                    result[s_pos..s_pos + 4].copy_from_slice(&start.to_le_bytes());
                    result[e_pos..e_pos + 4].copy_from_slice(&end.to_le_bytes());
                    result[sc_pos..sc_pos + 4].copy_from_slice(&score.to_le_bytes());
                    write_idx += 1;
                }
            }
        }
        3 => {
            for i in 0..item_count {
                let score = read_f32_le(data, offset);
                offset += 4;
                let start = block_start + (i as i32) * item_step;
                let end = start + item_span;
                if !filter || (start < req_end && end > req_start) {
                    let s_pos = starts_offset + write_idx * 4;
                    let e_pos = ends_offset + write_idx * 4;
                    let sc_pos = scores_offset + write_idx * 4;
                    result[s_pos..s_pos + 4].copy_from_slice(&start.to_le_bytes());
                    result[e_pos..e_pos + 4].copy_from_slice(&end.to_le_bytes());
                    result[sc_pos..sc_pos + 4].copy_from_slice(&score.to_le_bytes());
                    write_idx += 1;
                }
            }
        }
        _ => {}
    }

    result.into_boxed_slice()
}

/// Parse a BigWig summary block and return packed typed arrays
/// Summary blocks contain: chromId, start, end, validCnt, minScore, maxScore, sumData, sumSqData
///
/// Returns: [count: u32][starts: i32*n][ends: i32*n][scores: f32*n][minScores: f32*n][maxScores: f32*n]
#[wasm_bindgen]
pub fn parse_summary_block(data: &[u8], req_chr_id: u32, req_start: i32, req_end: i32) -> Box<[u8]> {
    let record_size = 32usize;
    let num_records = data.len() / record_size;
    let filter = req_start != 0 || req_end != 0;

    // First pass: count records that pass filter
    let mut count = 0usize;
    for i in 0..num_records {
        let offset = i * record_size;
        let chrom_id = read_u32_le(data, offset);
        let start = read_u32_le(data, offset + 4) as i32;
        let end = read_u32_le(data, offset + 8) as i32;
        if !filter || (chrom_id == req_chr_id && start < req_end && end > req_start) {
            count += 1;
        }
    }

    // Allocate exact size: 4 bytes count + 20 bytes per feature (5 arrays * 4 bytes)
    let result_size = 4 + count * 20;
    let mut result = vec![0u8; result_size];

    result[0..4].copy_from_slice(&(count as u32).to_le_bytes());

    // Calculate offsets for each array in result buffer
    let starts_offset = 4;
    let ends_offset = 4 + count * 4;
    let scores_offset = 4 + count * 8;
    let min_scores_offset = 4 + count * 12;
    let max_scores_offset = 4 + count * 16;

    // Second pass: write directly to result buffer
    let mut write_idx = 0usize;
    for i in 0..num_records {
        let offset = i * record_size;
        let chrom_id = read_u32_le(data, offset);
        let start = read_u32_le(data, offset + 4) as i32;
        let end = read_u32_le(data, offset + 8) as i32;
        let valid_cnt = read_u32_le(data, offset + 12);
        let min_score = read_f32_le(data, offset + 16);
        let max_score = read_f32_le(data, offset + 20);
        let sum_data = read_f32_le(data, offset + 24);

        if !filter || (chrom_id == req_chr_id && start < req_end && end > req_start) {
            let score = if valid_cnt > 0 { sum_data / valid_cnt as f32 } else { sum_data };

            let s_pos = starts_offset + write_idx * 4;
            let e_pos = ends_offset + write_idx * 4;
            let sc_pos = scores_offset + write_idx * 4;
            let min_pos = min_scores_offset + write_idx * 4;
            let max_pos = max_scores_offset + write_idx * 4;

            result[s_pos..s_pos + 4].copy_from_slice(&start.to_le_bytes());
            result[e_pos..e_pos + 4].copy_from_slice(&end.to_le_bytes());
            result[sc_pos..sc_pos + 4].copy_from_slice(&score.to_le_bytes());
            result[min_pos..min_pos + 4].copy_from_slice(&min_score.to_le_bytes());
            result[max_pos..max_pos + 4].copy_from_slice(&max_score.to_le_bytes());
            write_idx += 1;
        }
    }

    result.into_boxed_slice()
}

/// Combined decompress + parse for BigWig blocks
/// Returns same format as parse_bigwig_block but handles multiple compressed blocks
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

    let count = starts.len();
    let result_size = 4 + count * 12;
    let mut result = vec![0u8; result_size];

    result[0..4].copy_from_slice(&(count as u32).to_le_bytes());

    // Write arrays directly using byte slices for better performance
    let starts_offset = 4;
    let ends_offset = 4 + count * 4;
    let scores_offset = 4 + count * 8;

    for (i, &s) in starts.iter().enumerate() {
        let pos = starts_offset + i * 4;
        result[pos..pos + 4].copy_from_slice(&s.to_le_bytes());
    }
    for (i, &e) in ends.iter().enumerate() {
        let pos = ends_offset + i * 4;
        result[pos..pos + 4].copy_from_slice(&e.to_le_bytes());
    }
    for (i, &sc) in scores.iter().enumerate() {
        let pos = scores_offset + i * 4;
        result[pos..pos + 4].copy_from_slice(&sc.to_le_bytes());
    }

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

    let mut offset = 24usize;
    let filter = req_start != 0 || req_end != 0;

    match block_type {
        1 => {
            for _ in 0..item_count {
                let start = read_i32_le(data, offset);
                offset += 4;
                let end = read_i32_le(data, offset);
                offset += 4;
                let score = read_f32_le(data, offset);
                offset += 4;

                if !filter || (start < req_end && end > req_start) {
                    starts.push(start);
                    ends.push(end);
                    scores.push(score);
                }
            }
        }
        2 => {
            for _ in 0..item_count {
                let start = read_i32_le(data, offset);
                offset += 4;
                let score = read_f32_le(data, offset);
                offset += 4;
                let end = start + item_span;

                if !filter || (start < req_end && end > req_start) {
                    starts.push(start);
                    ends.push(end);
                    scores.push(score);
                }
            }
        }
        3 => {
            for i in 0..item_count {
                let score = read_f32_le(data, offset);
                offset += 4;
                let start = block_start + (i as i32) * item_step;
                let end = start + item_span;

                if !filter || (start < req_end && end > req_start) {
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
        let record_size = 32usize;
        let num_records = data.len() / record_size;

        let mut offset = 0usize;
        for _ in 0..num_records {
            let chrom_id = read_u32_le(data, offset);
            offset += 4;
            let feat_start = read_u32_le(data, offset) as i32;
            offset += 4;
            let feat_end = read_u32_le(data, offset) as i32;
            offset += 4;
            let valid_cnt = read_u32_le(data, offset);
            offset += 4;
            let min_score = read_f32_le(data, offset);
            offset += 4;
            let max_score = read_f32_le(data, offset);
            offset += 4;
            let sum_data = read_f32_le(data, offset);
            offset += 8;

            let passes = !filter || (chrom_id == req_chr_id && feat_start < req_end && feat_end > req_start);
            if passes {
                starts.push(feat_start);
                ends.push(feat_end);
                let score = if valid_cnt > 0 { sum_data / valid_cnt as f32 } else { sum_data };
                scores.push(score);
                min_scores.push(min_score);
                max_scores.push(max_score);
            }
        }
    }

    let count = starts.len();
    let result_size = 4 + count * 20;
    let mut result = vec![0u8; result_size];

    result[0..4].copy_from_slice(&(count as u32).to_le_bytes());

    let starts_offset = 4;
    let ends_offset = 4 + count * 4;
    let scores_offset = 4 + count * 8;
    let min_scores_offset = 4 + count * 12;
    let max_scores_offset = 4 + count * 16;

    for (i, &s) in starts.iter().enumerate() {
        let pos = starts_offset + i * 4;
        result[pos..pos + 4].copy_from_slice(&s.to_le_bytes());
    }
    for (i, &e) in ends.iter().enumerate() {
        let pos = ends_offset + i * 4;
        result[pos..pos + 4].copy_from_slice(&e.to_le_bytes());
    }
    for (i, &sc) in scores.iter().enumerate() {
        let pos = scores_offset + i * 4;
        result[pos..pos + 4].copy_from_slice(&sc.to_le_bytes());
    }
    for (i, &m) in min_scores.iter().enumerate() {
        let pos = min_scores_offset + i * 4;
        result[pos..pos + 4].copy_from_slice(&m.to_le_bytes());
    }
    for (i, &m) in max_scores.iter().enumerate() {
        let pos = max_scores_offset + i * 4;
        result[pos..pos + 4].copy_from_slice(&m.to_le_bytes());
    }

    Ok(result.into_boxed_slice())
}
