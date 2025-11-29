# WASM Modules for Virtual Frame System

This directory contains WebAssembly modules for high-performance image processing operations that are too slow for JavaScript.

## Architecture

```
wasm/
├── src/
│   ├── lib.rs          # Rust entry point
│   ├── sdf.rs          # Signed Distance Field generation
│   ├── mipmap.rs       # Fast mipmap generation
│   └── normalize.rs    # Matte normalization utilities
├── pkg/                # Built WASM + JS bindings (generated)
├── Cargo.toml          # Rust dependencies
└── README.md           # This file
```

## Planned Modules

### 1. SDF Generator (`sdf.rs`)
Generates Signed Distance Fields from alpha masks for parallax effects.

**Target Performance**: < 3ms at 584×584

```rust
#[wasm_bindgen]
pub fn generate_sdf(
    alpha_data: &[u8],
    width: u32,
    height: u32,
    max_distance: f32
) -> Vec<u8>;
```

### 2. Mipmap Generator (`mipmap.rs`)
Creates mipmap pyramid for zoom/pan effects.

**Target Performance**: < 2ms for 4 levels

```rust
#[wasm_bindgen]
pub fn generate_mipmaps(
    image_data: &[u8],
    width: u32,
    height: u32,
    levels: u32
) -> Vec<Vec<u8>>;
```

### 3. Matte Normalizer (`normalize.rs`)
Normalizes alpha edges and centers sprites.

**Target Performance**: < 1ms

```rust
#[wasm_bindgen]
pub fn normalize_matte(
    image_data: &mut [u8],
    width: u32,
    height: u32
) -> CentroidResult;
```

## Build Instructions

### Prerequisites
- Rust toolchain: https://rustup.rs
- wasm-pack: `cargo install wasm-pack`

### Build
```bash
cd wasm
wasm-pack build --target web --out-dir pkg
```

### Integration
```typescript
import init, { generate_sdf } from './wasm/pkg';

// Initialize WASM module
await init();

// Use the function
const sdf = generate_sdf(alphaData, width, height, 32.0);
```

## Fallback Strategy

All WASM operations have JavaScript fallbacks in `virtual-frame-utils.ts`.
The system automatically uses JS if WASM fails to load.

```typescript
let wasmModule: WasmModule | null = null;

export async function initWasm() {
  try {
    wasmModule = await import('./wasm/pkg');
    await wasmModule.default();
  } catch (e) {
    console.warn('WASM not available, using JS fallback');
  }
}

export function generateSDF(alpha: Uint8Array, w: number, h: number) {
  if (wasmModule) {
    return wasmModule.generate_sdf(alpha, w, h, 32.0);
  }
  return generateSDF_JS(alpha, w, h);  // Fallback
}
```

## Performance Targets

| Operation | JS Baseline | WASM Target | Improvement |
|-----------|-------------|-------------|-------------|
| SDF (584×584) | ~15ms | < 3ms | 5× |
| Mipmap (4 levels) | ~8ms | < 2ms | 4× |
| Normalize | ~3ms | < 1ms | 3× |

## Future: SIMD Optimization

When browser support is wider, enable SIMD for additional 2-4× speedup:

```toml
# Cargo.toml
[target.wasm32-unknown-unknown]
rustflags = ["-C", "target-feature=+simd128"]
```

## Development Status

- [ ] Initial Rust project setup
- [ ] SDF module implementation
- [ ] Mipmap module implementation
- [ ] Normalize module implementation
- [ ] SIMD optimization
- [ ] Benchmark suite
- [ ] Integration tests
