/**
 * Gemini Frame Generation Service - Fluid Integration
 *
 * Sprite sheet generation with deterministic slicing
 * Based on Domusgpt/Fluid-jusdnce with customizations for:
 * - WHITE backgrounds with strobe effect option
 * - 2x2 closeup sheets for Super Mode
 * - Transparent background experimental mode
 *
 * A Paul Phillips Manifestation
 * "The Revolution Will Not be in a Structured Format"
 */

import { GoogleGenAI } from "@google/genai";
import { GeneratedFrame, EnergyLevel, SubjectCategory, FrameType, SheetRole, BackgroundMode } from "../types";

// API KEY from environment variables only - SECURE
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- UTILITIES ---

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') resolve(reader.result);
            else reject(new Error("FileReader result was not a string"));
        };
        reader.onerror = (error) => reject(new Error("File reading failed"));
    });
};

// Optimized resize for Gemini 384px Input cost saving
const resizeImage = (file: File | string, maxDim: number = 384): Promise<string> => {
    return new Promise((resolve, reject) => {
        let src = '';
        if (typeof file === 'string') {
            src = file;
        } else {
            if (!file || !(file instanceof File)) return reject(new Error("Invalid file"));
            try {
                src = URL.createObjectURL(file);
            } catch (e) {
                return fileToBase64(file).then(b64 => resizeImage(b64, maxDim)).then(resolve).catch(reject);
            }
        }

        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDim) { height *= maxDim / width; width = maxDim; }
                } else {
                    if (height > maxDim) { width *= maxDim / height; height = maxDim; }
                }

                canvas.width = Math.floor(width);
                canvas.height = Math.floor(height);
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    if (src.startsWith('blob:')) URL.revokeObjectURL(src);
                    resolve(src);
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                if (src.startsWith('blob:')) URL.revokeObjectURL(src);
                resolve(dataUrl);
            } catch (e) {
                if (src.startsWith('blob:')) URL.revokeObjectURL(src);
                resolve(src);
            }
        };
        img.onerror = () => {
            if (src.startsWith('blob:')) URL.revokeObjectURL(src);
            resolve(src);
        };
        img.src = src;
    });
};

export const fileToGenericBase64 = async (file: File): Promise<string> => {
  try { return await resizeImage(file); }
  catch (e) { return await fileToBase64(file); }
};

// --- DETERMINISTIC SLICER (PURE MATH) ---
const sliceSpriteSheet = (base64Image: string, rows: number, cols: number): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            // 1. Determine the "Active Square"
            // If the AI returns a non-square image, we crop to the center square.
            const size = Math.min(img.width, img.height);
            const startX = (img.width - size) / 2;
            const startY = (img.height - size) / 2;

            // 2. Calculate Cell Size
            const rawCellW = size / cols;
            const rawCellH = size / rows;

            // 3. Safety Inset (The "Bleed" Fix)
            // Aggressive inset to prevent vertical double-frame issues.
            // We assume the subject is centered in the cell.
            const insetFactor = 0.08; // 8% cut from each side
            const insetX = rawCellW * insetFactor;
            const insetY = rawCellH * insetFactor;
            const drawW = rawCellW * (1 - 2 * insetFactor);
            const drawH = rawCellH * (1 - 2 * insetFactor);

            const frames: string[] = [];
            const canvas = document.createElement('canvas');
            canvas.width = Math.floor(drawW);
            canvas.height = Math.floor(drawH);
            const ctx = canvas.getContext('2d');

            if(!ctx) { reject("Canvas context failed"); return; }

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // Math: Grid Start + Inset
                    const sx = startX + (c * rawCellW) + insetX;
                    const sy = startY + (r * rawCellH) + insetY;

                    ctx.drawImage(
                        img,
                        sx, sy, drawW, drawH,    // Source
                        0, 0, canvas.width, canvas.height // Dest
                    );

                    frames.push(canvas.toDataURL('image/jpeg', 0.95));
                }
            }
            resolve(frames);
        };
        img.onerror = reject;
        img.src = base64Image;
    });
};

// --- MIRROR UTILITY ---
const mirrorFrame = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            } else {
                resolve(dataUrl);
            }
        };
        img.src = dataUrl;
    });
};

// --- PROMPT ENGINEERING ---
const constructDynamicPrompt = (
    category: SubjectCategory,
    role: SheetRole,
    stylePrompt: string,
    motionPrompt: string,
    backgroundMode: BackgroundMode
): string => {

    // Background description based on mode
    const bgDesc = backgroundMode === 'transparent'
        ? 'TRANSPARENT background (no background, PNG with alpha)'
        : backgroundMode === 'dark'
        ? 'DARK/BLACK background'
        : 'seamless WHITE background';

    // 1. Strict Architecture - VISUAL DIAGRAM & CONSTRAINTS
    // We use an ASCII diagram to force the AI to understand the 4x4 grid structure spatially.
    const arch = `
    ROLE: Professional 2D Game Asset Artist.
    TASK: Generate a 4x4 SPRITE SHEET (16 distinct frames) on a ${bgDesc}.

    [VISUAL STRUCTURE DIAGRAM]
    _______________________________________________________
    |             |             |             |             |
    |   [ P1 ]    |   [ P2 ]    |   [ P3 ]    |   [ P4 ]    |  <-- ROW 1: IDLE
    |_____________|_____________|_____________|_____________|
    |             |             |             |             |
    |   [ P5 ]    |   [ P6 ]    |   [ P7 ]    |   [ P8 ]    |  <-- ROW 2: LEFT
    |_____________|_____________|_____________|_____________|
    |             |             |             |             |
    |   [ P9 ]    |   [ P10 ]   |   [ P11 ]   |   [ P12 ]   |  <-- ROW 3: RIGHT
    |_____________|_____________|_____________|_____________|
    |             |             |             |             |
    |   [ P13 ]   |   [ P14 ]   |   [ P15 ]   |   [ P16 ]   |  <-- ROW 4: ACTION
    |_____________|_____________|_____________|_____________|

    STRICT GENERATION RULES:
    1. NO GRID LINES: The lines in the diagram above are for layout reference only. The final output must be 16 characters floating on a pure ${backgroundMode === 'white' ? 'white' : backgroundMode === 'dark' ? 'dark' : 'transparent'} background. NO DRAWN BORDERS.
    2. SAFETY MARGIN (PADDING): The subject (shown as [ Px ]) must be centered in its invisible cell with at least 20% padding on all sides.
    3. NO CLIPPING: Hands, feet, and hair must NEVER touch the edge of the imaginary grid cell. Scale the character down if necessary to fit dynamic poses.
    4. CONSISTENCY: Keep the character size and proportions identical across all 16 frames.
    `;

    // 2. Choreography Planning (The Soul)
    // Maps rows to specific functions so the App knows how to use them.
    let choreography = "";

    if (category === 'CHARACTER') {
        choreography = `
        CHOREOGRAPHY PLAN:
        ROW 1 (Frames 1-4): IDLE & BREATHING.
           - Front-facing. Subtle movements.
           - Feet planted firmly.
        ROW 2 (Frames 5-8): MOVING LEFT.
           - Stepping or leaning Left.
           - Arms countering motion. Ensure limbs stay inside the cell padding.
        ROW 3 (Frames 9-12): MOVING RIGHT.
           - Stepping or leaning Right.
           - Arms countering motion. Ensure limbs stay inside the cell padding.
        ROW 4 (Frames 13-16): HIGH ENERGY / JUMP.
           - Power pose or Jump.
           - CRITICAL: If jumping, make the character smaller to ensure they don't hit the top of the grid cell.
        `;
    }
    else if (category === 'TEXT') {
        choreography = `
        KINETIC TYPE PLAN:
        ROW 1: Base Legible State. Clean.
        ROW 2: Skew/Italicize Left with Motion Blur lines.
        ROW 3: Skew/Italicize Right with Motion Blur lines.
        ROW 4: Heavy Distortion / Explosion / Glitch / Fragments.
        *IMPORTANT*: Keep text centered and contained within the grid cells.
        `;
    }
    else { // SYMBOL/LOGO
        choreography = `
        ANIMATION PLAN:
        ROW 1: Base State (Pulse).
        ROW 2: Rotate Left (-30deg) with trail.
        ROW 3: Rotate Right (+30deg) with trail.
        ROW 4: Activation (Glow/Burst/High Contrast).
        *IMPORTANT*: Keep the symbol small enough to rotate without clipping the grid edges.
        `;
    }

    // 3. Style Injection
    const style = `
    VISUAL STYLE: ${stylePrompt}.
    CONTEXT: ${motionPrompt}.
    IMPORTANT: Ensure consistent character features and FLAT, CLEAR LIGHTING across all 16 frames.
    The goal is a production-ready sprite sheet that can be sliced automatically.
    `;

    return `${arch}\n${choreography}\n${style}`;
};

// --- CLOSEUP SHEET PROMPT (2x2 for Super Mode) ---
const constructCloseupPrompt = (
    category: SubjectCategory,
    stylePrompt: string,
    backgroundMode: BackgroundMode
): string => {
    const bgDesc = backgroundMode === 'white' ? 'WHITE' : backgroundMode === 'dark' ? 'DARK' : 'TRANSPARENT';

    return `
    ROLE: Professional 2D Game Asset Artist.
    TASK: Generate a 2x2 CLOSEUP SPRITE SHEET (4 distinct facial expressions) on a ${bgDesc} background.

    [VISUAL STRUCTURE - 2x2 GRID]
    _______________________________
    |              |              |
    |   NEUTRAL    |   SINGING    |
    |______________|______________|
    |              |              |
    |   SHOUTING   |   INTENSE    |
    |______________|______________|

    CLOSEUP REQUIREMENTS:
    1. EXTREME CLOSE-UP: Focus on face/center of subject only
    2. Frame 1 (NEUTRAL): Calm, closed mouth, relaxed expression
    3. Frame 2 (SINGING): Mouth open moderately, engaged expression
    4. Frame 3 (SHOUTING): Mouth wide open, energetic/shouting expression
    5. Frame 4 (INTENSE): Eyes intense, dramatic lighting, peak emotion

    STYLE: ${stylePrompt}
    CONSISTENCY: Same character, same lighting, same proportions across all 4 frames.
    NO GRID LINES in output - just 4 floating closeup frames.
    `;
};

// --- GENERATION UNIT ---
const generateSingleSheet = async (
    ai: GoogleGenAI,
    role: SheetRole,
    imageBase64: string,
    stylePrompt: string,
    motionPrompt: string,
    category: SubjectCategory,
    backgroundMode: BackgroundMode
): Promise<GeneratedFrame[]> => {

    const isCloseup = role === 'closeup';
    const rows = isCloseup ? 2 : 4;
    const cols = isCloseup ? 2 : 4;

    const systemPrompt = isCloseup
        ? constructCloseupPrompt(category, stylePrompt, backgroundMode)
        : constructDynamicPrompt(category, role, stylePrompt, motionPrompt, backgroundMode);

    console.log(`[Gemini] Generating ${role} sheet (${rows}x${cols}) for ${category}...`);

    let attempt = 0;
    while (attempt < 3) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-05-20',
                contents: [
                    { role: 'user', parts: [
                        { text: systemPrompt },
                        { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] } }
                    ]}
                ],
                config: {
                    responseModalities: ["image", "text"],
                }
            });

            const candidate = response.candidates?.[0];
            if (!candidate) throw new Error("No candidate returned");

            let spriteSheetBase64: string | undefined;
            if (candidate.content?.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData?.data) {
                        spriteSheetBase64 = part.inlineData.data;
                        break;
                    }
                }
            }

            if (!spriteSheetBase64) throw new Error("No image data in response");

            // Deterministic Slice
            const rawFrames = await sliceSpriteSheet(`data:image/jpeg;base64,${spriteSheetBase64}`, rows, cols);
            const finalFrames: GeneratedFrame[] = [];

            // Map Grid Index to Energy Level based on the Choreography Plan
            for (let i = 0; i < rawFrames.length; i++) {
                let energy: EnergyLevel = 'mid';
                let type: FrameType = isCloseup ? 'closeup' : 'body';
                const row = Math.floor(i / cols);

                if (isCloseup) {
                    // Closeup energy mapping: neutral=low, singing=mid, shouting=high, intense=high
                    energy = i === 0 ? 'low' : i === 1 ? 'mid' : 'high';
                } else {
                    // Body energy mapping based on row
                    if (row === 0) energy = 'low';      // Idle
                    else if (row === 1) energy = 'mid'; // Left
                    else if (row === 2) energy = 'mid'; // Right
                    else if (row === 3) energy = 'high'; // Impact
                }

                let poseName = `${role}_${i}`;

                // Tag direction for the choreography brain
                if (!isCloseup && category === 'CHARACTER') {
                    if (row === 1) poseName += '_left';
                    if (row === 2) poseName += '_right';
                }

                finalFrames.push({
                    url: rawFrames[i],
                    pose: poseName,
                    energy,
                    type,
                    role
                });

                // Mirroring Logic - "The Free Frames"
                // Mirror directional rows to fill out the movement
                if (!isCloseup && category === 'CHARACTER' && type === 'body') {
                    if (row === 1 || row === 2) {
                        const mirrored = await mirrorFrame(rawFrames[i]);
                        const mirrorSuffix = poseName.includes('left') ? 'right_mirror' : 'left_mirror';
                        finalFrames.push({
                            url: mirrored,
                            pose: poseName.replace(/left|right/, mirrorSuffix),
                            energy,
                            type,
                            role
                        });
                    }
                }
            }

            console.log(`[Gemini] ${role} sheet generated: ${finalFrames.length} frames`);
            return finalFrames;

        } catch (e: any) {
            console.error(`Sheet generation attempt ${attempt + 1} failed (${role}):`, e.message);
            if (e.message?.includes('429')) {
                console.log(`⏳ Rate limited, waiting ${2000 * (attempt + 1)}ms...`);
                await delay(2000 * (attempt + 1) + Math.random() * 500);
                attempt++;
            } else if (e.message?.includes('leaked') || e.message?.includes('revoked')) {
                console.error(`🔐 API KEY ISSUE: ${e.message}`);
                throw new Error('API key has been revoked. Please update the API key.');
            } else {
                attempt++;
                if (attempt >= 3) {
                    console.error(`❌ Sheet generation failed after 3 attempts`);
                    return [];
                }
                await delay(1000);
            }
        }
    }
    return [];
};

// --- MAIN EXPORT FUNCTION ---
export const generateDanceFrames = async (
  imageBase64: string,
  stylePrompt: string,
  motionPrompt: string,
  useTurbo: boolean,
  superMode: boolean,
  explicitCategory?: SubjectCategory,
  backgroundMode: BackgroundMode = 'white'
): Promise<{ frames: GeneratedFrame[], category: SubjectCategory }> => {

  console.log('🎭 Starting Fluid sprite sheet generation:', {
    superMode,
    backgroundMode,
    hasAPIKey: !!API_KEY
  });

  if (!API_KEY) {
    console.error('❌ No API key found!');
    throw new Error("Missing API Key - Set VITE_GEMINI_API_KEY in .env.local");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  // Optimize input image
  const optimizedInput = await resizeImage(imageBase64, 384);

  // Determine category
  let category: SubjectCategory = 'CHARACTER';
  if (explicitCategory) {
    category = explicitCategory;
  } else {
    const low = motionPrompt.toLowerCase();
    if (low.includes('text') || low.includes('font')) category = 'TEXT';
    else if (low.includes('logo') || low.includes('icon')) category = 'SYMBOL';
  }

  const promises: Promise<GeneratedFrame[]>[] = [];

  // Generate Base Sheet (4x4 = 16 frames)
  promises.push(generateSingleSheet(ai, 'base', optimizedInput, stylePrompt, motionPrompt, category, backgroundMode));

  // If Super Mode, generate additional sheets
  if (superMode) {
    // Alt body sheet for more variety
    promises.push(generateSingleSheet(ai, 'alt', optimizedInput, stylePrompt, motionPrompt, category, backgroundMode));

    // Closeup sheet (2x2 = 4 frames) for vocal/snare hits
    if (category === 'CHARACTER') {
      promises.push(generateSingleSheet(ai, 'closeup', optimizedInput, stylePrompt, motionPrompt, category, backgroundMode));
    }
  }

  const results = await Promise.all(promises);
  const allFrames = results.flat();

  if (allFrames.length === 0) {
    throw new Error("Generation produced no valid frames. Check API quota and console for details.");
  }

  console.log('🎉 Fluid generation complete!', {
    totalFrames: allFrames.length,
    bodyFrames: allFrames.filter(f => f.type === 'body').length,
    closeupFrames: allFrames.filter(f => f.type === 'closeup').length,
    category
  });

  return { frames: allFrames, category };
};

// --- MOCK FRAMES FOR TESTING ---
const createStickFigureSVG = (pose: string, color: string, label: string) => {
    const utf8ToBase64 = (str: string) => {
        return window.btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
            (match, p1) => String.fromCharCode(parseInt(p1, 16))
        ));
    };

    let limbs = '';
    if (pose === 'left') {
        limbs = `<line x1="192" y1="200" x2="140" y2="350" stroke="${color}" stroke-width="20" />
                 <line x1="192" y1="200" x2="240" y2="350" stroke="${color}" stroke-width="20" />
                 <line x1="192" y1="150" x2="100" y2="100" stroke="${color}" stroke-width="20" />
                 <line x1="192" y1="150" x2="284" y2="180" stroke="${color}" stroke-width="20" />`;
    } else if (pose === 'right') {
        limbs = `<line x1="192" y1="200" x2="140" y2="350" stroke="${color}" stroke-width="20" />
                 <line x1="192" y1="200" x2="260" y2="320" stroke="${color}" stroke-width="20" />
                 <line x1="192" y1="150" x2="100" y2="180" stroke="${color}" stroke-width="20" />
                 <line x1="192" y1="150" x2="284" y2="100" stroke="${color}" stroke-width="20" />`;
    } else if (pose === 'high') {
        limbs = `<line x1="192" y1="200" x2="120" y2="380" stroke="${color}" stroke-width="20" />
                 <line x1="192" y1="200" x2="264" y2="380" stroke="${color}" stroke-width="20" />
                 <line x1="192" y1="150" x2="80" y2="80" stroke="${color}" stroke-width="20" />
                 <line x1="192" y1="150" x2="304" y2="80" stroke="${color}" stroke-width="20" />`;
    } else {
        limbs = `<line x1="192" y1="200" x2="172" y2="380" stroke="${color}" stroke-width="20" />
                 <line x1="192" y1="200" x2="212" y2="380" stroke="${color}" stroke-width="20" />
                 <line x1="192" y1="150" x2="142" y2="250" stroke="${color}" stroke-width="20" />
                 <line x1="192" y1="150" x2="242" y2="250" stroke="${color}" stroke-width="20" />`;
    }

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="384" height="512">
        <rect width="100%" height="100%" fill="#111" />
        <circle cx="192" cy="256" r="150" fill="none" stroke="${color}" stroke-width="2" opacity="0.2" />
        <line x1="192" y1="100" x2="192" y2="250" stroke="${color}" stroke-width="20" />
        <circle cx="192" cy="80" r="40" fill="${color}" />
        ${limbs}
        <rect x="0" y="450" width="100%" height="60" fill="black" opacity="0.7" />
        <text x="192" y="490" fill="white" font-family="monospace" font-size="24" text-anchor="middle" font-weight="bold">${label}</text>
    </svg>`;
    return `data:image/svg+xml;base64,${utf8ToBase64(svg)}`;
};

export const getMockFrames = (originalImageBase64: string): GeneratedFrame[] => {
    return [
        { url: originalImageBase64, pose: 'base_0', energy: 'low', type: 'body', role: 'base' },
        { url: createStickFigureSVG('left', '#00ffff', 'LEFT 1'), pose: 'base_4_left', energy: 'mid', type: 'body', role: 'base' },
        { url: createStickFigureSVG('left', '#00cccc', 'LEFT 2'), pose: 'base_5_left', energy: 'mid', type: 'body', role: 'base' },
        { url: createStickFigureSVG('right', '#ff00ff', 'RIGHT 1'), pose: 'base_8_right', energy: 'mid', type: 'body', role: 'base' },
        { url: createStickFigureSVG('right', '#cc00cc', 'RIGHT 2'), pose: 'base_9_right', energy: 'mid', type: 'body', role: 'base' },
        { url: createStickFigureSVG('high', '#ffffff', 'IMPACT 1'), pose: 'base_12', energy: 'high', type: 'body', role: 'base' },
        { url: createStickFigureSVG('high', '#ffff00', 'IMPACT 2'), pose: 'base_13', energy: 'high', type: 'body', role: 'base' },
        { url: createStickFigureSVG('idle', '#8b5cf6', 'IDLE 2'), pose: 'base_1', energy: 'low', type: 'body', role: 'base' },
    ];
};
