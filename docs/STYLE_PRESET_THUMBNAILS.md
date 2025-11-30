# Style Preset Thumbnail Design Spec

**A Paul Phillips Manifestation**
**Created:** 2025-11-29

---

## Concept

Each style preset thumbnail should be **the style name with that style applied to it**. The text IS the demo. Users instantly understand what they'll get because they're looking at it.

---

## Thumbnail Specifications

- **Size:** 100x100px (current) or 120x80px (widescreen option)
- **Format:** PNG with transparency OR SVG for scalability
- **Background:** Dark/transparent to work on glassmorphic UI
- **Text:** Style name as the visual

---

## Style Thumbnails Design

### CINEMATIC (4 Styles)

#### 1. Neon Cyberpunk
```
┌──────────────────┐
│   N E O N       │  ← Glowing cyan/magenta text
│  CYBERPUNK      │  ← Neon glow, dark bg, scan lines
│                 │  ← Electric edge highlights
└──────────────────┘
```
**Effect:** Glowing neon text with cyan/magenta gradient, subtle scan lines, electric glow bleeding off edges

#### 2. Neo Noir
```
┌──────────────────┐
│    NEO          │  ← High contrast B&W
│    NOIR         │  ← Dramatic shadow, film grain
│                 │  ← Venetian blind light strips
└──────────────────┘
```
**Effect:** Black and white, dramatic diagonal lighting, film grain overlay, high contrast shadows

#### 3. Cinematic Realism
```
┌──────────────────┐
│  CINEMATIC      │  ← Clean, subtle lighting
│  REALISM        │  ← Soft shadow, natural colors
│                 │  ← Anamorphic lens flare hint
└──────────────────┘
```
**Effect:** Clean typography, subtle warm lighting, soft depth shadow, minimal but elegant

#### 4. Vintage Film
```
┌──────────────────┐
│   VINTAGE       │  ← Warm sepia/orange tones
│    FILM         │  ← Film grain, light leaks
│                 │  ← Rounded retro font
└──────────────────┘
```
**Effect:** Kodak warm colors, heavy film grain, light leak in corner, slightly faded

---

### ANIME/2D (4 Styles)

#### 5. Retro Anime (90s)
```
┌──────────────────┐
│   RETRO         │  ← Cel-shaded text
│   ANIME         │  ← VHS tracking glitch
│                 │  ← 90s color palette
└──────────────────┘
```
**Effect:** Bold outlined text, cel-shaded look, VHS distortion lines, Cowboy Bebop color palette

#### 6. Cyber Samurai
```
┌──────────────────┐
│   CYBER         │  ← Sharp manga ink lines
│  SAMURAI        │  ← Red splash accent
│                 │  ← Black/white/red only
└──────────────────┘
```
**Effect:** Bold ink brush strokes, stark black/white, red accent splash, aggressive angles

#### 7. 16-Bit Pixel
```
┌──────────────────┐
│  16-BIT         │  ← Chunky pixel font
│  PIXEL          │  ← Limited color palette
│                 │  ← Visible pixels/dithering
└──────────────────┘
```
**Effect:** Pixelated text, 16-color palette, visible dithering, retro game aesthetic

#### 8. Vector Flat
```
┌──────────────────┐
│   VECTOR        │  ← Clean geometric shapes
│    FLAT         │  ← Solid flat colors
│                 │  ← No gradients, sharp edges
└──────────────────┘
```
**Effect:** Kurzgesagt style, flat solid colors, clean vector shapes, minimal shadows

---

### DIGITAL/GLITCH (4 Styles)

#### 9. Acid Glitch
```
┌──────────────────┐
│  A̷C̸I̴D̷         │  ← Chromatic aberration
│  G̶L̵I̷T̸C̵H̶       │  ← RGB split, datamosh
│                 │  ← Corrupted/distorted
└──────────────────┘
```
**Effect:** Heavy RGB splitting, chromatic aberration, datamosh distortion, acid colors

#### 10. Vaporwave
```
┌──────────────────┐
│ V A P O R W A V E│  ← Wide spaced text
│    波            │  ← Japanese character
│                 │  ← Pink/cyan gradient, grid
└──────────────────┘
```
**Effect:** Pink/cyan gradient, 80s grid background, statue silhouette, spaced out text

#### 11. CRT Terminal
```
┌──────────────────┐
│ > CRT_          │  ← Green phosphor glow
│ > TERMINAL█     │  ← Scanlines, cursor blink
│                 │  ← Slight curvature
└──────────────────┘
```
**Effect:** Green monochrome, phosphor glow, horizontal scan lines, blinking cursor, CRT curve

#### 12. Low Poly
```
┌──────────────────┐
│   LOW           │  ← Faceted/triangulated text
│   POLY          │  ← PS1 texture wobble
│                 │  ← Jagged polygon edges
└──────────────────┘
```
**Effect:** Text made of triangles, PS1 texture warping, low-res jagged edges

---

### ARTISTIC (4 Styles)

#### 13. Dreamy Oil
```
┌──────────────────┐
│  DREAMY         │  ← Thick brush stroke text
│   OIL           │  ← Swirling impasto texture
│                 │  ← Rich saturated colors
└──────────────────┘
```
**Effect:** Visible brush strokes, impasto texture, swirling Van Gogh style, rich colors

#### 14. Claymation
```
┌──────────────────┐
│ CLAYMATION      │  ← Soft rounded plasticine look
│                 │  ← Visible fingerprints
│                 │  ← Matte, soft lighting
└──────────────────┘
```
**Effect:** Rounded clay-like text, fingerprint texture, soft matte look, Aardman style

#### 15. Street Graffiti
```
┌──────────────────┐
│  STREET         │  ← Spray paint drips
│ GRAFFITI        │  ← Brick wall texture
│                 │  ← Bold bubble letters
└──────────────────┘
```
**Effect:** Spray paint texture, drip effects, brick background, bold graffiti lettering

#### 16. Ukiyo-e
```
┌──────────────────┐
│  浮世絵          │  ← Japanese characters
│  UKIYO-E        │  ← Woodblock print lines
│                 │  ← Wave pattern hint
└──────────────────┘
```
**Effect:** Woodblock print texture, Hokusai wave hint, outlined flat colors, paper texture

---

## Generation Approach

### Option A: AI Generation (Recommended)
Use an image generation model with prompts like:
```
"The word 'NEON CYBERPUNK' rendered in glowing neon cyberpunk style,
cyan and magenta neon lights, dark background, 100x100px thumbnail,
the text itself demonstrates the style"
```

### Option B: CSS/Canvas Generation
Create these dynamically with CSS effects:
- Text-shadow for glows
- Filters for distortion
- SVG filters for complex effects
- Canvas for pixel manipulation

### Option C: Manual Design
Design in Figma/Photoshop with careful attention to each style's characteristics.

---

## Implementation

```typescript
// constants.ts - Update thumbnail URLs
export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'neon-cyber',
    name: 'Neon Cyberpunk',
    category: 'Cinematic',
    // Replace picsum placeholder with actual styled thumbnail
    thumbnail: '/assets/style-thumbs/neon-cyberpunk.png',
    // ... rest of config
  },
  // ...
];
```

---

## File Structure

```
/public/assets/style-thumbs/
├── neon-cyberpunk.png
├── neo-noir.png
├── cinematic-realism.png
├── vintage-film.png
├── retro-anime.png
├── cyber-samurai.png
├── pixel-16bit.png
├── vector-flat.png
├── acid-glitch.png
├── vaporwave.png
├── crt-terminal.png
├── low-poly.png
├── dreamy-oil.png
├── claymation.png
├── street-graffiti.png
└── ukiyo-e.png
```

---

## Priority Order for Generation

1. **Neon Cyberpunk** - Hero style, most eye-catching
2. **Acid Glitch** - Unique and memorable
3. **Retro Anime** - Popular aesthetic
4. **Vaporwave** - Iconic look
5. **CRT Terminal** - Easy to create, distinctive
6. *...rest in order*

---

*A Paul Phillips Manifestation*
*"The style IS the preview"*
