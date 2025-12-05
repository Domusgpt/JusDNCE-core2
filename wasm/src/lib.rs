//! Virtual Frame WASM Modules
//!
//! High-performance image processing for the Virtual Frame animation system.
//! These modules handle computationally intensive operations that would be
//! too slow in JavaScript.
//!
//! # Modules
//!
//! - `sdf`: Signed Distance Field generation for parallax effects
//! - `mipmap`: Fast mipmap pyramid generation for zoom/pan
//! - `normalize`: Alpha matte normalization and centering
//!
//! # Usage
//!
//! ```javascript
//! import init, { generate_sdf, generate_mipmaps } from './pkg';
//!
//! await init();
//! const sdf = generate_sdf(alphaData, 584, 584, 32.0);
//! ```

use wasm_bindgen::prelude::*;

pub mod sdf;
pub mod mipmap;
pub mod normalize;

// Re-export main functions
pub use sdf::generate_sdf;
pub use mipmap::generate_mipmaps;
pub use normalize::{normalize_matte, Centroid};

/// Initialize the WASM module
/// Called automatically by wasm-bindgen
#[wasm_bindgen(start)]
pub fn init() {
    // Set up panic hook for better error messages in console
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Get version string for debugging
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Health check - returns true if WASM is working
#[wasm_bindgen]
pub fn health_check() -> bool {
    true
}
