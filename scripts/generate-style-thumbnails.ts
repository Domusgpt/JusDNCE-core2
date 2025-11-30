/**
 * One-Time Style Thumbnail Generator
 * A Paul Phillips Manifestation
 *
 * Run once during development to generate static style preview images.
 * Uses the app's Gemini API to create thumbnails where the text IS the style.
 *
 * Usage: npx ts-node scripts/generate-style-thumbnails.ts
 *
 * Output: public/assets/style-thumbs/*.png
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

// Style definitions with generation prompts
const STYLE_THUMBNAILS = [
  // CINEMATIC
  {
    id: 'neon-cyber',
    name: 'NEON\nCYBER',
    prompt: 'Create a 200x200 image showing the text "NEON CYBER" rendered in glowing neon cyberpunk style. Cyan and magenta neon light tubes forming the letters, electric glow bleeding off edges, dark black background, subtle scan lines. The text itself should look like actual neon signs. High contrast, vibrant colors.'
  },
  {
    id: 'noir',
    name: 'NEO\nNOIR',
    prompt: 'Create a 200x200 image showing the text "NEO NOIR" in dramatic film noir style. Black and white only, high contrast, dramatic diagonal shadows like venetian blinds across the text, film grain texture, moody atmospheric lighting. Classic 1940s detective movie aesthetic.'
  },
  {
    id: 'natural',
    name: 'CINEMATIC\nREALISM',
    prompt: 'Create a 200x200 image showing the text "CINEMATIC REALISM" in clean, professional cinematic typography. Subtle warm lighting, soft shadows, elegant serif font, slight anamorphic lens flare, dark background. High-end movie title card quality.'
  },
  {
    id: 'vintage-film',
    name: 'VINTAGE\nFILM',
    prompt: 'Create a 200x200 image showing the text "VINTAGE FILM" in 1970s Kodak film style. Warm sepia/orange color grading, heavy film grain, light leaks in corners, slightly faded and sun-bleached look, rounded retro typography. Nostalgic analog film aesthetic.'
  },

  // ANIME/2D
  {
    id: 'retro-anime',
    name: 'RETRO\nANIME',
    prompt: 'Create a 200x200 image showing the text "RETRO ANIME" in 1990s anime style. Cel-shaded bold outlined letters, VHS tracking distortion lines, limited color palette like Cowboy Bebop or Akira, slight chromatic aberration. Hand-drawn anime title card look.'
  },
  {
    id: 'cyber-samurai',
    name: 'CYBER\nSAMURAI',
    prompt: 'Create a 200x200 image showing the text "CYBER SAMURAI" in aggressive manga ink style. Bold black ink brush strokes, stark black and white with red accent splashes, dynamic aggressive angles, Japanese manga aesthetic. Akira/Ghost in the Shell inspired.'
  },
  {
    id: 'pixel-art',
    name: '16-BIT\nPIXEL',
    prompt: 'Create a 200x200 image showing the text "16-BIT PIXEL" in retro video game pixel art style. Chunky pixelated letters, limited 16-color palette, visible dithering patterns, blocky edges. Super Nintendo/Sega Genesis era aesthetic. Dark background.'
  },
  {
    id: 'vector-flat',
    name: 'VECTOR\nFLAT',
    prompt: 'Create a 200x200 image showing the text "VECTOR FLAT" in modern flat design style. Clean geometric sans-serif letters, solid flat colors with no gradients, minimal design, Kurzgesagt/corporate illustration style. Vibrant but flat color palette, dark background.'
  },

  // DIGITAL/GLITCH
  {
    id: 'acid-glitch',
    name: 'ACID\nGLITCH',
    prompt: 'Create a 200x200 image showing the text "ACID GLITCH" with heavy digital glitch effects. Chromatic RGB color splitting, datamosh corruption, scan line distortion, acid neon colors (green, pink, cyan), the text should look corrupted and distorted. Digital noise artifacts.'
  },
  {
    id: 'vaporwave',
    name: 'VAPOR\nWAVE',
    prompt: 'Create a 200x200 image showing the text "VAPOR WAVE" in vaporwave aesthetic. Pink and cyan gradient, wide letter spacing, 80s computer graphics style, grid lines, maybe a small Greek statue silhouette. Nostalgic retro-futuristic aesthetic, dark purple/black background.'
  },
  {
    id: 'crt-terminal',
    name: '> CRT_\nTERMINAL',
    prompt: 'Create a 200x200 image showing the text "> CRT TERMINAL" in old computer terminal style. Green phosphor monochrome glow, horizontal scan lines, slight CRT screen curvature, blinking cursor effect, matrix/hacker aesthetic. Retro computing look.'
  },
  {
    id: 'low-poly',
    name: 'LOW\nPOLY',
    prompt: 'Create a 200x200 image showing the text "LOW POLY" in PlayStation 1 low-poly 3D style. Letters made of visible triangular polygons, faceted geometric surface, PS1 texture warping effect, jagged pixelated edges. Retro 3D graphics aesthetic, dark background.'
  },

  // ARTISTIC
  {
    id: 'oil-painting',
    name: 'DREAMY\nOIL',
    prompt: 'Create a 200x200 image showing the text "DREAMY OIL" in impressionist oil painting style. Thick visible brush strokes forming the letters, swirling Van Gogh-like textures, rich saturated colors (blues, purples, golds), impasto technique. Painterly artistic look.'
  },
  {
    id: 'claymation',
    name: 'CLAY\nMATION',
    prompt: 'Create a 200x200 image showing the text "CLAYMATION" in stop-motion clay animation style. Letters look like sculpted plasticine/clay, visible fingerprint textures, soft matte lighting, Aardman/Wallace & Gromit aesthetic. Rounded soft edges, warm colors.'
  },
  {
    id: 'street-graffiti',
    name: 'STREET\nGRAFFITI',
    prompt: 'Create a 200x200 image showing the text "STREET GRAFFITI" in urban street art style. Spray paint texture, dripping paint effects, bold bubble letter graffiti style, brick wall texture background, vibrant urban colors. Street art mural aesthetic.'
  },
  {
    id: 'ukiyo-e',
    name: '浮世絵\nUKIYO-E',
    prompt: 'Create a 200x200 image showing the text "UKIYO-E" with Japanese characters 浮世絵 in traditional Japanese woodblock print style. Hokusai-inspired waves hint, flat outlined colors, visible woodgrain texture, traditional indigo and earth tones. Edo period ukiyo-e aesthetic.'
  }
];

async function generateThumbnails() {
  // Check for API key
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ No Gemini API key found. Set GEMINI_API_KEY environment variable.');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Use Gemini 2.0 Flash for image generation
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      responseModalities: ['image', 'text'],
    } as any
  });

  // Create output directory
  const outputDir = path.join(__dirname, '../public/assets/style-thumbs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🎨 Starting Style Thumbnail Generation...\n');
  console.log(`📁 Output: ${outputDir}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const style of STYLE_THUMBNAILS) {
    console.log(`⏳ Generating: ${style.id}...`);

    try {
      const result = await model.generateContent(style.prompt);
      const response = await result.response;

      // Extract image from response
      const parts = response.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

      if (imagePart?.inlineData?.data) {
        const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
        const outputPath = path.join(outputDir, `${style.id}.png`);
        fs.writeFileSync(outputPath, imageBuffer);
        console.log(`   ✅ Saved: ${style.id}.png`);
        successCount++;
      } else {
        console.log(`   ⚠️ No image in response for ${style.id}`);
        failCount++;
      }

      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error: any) {
      console.log(`   ❌ Failed: ${style.id} - ${error.message}`);
      failCount++;
    }
  }

  console.log('\n========================================');
  console.log(`🎉 Generation Complete!`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('========================================\n');

  if (successCount > 0) {
    console.log('Next steps:');
    console.log('1. Review generated images in public/assets/style-thumbs/');
    console.log('2. Regenerate any that need improvement');
    console.log('3. Update constants.ts thumbnail paths');
    console.log('4. Commit the images to the repo');
  }
}

// Run
generateThumbnails().catch(console.error);
