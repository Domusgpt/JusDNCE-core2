//! Mipmap Generation
//!
//! Fast mipmap pyramid generation for zoom/pan effects.
//! Uses box filter downsampling with gamma-correct blending.
//!
//! # Performance
//!
//! Target: < 2ms for 4 levels at 584×584

use wasm_bindgen::prelude::*;

/// Mipmap level data
#[wasm_bindgen]
pub struct MipmapLevel {
    data: Vec<u8>,
    width: u32,
    height: u32,
}

#[wasm_bindgen]
impl MipmapLevel {
    #[wasm_bindgen(getter)]
    pub fn data(&self) -> Vec<u8> {
        self.data.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn width(&self) -> u32 {
        self.width
    }

    #[wasm_bindgen(getter)]
    pub fn height(&self) -> u32 {
        self.height
    }
}

/// Generate mipmap pyramid from RGBA image data
///
/// # Arguments
///
/// * `image_data` - RGBA pixel data (4 bytes per pixel)
/// * `width` - Image width in pixels
/// * `height` - Image height in pixels
/// * `levels` - Number of mipmap levels to generate
///
/// # Returns
///
/// Array of MipmapLevel, from full resolution down to smallest
#[wasm_bindgen]
pub fn generate_mipmaps(
    image_data: &[u8],
    width: u32,
    height: u32,
    levels: u32,
) -> Vec<MipmapLevel> {
    let mut result = Vec::with_capacity(levels as usize);

    // Level 0 is the original
    result.push(MipmapLevel {
        data: image_data.to_vec(),
        width,
        height,
    });

    let mut current_width = width;
    let mut current_height = height;
    let mut current_data = image_data.to_vec();

    // Generate each subsequent level
    for _ in 1..levels {
        let new_width = (current_width / 2).max(1);
        let new_height = (current_height / 2).max(1);

        let new_data = downsample_2x(
            &current_data,
            current_width as usize,
            current_height as usize,
        );

        result.push(MipmapLevel {
            data: new_data.clone(),
            width: new_width,
            height: new_height,
        });

        current_width = new_width;
        current_height = new_height;
        current_data = new_data;
    }

    result
}

/// Downsample RGBA image by 2x using box filter
fn downsample_2x(data: &[u8], width: usize, height: usize) -> Vec<u8> {
    let new_width = width / 2;
    let new_height = height / 2;
    let mut result = vec![0u8; new_width * new_height * 4];

    for y in 0..new_height {
        for x in 0..new_width {
            // Source coordinates (2x2 block)
            let sx = x * 2;
            let sy = y * 2;

            // Accumulate 2x2 block with gamma correction
            let mut r_sum = 0.0f32;
            let mut g_sum = 0.0f32;
            let mut b_sum = 0.0f32;
            let mut a_sum = 0.0f32;

            for dy in 0..2 {
                for dx in 0..2 {
                    let src_idx = ((sy + dy) * width + (sx + dx)) * 4;

                    if src_idx + 3 < data.len() {
                        // Convert to linear space for proper blending
                        r_sum += srgb_to_linear(data[src_idx]);
                        g_sum += srgb_to_linear(data[src_idx + 1]);
                        b_sum += srgb_to_linear(data[src_idx + 2]);
                        a_sum += data[src_idx + 3] as f32;
                    }
                }
            }

            // Average and convert back to sRGB
            let dst_idx = (y * new_width + x) * 4;
            result[dst_idx] = linear_to_srgb(r_sum / 4.0);
            result[dst_idx + 1] = linear_to_srgb(g_sum / 4.0);
            result[dst_idx + 2] = linear_to_srgb(b_sum / 4.0);
            result[dst_idx + 3] = (a_sum / 4.0).round() as u8;
        }
    }

    result
}

/// Convert sRGB to linear color space
fn srgb_to_linear(value: u8) -> f32 {
    let v = value as f32 / 255.0;
    if v <= 0.04045 {
        v / 12.92
    } else {
        ((v + 0.055) / 1.055).powf(2.4)
    }
}

/// Convert linear to sRGB color space
fn linear_to_srgb(value: f32) -> u8 {
    let v = if value <= 0.0031308 {
        value * 12.92
    } else {
        1.055 * value.powf(1.0 / 2.4) - 0.055
    };
    (v * 255.0).clamp(0.0, 255.0).round() as u8
}

/// Select the appropriate mipmap level for a given output size
#[wasm_bindgen]
pub fn select_mipmap_level(
    output_size: u32,
    source_size: u32,
    mipmap_count: u32,
) -> u32 {
    if output_size >= source_size {
        return 0;
    }

    let ratio = source_size as f32 / output_size as f32;
    let level = ratio.log2().floor() as u32;
    level.min(mipmap_count - 1)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_downsample() {
        // 4x4 red image
        let mut data = vec![0u8; 4 * 4 * 4];
        for i in 0..16 {
            data[i * 4] = 255;     // R
            data[i * 4 + 1] = 0;   // G
            data[i * 4 + 2] = 0;   // B
            data[i * 4 + 3] = 255; // A
        }

        let result = downsample_2x(&data, 4, 4);
        assert_eq!(result.len(), 2 * 2 * 4);

        // Should still be red
        assert_eq!(result[0], 255); // R
        assert_eq!(result[3], 255); // A
    }

    #[test]
    fn test_level_selection() {
        assert_eq!(select_mipmap_level(512, 512, 4), 0);
        assert_eq!(select_mipmap_level(256, 512, 4), 1);
        assert_eq!(select_mipmap_level(128, 512, 4), 2);
        assert_eq!(select_mipmap_level(64, 512, 4), 3);
    }
}
