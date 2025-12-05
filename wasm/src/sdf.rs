//! Signed Distance Field Generation
//!
//! Generates SDF textures from alpha masks for parallax depth effects.
//! Uses Jump Flooding Algorithm (JFA) for O(n log n) performance.
//!
//! # Algorithm
//!
//! 1. Initialize: Mark edge pixels (alpha transitions)
//! 2. Jump Flood: Propagate nearest seed in log(n) passes
//! 3. Distance: Calculate Euclidean distance from seeds
//! 4. Normalize: Map to 0-255 range
//!
//! # Performance
//!
//! Target: < 3ms at 584×584 resolution

use wasm_bindgen::prelude::*;

/// Generate a Signed Distance Field from an alpha mask
///
/// # Arguments
///
/// * `alpha_data` - Alpha channel as u8 array (0-255)
/// * `width` - Image width in pixels
/// * `height` - Image height in pixels
/// * `max_distance` - Maximum distance to compute (affects precision)
///
/// # Returns
///
/// SDF as u8 array where:
/// - 128 = on edge
/// - < 128 = inside (higher = further from edge)
/// - > 128 = outside (higher = further from edge)
#[wasm_bindgen]
pub fn generate_sdf(
    alpha_data: &[u8],
    width: u32,
    height: u32,
    max_distance: f32,
) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    let size = w * h;

    // Initialize seed grid (-1 = no seed, otherwise index of nearest seed)
    let mut seeds: Vec<i32> = vec![-1; size];
    let mut distances: Vec<f32> = vec![f32::MAX; size];

    // Step 1: Find edge pixels and mark as seeds
    for y in 0..h {
        for x in 0..w {
            let idx = y * w + x;
            let alpha = alpha_data[idx];

            // Check if this is an edge pixel (alpha transition)
            let is_edge = is_edge_pixel(alpha_data, w, h, x, y);

            if is_edge {
                seeds[idx] = idx as i32;
                distances[idx] = 0.0;
            }
        }
    }

    // Step 2: Jump Flooding Algorithm
    let mut step = (w.max(h) / 2).max(1);
    while step >= 1 {
        for y in 0..h {
            for x in 0..w {
                let idx = y * w + x;

                // Check 8 neighbors at current step distance
                for dy in [-1i32, 0, 1].iter() {
                    for dx in [-1i32, 0, 1].iter() {
                        if *dx == 0 && *dy == 0 {
                            continue;
                        }

                        let nx = x as i32 + dx * step as i32;
                        let ny = y as i32 + dy * step as i32;

                        if nx >= 0 && nx < w as i32 && ny >= 0 && ny < h as i32 {
                            let nidx = (ny as usize) * w + (nx as usize);

                            if seeds[nidx] >= 0 {
                                let seed_idx = seeds[nidx] as usize;
                                let seed_x = seed_idx % w;
                                let seed_y = seed_idx / w;

                                let dist = euclidean_distance(x, y, seed_x, seed_y);

                                if dist < distances[idx] {
                                    distances[idx] = dist;
                                    seeds[idx] = seeds[nidx];
                                }
                            }
                        }
                    }
                }
            }
        }
        step /= 2;
    }

    // Step 3: Convert to signed distance and normalize
    let mut result = vec![0u8; size];

    for y in 0..h {
        for x in 0..w {
            let idx = y * w + x;
            let alpha = alpha_data[idx];
            let dist = distances[idx].min(max_distance);

            // Signed: negative inside, positive outside
            let signed_dist = if alpha > 127 {
                -dist // Inside
            } else {
                dist // Outside
            };

            // Normalize to 0-255 with 128 as the edge
            let normalized = ((signed_dist / max_distance) * 127.0 + 128.0)
                .clamp(0.0, 255.0) as u8;

            result[idx] = normalized;
        }
    }

    result
}

/// Check if a pixel is on the edge (alpha transition)
fn is_edge_pixel(alpha: &[u8], w: usize, h: usize, x: usize, y: usize) -> bool {
    let idx = y * w + x;
    let current = alpha[idx] > 127;

    // Check 4-connected neighbors
    let neighbors = [
        (x.wrapping_sub(1), y),
        (x + 1, y),
        (x, y.wrapping_sub(1)),
        (x, y + 1),
    ];

    for (nx, ny) in neighbors.iter() {
        if *nx < w && *ny < h {
            let nidx = ny * w + nx;
            let neighbor = alpha[nidx] > 127;
            if current != neighbor {
                return true;
            }
        }
    }

    false
}

/// Euclidean distance between two points
fn euclidean_distance(x1: usize, y1: usize, x2: usize, y2: usize) -> f32 {
    let dx = x1 as f32 - x2 as f32;
    let dy = y1 as f32 - y2 as f32;
    (dx * dx + dy * dy).sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sdf_empty() {
        let alpha = vec![0u8; 16];
        let sdf = generate_sdf(&alpha, 4, 4, 10.0);
        assert_eq!(sdf.len(), 16);
    }

    #[test]
    fn test_sdf_filled() {
        let alpha = vec![255u8; 16];
        let sdf = generate_sdf(&alpha, 4, 4, 10.0);
        assert_eq!(sdf.len(), 16);
        // All pixels should be "inside" (< 128)
        for v in sdf.iter() {
            assert!(*v <= 128);
        }
    }
}
