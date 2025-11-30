
import { StylePreset } from "./types";

// Credit costs per generation mode
export const CREDIT_COSTS = {
  TURBO: 1,           // 4 frames - fast generation
  QUALITY: 2,         // 8 frames - better quality
  SUPER_MODE: 4,      // 15 frames - premium choreography
  RE_EXPORT: 1,       // Re-export with new song/params (Turbo/Quality only)
  WIDGET_PURCHASE: 20, // Standalone widget export (watermarked unless subscriber)
} as const;

// Export duration options with credit costs
// - 15s (middle of song), 30s (first 30s), 59s (last minute) = 1 credit
// - Full song = 2 credits
// - Double cost for no watermark toggle
export const EXPORT_OPTIONS = {
  '15s-mid': { label: '15s (Middle)', durationSec: 15, position: 'middle', credits: 1 },
  '30s-start': { label: '30s (Start)', durationSec: 30, position: 'start', credits: 1 },
  '59s-end': { label: '59s (End)', durationSec: 59, position: 'end', credits: 1 },
  'full': { label: 'Full Song', durationSec: null, position: 'full', credits: 2 },
} as const;

export type ExportDurationType = keyof typeof EXPORT_OPTIONS;

// Credit pack pricing - user request: $1/1cr, $5/10cr, $10/25cr, $20/60cr, $30/100cr
export const CREDIT_PACKS = [
  { id: 'pack_1', credits: 1, price: 1, label: '1 Credit', priceId: 'price_1cr' },
  { id: 'pack_10', credits: 10, price: 5, label: '10 Credits', priceId: 'price_10cr', popular: true },
  { id: 'pack_25', credits: 25, price: 10, label: '25 Credits', priceId: 'price_25cr' },
  { id: 'pack_60', credits: 60, price: 20, label: '60 Credits', priceId: 'price_60cr', bestValue: true },
  { id: 'pack_100', credits: 100, price: 30, label: '100 Credits', priceId: 'price_100cr' },
] as const;

// Subscription tier - $8/month for no ads + 2 daily credits + watermark removal
export const SUBSCRIPTION = {
  id: 'sub_pro',
  price: 8,
  dailyCredits: 2,
  label: 'Pro Subscription',
  priceId: 'price_sub_pro',
  features: [
    'No Watermarks on Exports',
    'Unlimited Re-Exports (Super Mode)',
    '2 Free Credits Daily',
    'Priority Generation',
    'No Ads',
  ],
} as const;

// Free tier benefits
export const FREE_TIER = {
  signupCredits: 5,     // Credits given on signup
  dailyCredits: 1,      // Free credit per day for all users
} as const;

// Legacy exports for backward compatibility
export const CREDIT_COST_PER_SONG = CREDIT_COSTS.TURBO;
export const CREDITS_PACK_PRICE = 5;
export const CREDITS_PER_PACK = 10;

export const TIER_LIMITS = {
  free: {
    maxDuration: 300, // Allow full song for dev/beta
    genCount: 16, 
    label: 'Free Preview'
  },
  pro: {
    maxDuration: 300,
    genCount: 16,
    label: 'Full Access'
  }
};

export const SUPER_MODE_PRESETS = [
    { id: 'triplet-flow', label: 'Triplet Flow (3/4)', description: 'Choreography locked to triplets. Good for Trap/Waltz.' },
    { id: 'vocal-chop', label: 'Vocal Chop / Lip Sync', description: 'Heavy emphasis on face close-ups during vocal runs.' },
    { id: 'char-spin', label: 'Character Spin', description: 'Full 360-degree rotation simulation poses.' },
    { id: 'slow-mo-impact', label: 'Slow-Mo Impact', description: 'Fast buildups with sudden half-time drops.' },
    { id: 'liquid-morph', label: 'Liquid Morph', description: 'Constant fluid motion between poses.' }
];

export const STYLE_PRESETS: StylePreset[] = [
  // --- CINEMATIC (4 Options) ---
  {
    id: 'neon-cyber',
    name: 'Neon Cyberpunk',
    category: 'Cinematic',
    description: 'Glowing neon lights, dark tech aesthetic.',
    promptModifier: 'cyberpunk style, neon lights, glowing edges, futuristic city atmosphere, dark background with vibrant cyan and magenta highlights. High contrast. Sharp details.',
    thumbnail: 'https://picsum.photos/id/132/100/100',
    hologramParams: { geometryType: 0, hue: 280, chaos: 0.3, density: 1.2, speed: 0.8, intensity: 0.7 }
  },
  {
    id: 'noir',
    name: 'Neo Noir',
    category: 'Cinematic',
    description: 'Black and white, high contrast, dramatic.',
    promptModifier: 'film noir style, black and white, dramatic lighting, volumetric fog, wet streets, moody, cinematic composition, 4k.',
    thumbnail: 'https://picsum.photos/id/237/100/100',
    hologramParams: { geometryType: 6, hue: 0, saturation: 0, chaos: 0.1, density: 0.5, speed: 0.2, intensity: 0.8 }
  },
  {
    id: 'natural',
    name: 'Cinematic Realism',
    category: 'Cinematic',
    description: 'Preserves original aesthetic. Just motion.',
    promptModifier: 'photorealistic, unchanged art style, preserve original aesthetic, high fidelity, natural lighting, 8k resolution.',
    thumbnail: 'https://picsum.photos/id/64/100/100',
    hologramParams: { geometryType: 6, hue: 200, chaos: 0.0, density: 0.5, speed: 0.3, intensity: 0.3 }
  },
  {
    id: 'vintage-film',
    name: 'Vintage Film',
    category: 'Cinematic',
    description: 'Warm 70s Kodak look, film grain.',
    promptModifier: 'vintage 70s film look, kodak portra style, warm colors, film grain, soft focus, nostalgic atmosphere, cinematic.',
    thumbnail: 'https://picsum.photos/id/435/100/100',
    hologramParams: { geometryType: 6, hue: 30, chaos: 0.2, density: 0.7, speed: 0.1, intensity: 0.4 }
  },

  // --- ANIME / 2D (4 Options) ---
  {
    id: 'retro-anime',
    name: 'Retro Anime (90s)',
    category: 'Anime/2D',
    description: 'Vintage cel-shaded look, grain, VHS.',
    promptModifier: '90s anime style, cel shaded, vhs glitch effect, retro aesthetic, lo-fi anime screenshot, hand drawn look, Cowboy Bebop aesthetic.',
    thumbnail: 'https://picsum.photos/id/234/100/100',
    hologramParams: { geometryType: 1, hue: 340, chaos: 0.1, density: 0.8, speed: 0.4, intensity: 0.5, saturation: 0.6 }
  },
  {
    id: 'cyber-samurai',
    name: 'Cyber Samurai',
    category: 'Anime/2D',
    description: 'Sharp lines, manga style, ink, red & black.',
    promptModifier: 'manga art style, ink lines, stark black and white with red accents, aggressive strokes, dynamic shading, Akira style.',
    thumbnail: 'https://picsum.photos/id/433/100/100',
    hologramParams: { geometryType: 0, hue: 0, chaos: 0.4, density: 1.0, speed: 1.5, intensity: 0.9 }
  },
  {
    id: 'pixel-art',
    name: '16-Bit Pixel',
    category: 'Anime/2D',
    description: 'Retro game sprite aesthetic.',
    promptModifier: 'pixel art, 16-bit game sprite, limited color palette, dithering, retro video game style, blocky edges.',
    thumbnail: 'https://picsum.photos/id/532/100/100',
    hologramParams: { geometryType: 1, hue: 120, chaos: 0.0, density: 2.0, speed: 0.8, intensity: 0.6 }
  },
  {
    id: 'vector-flat',
    name: 'Vector Flat',
    category: 'Anime/2D',
    description: 'Clean, minimal, flat colors.',
    promptModifier: 'flat vector art, kurzgesagt style, clean lines, minimal shading, vibrant flat colors, modern graphic design.',
    thumbnail: 'https://picsum.photos/id/106/100/100',
    hologramParams: { geometryType: 2, hue: 180, chaos: 0.0, density: 0.3, speed: 0.2, intensity: 0.7 }
  },

  // --- DIGITAL / GLITCH (4 Options) ---
  {
    id: 'acid-glitch',
    name: 'Acid Glitch',
    category: 'Digital/Glitch',
    description: 'Distorted visuals, digital noise.',
    promptModifier: 'glitch art, datamosh, chromatic aberration, distorted digital noise, acid colors, psychedelic, raw aesthetics.',
    thumbnail: 'https://picsum.photos/id/345/100/100',
    hologramParams: { geometryType: 4, hue: 120, chaos: 0.8, density: 1.5, speed: 1.2, intensity: 0.8, morph: 0.5 }
  },
  {
    id: 'vaporwave',
    name: 'Vaporwave',
    category: 'Digital/Glitch',
    description: 'Pink/Blue pastels, statues, grid.',
    promptModifier: 'vaporwave aesthetic, pastel pink and blue gradient, greek statue elements, 80s computer graphics, grid background, nostalgic.',
    thumbnail: 'https://picsum.photos/id/321/100/100',
    hologramParams: { geometryType: 3, hue: 300, chaos: 0.0, density: 0.6, speed: 0.2, intensity: 0.5 }
  },
  {
    id: 'crt-terminal',
    name: 'CRT Terminal',
    category: 'Digital/Glitch',
    description: 'Green phosphor, scanlines, retro monitor.',
    promptModifier: 'crt monitor effect, green phosphor screen, scanlines, digital terminal aesthetic, matrix code style, retro computing.',
    thumbnail: 'https://picsum.photos/id/54/100/100',
    hologramParams: { geometryType: 1, hue: 100, chaos: 0.2, density: 1.8, speed: 0.5, intensity: 0.8 }
  },
  {
    id: 'low-poly',
    name: 'Low Poly',
    category: 'Digital/Glitch',
    description: 'PS1 aesthetic, jagged edges.',
    promptModifier: 'ps1 aesthetics, low poly 3d model, jagged edges, low resolution texture, retro 3d graphics, playstation 1 style.',
    thumbnail: 'https://picsum.photos/id/96/100/100',
    hologramParams: { geometryType: 0, hue: 240, chaos: 0.1, density: 0.5, speed: 0.4, intensity: 0.6 }
  },

  // --- ARTISTIC (4 Options) ---
  {
    id: 'oil-painting',
    name: 'Dreamy Oil',
    category: 'Artistic',
    description: 'Fluid strokes, vivid colors.',
    promptModifier: 'impasto oil painting, thick brush strokes, vivid colors, dreamy atmosphere, swirling patterns, expressionist art.',
    thumbnail: 'https://picsum.photos/id/456/100/100',
    hologramParams: { geometryType: 3, hue: 200, chaos: 0.0, density: 0.6, speed: 0.2, intensity: 0.6, morph: 0.8 }
  },
  {
    id: 'claymation',
    name: 'Claymation',
    category: 'Artistic',
    description: 'Stop-motion plasticine look.',
    promptModifier: 'claymation style, plasticine texture, stop motion look, soft lighting, fingerprint textures, aardman style.',
    thumbnail: 'https://picsum.photos/id/674/100/100',
    hologramParams: { geometryType: 2, hue: 40, chaos: 0.0, density: 0.4, speed: 0.3, intensity: 0.5 }
  },
  {
    id: 'street-graffiti',
    name: 'Street Graffiti',
    category: 'Artistic',
    description: 'Spray paint, urban, drip effects.',
    promptModifier: 'street art graffiti, spray paint texture, drip effects, vibrant urban colors, mural style, rough wall texture.',
    thumbnail: 'https://picsum.photos/id/103/100/100',
    hologramParams: { geometryType: 4, hue: 320, chaos: 0.6, density: 0.9, speed: 0.7, intensity: 0.8 }
  },
  {
    id: 'ukiyo-e',
    name: 'Ukiyo-e',
    category: 'Artistic',
    description: 'Japanese woodblock print style.',
    promptModifier: 'ukiyo-e style, japanese woodblock print, hokusai style, flat perspective, outlined waves, textured paper.',
    thumbnail: 'https://picsum.photos/id/88/100/100',
    hologramParams: { geometryType: 5, hue: 210, chaos: 0.0, density: 0.4, speed: 0.2, intensity: 0.4 }
  }
];
