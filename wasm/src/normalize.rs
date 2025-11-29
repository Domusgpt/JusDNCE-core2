//! Matte Normalization
//!
//! Utilities for normalizing alpha mattes and centering sprites.
//! Ensures consistent edge quality and positioning across frames.
//!
//! # Performance
//!
//! Target: < 1ms at 584×584

use wasm_bindgen::prelude::*;

/// Result of centroid calculation
#[wasm_bindgen]
pub struct Centroid {
    pub x: f32,
    pub y: f32,
    pub area: u32,
    pub bounds_x: u32,
    pub bounds_y: u32,
    pub bounds_width: u32,
    pub bounds_height: u32,
}

/// Calculate centroid and bounding box from alpha mask
///
/// # Arguments
///
/// * `alpha_data` - Alpha channel as u8 array
/// * `width` - Image width
/// * `height` - Image height
/// * `threshold` - Alpha threshold (0-255) for considering a pixel "opaque"
///
/// # Returns
///
/// Centroid with position, area, and bounding box
#[wasm_bindgen]
pub fn calculate_centroid(
    alpha_data: &[u8],
    width: u32,
    height: u32,
    threshold: u8,
) -> Centroid {
    let w = width as usize;
    let h = height as usize;

    let mut sum_x = 0.0f64;
    let mut sum_y = 0.0f64;
    let mut count = 0u32;

    let mut min_x = w;
    let mut max_x = 0usize;
    let mut min_y = h;
    let mut max_y = 0usize;

    for y in 0..h {
        for x in 0..w {
            let idx = y * w + x;
            if alpha_data[idx] >= threshold {
                sum_x += x as f64;
                sum_y += y as f64;
                count += 1;

                min_x = min_x.min(x);
                max_x = max_x.max(x);
                min_y = min_y.min(y);
                max_y = max_y.max(y);
            }
        }
    }

    if count == 0 {
        return Centroid {
            x: (width / 2) as f32,
            y: (height / 2) as f32,
            area: 0,
            bounds_x: 0,
            bounds_y: 0,
            bounds_width: width,
            bounds_height: height,
        };
    }

    Centroid {
        x: (sum_x / count as f64) as f32,
        y: (sum_y / count as f64) as f32,
        area: count,
        bounds_x: min_x as u32,
        bounds_y: min_y as u32,
        bounds_width: (max_x - min_x + 1) as u32,
        bounds_height: (max_y - min_y + 1) as u32,
    }
}

/// Normalize alpha matte edges
///
/// Smooths jagged alpha edges and removes noise/fringing.
///
/// # Arguments
///
/// * `image_data` - RGBA pixel data (modified in place)
/// * `width` - Image width
/// * `height` - Image height
/// * `edge_softness` - Amount of edge softening (0.0 = none, 1.0 = maximum)
///
/// # Returns
///
/// Centroid of the normalized matte
#[wasm_bindgen]
pub fn normalize_matte(
    image_data: &mut [u8],
    width: u32,
    height: u32,
    edge_softness: f32,
) -> Centroid {
    let w = width as usize;
    let h = height as usize;

    // Extract alpha channel
    let mut alpha: Vec<u8> = vec![0; w * h];
    for i in 0..(w * h) {
        alpha[i] = image_data[i * 4 + 3];
    }

    // Apply edge smoothing if requested
    if edge_softness > 0.0 {
        let smoothed = smooth_alpha(&alpha, w, h, edge_softness);

        // Write back smoothed alpha
        for i in 0..(w * h) {
            image_data[i * 4 + 3] = smoothed[i];
        }

        // Also premultiply RGB by alpha for proper compositing
        for i in 0..(w * h) {
            let a = smoothed[i] as f32 / 255.0;
            image_data[i * 4] = (image_data[i * 4] as f32 * a) as u8;
            image_data[i * 4 + 1] = (image_data[i * 4 + 1] as f32 * a) as u8;
            image_data[i * 4 + 2] = (image_data[i * 4 + 2] as f32 * a) as u8;
        }
    }

    // Calculate and return centroid
    let final_alpha: Vec<u8> = (0..(w * h))
        .map(|i| image_data[i * 4 + 3])
        .collect();

    calculate_centroid(&final_alpha, width, height, 128)
}

/// Smooth alpha channel using separable box blur
fn smooth_alpha(alpha: &[u8], w: usize, h: usize, strength: f32) -> Vec<u8> {
    let radius = (strength * 2.0).ceil() as usize;
    if radius == 0 {
        return alpha.to_vec();
    }

    // Horizontal pass
    let mut temp = vec![0u8; w * h];
    for y in 0..h {
        for x in 0..w {
            let mut sum = 0u32;
            let mut count = 0u32;

            for dx in 0..=radius * 2 {
                let sx = (x + dx).saturating_sub(radius);
                if sx < w {
                    sum += alpha[y * w + sx] as u32;
                    count += 1;
                }
            }

            temp[y * w + x] = (sum / count.max(1)) as u8;
        }
    }

    // Vertical pass
    let mut result = vec![0u8; w * h];
    for y in 0..h {
        for x in 0..w {
            let mut sum = 0u32;
            let mut count = 0u32;

            for dy in 0..=radius * 2 {
                let sy = (y + dy).saturating_sub(radius);
                if sy < h {
                    sum += temp[sy * w + x] as u32;
                    count += 1;
                }
            }

            result[y * w + x] = (sum / count.max(1)) as u8;
        }
    }

    // Blend with original based on strength
    for i in 0..(w * h) {
        let blended = alpha[i] as f32 * (1.0 - strength) + result[i] as f32 * strength;
        result[i] = blended.round() as u8;
    }

    result
}

/// Dilate alpha mask (expand edges)
#[wasm_bindgen]
pub fn dilate_alpha(
    alpha_data: &[u8],
    width: u32,
    height: u32,
    radius: u32,
) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    let r = radius as i32;

    let mut result = vec![0u8; w * h];

    for y in 0..h {
        for x in 0..w {
            let mut max_val = 0u8;

            for dy in -r..=r {
                for dx in -r..=r {
                    // Circular kernel
                    if dx * dx + dy * dy > r * r {
                        continue;
                    }

                    let sx = x as i32 + dx;
                    let sy = y as i32 + dy;

                    if sx >= 0 && sx < w as i32 && sy >= 0 && sy < h as i32 {
                        let idx = (sy as usize) * w + (sx as usize);
                        max_val = max_val.max(alpha_data[idx]);
                    }
                }
            }

            result[y * w + x] = max_val;
        }
    }

    result
}

/// Erode alpha mask (shrink edges)
#[wasm_bindgen]
pub fn erode_alpha(
    alpha_data: &[u8],
    width: u32,
    height: u32,
    radius: u32,
) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    let r = radius as i32;

    let mut result = vec![255u8; w * h];

    for y in 0..h {
        for x in 0..w {
            let mut min_val = 255u8;

            for dy in -r..=r {
                for dx in -r..=r {
                    // Circular kernel
                    if dx * dx + dy * dy > r * r {
                        continue;
                    }

                    let sx = x as i32 + dx;
                    let sy = y as i32 + dy;

                    if sx >= 0 && sx < w as i32 && sy >= 0 && sy < h as i32 {
                        let idx = (sy as usize) * w + (sx as usize);
                        min_val = min_val.min(alpha_data[idx]);
                    }
                }
            }

            result[y * w + x] = min_val;
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_centroid_empty() {
        let alpha = vec![0u8; 16];
        let c = calculate_centroid(&alpha, 4, 4, 128);
        assert_eq!(c.area, 0);
        assert_eq!(c.x, 2.0);
        assert_eq!(c.y, 2.0);
    }

    #[test]
    fn test_centroid_filled() {
        let alpha = vec![255u8; 16];
        let c = calculate_centroid(&alpha, 4, 4, 128);
        assert_eq!(c.area, 16);
        assert_eq!(c.x, 1.5);
        assert_eq!(c.y, 1.5);
    }

    #[test]
    fn test_dilate() {
        let mut alpha = vec![0u8; 9];
        alpha[4] = 255; // Center pixel

        let result = dilate_alpha(&alpha, 3, 3, 1);

        // Center and 4 neighbors should be 255
        assert_eq!(result[4], 255); // Center
        assert_eq!(result[1], 255); // Top
        assert_eq!(result[3], 255); // Left
        assert_eq!(result[5], 255); // Right
        assert_eq!(result[7], 255); // Bottom
    }
}
