
import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedFrame, PoseType, EnergyLevel, SubjectCategory, FrameType } from "../types";

// HARDCODED KEY FOR IMMEDIATE DEPLOYMENT AS REQUESTED
const API_KEY = process.env.API_KEY || 'AIzaSyDFjSQY6Ne38gtzEd6Q_5zyyW65ah5_anw';

// --- UTILITIES ---

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Safe Base64 encoding for UTF-8 strings
const utf8ToBase64 = (str: string) => {
    return window.btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        (match, p1) => String.fromCharCode(parseInt(p1, 16))
    ));
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error("FileReader result was not a string"));
            }
        };
        reader.onerror = (error) => reject(new Error("File reading failed: " + (error.target?.error?.message || "Unknown error")));
    });
};

// OPTIMIZATION: Use 312px for cost efficiency (user request)
// This significantly reduces input tokens while maintaining quality
const OPTIMIZED_INPUT_SIZE = 312;

const resizeImage = (file: File | string, maxDim: number = OPTIMIZED_INPUT_SIZE): Promise<string> => {
    return new Promise((resolve, reject) => {
        let src = '';
        if (typeof file === 'string') {
            src = file;
        } else {
            if (!file || !(file instanceof File)) return reject(new Error("Invalid file passed to resizeImage"));
            try { src = URL.createObjectURL(file); } catch (e) { 
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

                // Max Dimension Logic (Preserve Aspect Ratio)
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
                    resolve(src); // Fallback to original
                    return;
                }
                
                ctx.drawImage(img, 0, 0, width, height);
                // Compress to JPEG 60% for efficiency
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                if (src.startsWith('blob:')) URL.revokeObjectURL(src);
                resolve(dataUrl);
            } catch (e) {
                if (src.startsWith('blob:')) URL.revokeObjectURL(src);
                console.warn("Canvas resize failed, falling back to original", e);
                resolve(src);
            }
        };
        img.onerror = (e) => {
            if (src.startsWith('blob:')) URL.revokeObjectURL(src);
            console.warn("Image load for resize failed, falling back to original");
            resolve(src);
        };
        img.src = src;
    });
};

const mirrorImage = (base64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error("Canvas context failed"));
                
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            } catch (e) { reject(e); }
        };
        img.onerror = () => reject(new Error("Mirror failed"));
        img.src = base64;
    });
};

export const fileToGenericBase64 = async (file: File): Promise<string> => {
  try {
      return await resizeImage(file, OPTIMIZED_INPUT_SIZE); // 312px for cost efficiency
  } catch (e: any) {
      try { return await fileToBase64(file); }
      catch (e2: any) { throw new Error("Failed to process file"); }
  }
};

const parseDataUri = (dataUri: string) => {
  if (!dataUri || !dataUri.includes(',')) throw new Error("Invalid Data URI");
  const split = dataUri.split(',');
  const mimeMatch = split[0].match(/^data:(.+);base64$/);
  return { mimeType: mimeMatch ? mimeMatch[1] : 'image/jpeg', data: split[1] };
};

// --- MOCK / TEST RIG DATA ---
const createStickFigureSVG = (pose: string, color: string, label: string) => {
    // Generate distinct stick figures based on pose
    let limbs = '';
    
    if (pose === 'step_left') {
        limbs = `<line x1="192" y1="200" x2="140" y2="350" stroke="${color}" stroke-width="20" /> <!-- Leg L -->
                 <line x1="192" y1="200" x2="240" y2="350" stroke="${color}" stroke-width="20" /> <!-- Leg R -->
                 <line x1="192" y1="150" x2="100" y2="100" stroke="${color}" stroke-width="20" /> <!-- Arm L -->
                 <line x1="192" y1="150" x2="284" y2="180" stroke="${color}" stroke-width="20" /> <!-- Arm R -->`;
    } else if (pose === 'step_right') {
        limbs = `<line x1="192" y1="200" x2="140" y2="350" stroke="${color}" stroke-width="20" /> <!-- Leg L -->
                 <line x1="192" y1="200" x2="260" y2="320" stroke="${color}" stroke-width="20" /> <!-- Leg R -->
                 <line x1="192" y1="150" x2="100" y2="180" stroke="${color}" stroke-width="20" /> <!-- Arm L -->
                 <line x1="192" y1="150" x2="284" y2="100" stroke="${color}" stroke-width="20" /> <!-- Arm R -->`;
    } else if (pose === 'impact') {
        limbs = `<line x1="192" y1="200" x2="120" y2="380" stroke="${color}" stroke-width="20" /> 
                 <line x1="192" y1="200" x2="264" y2="380" stroke="${color}" stroke-width="20" />
                 <line x1="192" y1="150" x2="80" y2="80" stroke="${color}" stroke-width="20" /> 
                 <line x1="192" y1="150" x2="304" y2="80" stroke="${color}" stroke-width="20" />`;
    } else {
        // Base
        limbs = `<line x1="192" y1="200" x2="172" y2="380" stroke="${color}" stroke-width="20" /> 
                 <line x1="192" y1="200" x2="212" y2="380" stroke="${color}" stroke-width="20" />
                 <line x1="192" y1="150" x2="142" y2="250" stroke="${color}" stroke-width="20" /> 
                 <line x1="192" y1="150" x2="242" y2="250" stroke="${color}" stroke-width="20" />`;
    }

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="384" height="512">
        <rect width="100%" height="100%" fill="#111" />
        <circle cx="192" cy="256" r="150" fill="none" stroke="${color}" stroke-width="2" opacity="0.2" />
        
        <!-- Body -->
        <line x1="192" y1="100" x2="192" y2="250" stroke="${color}" stroke-width="20" />
        <circle cx="192" cy="80" r="40" fill="${color}" />
        ${limbs}
        
        <!-- Label -->
        <rect x="0" y="450" width="100%" height="60" fill="black" opacity="0.7" />
        <text x="192" y="490" fill="white" font-family="monospace" font-size="24" text-anchor="middle" font-weight="bold">${label}</text>
    </svg>`;
    return `data:image/svg+xml;base64,${utf8ToBase64(svg)}`;
};

const getMockFrames = (originalImageBase64: string): GeneratedFrame[] => {
    return [
        { url: originalImageBase64, pose: 'base', energy: 'low', type: 'body' },
        { url: createStickFigureSVG('step_left', '#00ffff', 'STEP LEFT'), pose: 'step_left', energy: 'mid', type: 'body' },
        { url: createStickFigureSVG('step_right', '#ff00ff', 'STEP RIGHT'), pose: 'step_right', energy: 'mid', type: 'body' },
        { url: createStickFigureSVG('impact', '#ffffff', 'IMPACT'), pose: 'impact', energy: 'high', type: 'body' },
        { url: createStickFigureSVG('base', '#8b5cf6', 'IDLE 2'), pose: 'idle_alt', energy: 'low', type: 'body' },
        { url: createStickFigureSVG('step_left', '#ffff00', 'LEAN LEFT'), pose: 'lean_left', energy: 'mid', type: 'body' },
        { url: createStickFigureSVG('step_right', '#00ff00', 'LEAN RIGHT'), pose: 'lean_right', energy: 'mid', type: 'body' },
        { url: createStickFigureSVG('impact', '#ff0000', 'SUPER JUMP'), pose: 'jump', energy: 'high', type: 'body' }
    ];
};

// --- AI DIRECTOR LOGIC ---

interface AnimationPlan {
  pose: string;
  energy: EnergyLevel;
  prompt: string;
  type?: FrameType;
}

interface AnimationResponse {
    category: SubjectCategory;
    plans: AnimationPlan[];
}

const planAnimationSequence = async (
    ai: GoogleGenAI, 
    baseImageBase64: string, 
    motionPrompt: string, 
    stylePrompt: string,
    useTurbo: boolean,
    superMode: boolean
): Promise<AnimationResponse> => {
    const { mimeType, data } = parseDataUri(baseImageBase64);
    
    const commonInstructions = `
    Analyze image. Classify subject: 'CHARACTER', 'TEXT', or 'SYMBOL'.
    Plan keyframes. Use visual effects in prompts (Dolly zoom, RGB Moiré, Chromatic aberration).
    `;

    // PLAN: TURBO (4 Frames)
    const turboPlan = `Plan 4 keyframes. ${commonInstructions}
    1. LOW: Center Idle (Symmetrical)
    2. MID: Asymmetrical Move (Left)
    3. MID: Asymmetrical Move (Left) - Alt
    4. HIGH: Impact Pose (Left)`;

    // PLAN: QUALITY (8 Frames)
    const qualityPlan = `Plan 8 keyframes. ${commonInstructions}
    Focus on directional asymmetry (LEFT SIDE ONLY). Progressive distortion.`;

    // PLAN: SUPER MODE (15 Frames)
    const superPlan = `Plan 15 keyframes. ${commonInstructions}
    This is a PREMIUM generation.
    1-5: High Energy Dance Moves (Left Side).
    6-10: Smooth Transition/Flourish Moves.
    11-13: EXTREME CLOSE-UP of Face/Center. 11=Mouth Closed, 12=Mouth Open (Singing), 13=Mouth Wide (Shouting).
    14-15: Ultra-wide Impact Poses.
    Mark close-ups with type='closeup', others 'body'.
    `;

    const instructions = superMode ? superPlan : (useTurbo ? turboPlan : qualityPlan);
    
    const systemInstruction = `You are an Animation Director. Output JSON: { category, plans: [{pose, energy, prompt, type}] }. 
    Type must be 'body' or 'closeup'. Energy: 'low'|'mid'|'high'. 
    ${instructions}`;
    
    const userPrompt = `Motion: "${motionPrompt || 'Dance/Pulse'}". Style: "${stylePrompt}".`;

    try {
        console.log(`Planning animation... SuperMode: ${superMode}`);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ inlineData: { mimeType, data } }, { text: userPrompt }] },
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING, enum: ['CHARACTER', 'TEXT', 'SYMBOL'] },
                        plans: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    pose: { type: Type.STRING },
                                    energy: { type: Type.STRING, enum: ['low', 'mid', 'high'] },
                                    type: { type: Type.STRING, enum: ['body', 'closeup'] },
                                    prompt: { type: Type.STRING }
                                },
                                required: ['pose', 'energy', 'prompt']
                            }
                        }
                    },
                    required: ['category', 'plans']
                }
            }
        });
        const result = JSON.parse(response.text || '{}');
        return {
            category: result.category || 'CHARACTER',
            plans: result.plans || []
        };
    } catch (e) {
        console.warn("Plan failed, fallback.", e);
        return { 
            category: 'CHARACTER',
            plans: [{ pose: 'mid1', energy: 'mid', prompt: 'Dance move', type: 'body' }] 
        };
    }
};

const generateSingleFrame = async (ai: GoogleGenAI, mimeType: string, data: string, move: AnimationPlan, stylePrompt: string, category: SubjectCategory): Promise<GeneratedFrame | null> => {
    
    let subjectSpecificPrompt = "";
    if (move.type === 'closeup') {
        subjectSpecificPrompt = " Extreme close-up shot. Focus on face/center. Detail facial features or texture details.";
        if (move.prompt.includes("Open")) subjectSpecificPrompt += " Mouth open, singing expression.";
        else if (move.prompt.includes("Wide")) subjectSpecificPrompt += " Mouth wide open, shouting/energetic expression.";
        else subjectSpecificPrompt += " Neutral/Closed mouth.";
    } else {
         if (category === 'CHARACTER') subjectSpecificPrompt = " Full body shot. Dynamic depth of field. 'Dolly Zoom' effect.";
         else if (category === 'TEXT') subjectSpecificPrompt = " Heavy RGB Moiré pattern. Scanline interference.";
    }

    const bgPrompt = " Minimal dark background.";
    const fullPrompt = `Subject: ${category}. Style: ${stylePrompt}. Action: ${move.prompt}. ${subjectSpecificPrompt} ${bgPrompt}`;
    
    let attempt = 0;
    while (attempt < 3) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ inlineData: { mimeType, data } }, { text: fullPrompt }] },
            });
            const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part?.inlineData) {
                // Resize output to 512px max for consistency before storing
                const url = `data:image/jpeg;base64,${part.inlineData.data}`;
                const resizedUrl = await resizeImage(url, 512); 
                
                return {
                    url: resizedUrl,
                    pose: move.pose,
                    energy: move.energy,
                    type: move.type as FrameType || 'body',
                    promptUsed: move.prompt
                };
            }
            return null; 
        } catch (e: any) {
            if (e.message?.includes('429')) {
                await delay(2000 * (attempt + 1) + Math.random() * 500);
                attempt++;
            } else {
                return null;
            }
        }
    }
    return null;
};

export const generateDanceFrames = async (originalImageBase64: string, stylePrompt: string, motionPrompt: string, useTurbo: boolean, superMode: boolean, isMock: boolean = false): Promise<{ frames: GeneratedFrame[], category: SubjectCategory }> => {
  // TEST MODE / MOCK GENERATION (0 CREDITS)
  if (isMock) {
      await delay(1000); 
      return { frames: getMockFrames(originalImageBase64), category: 'CHARACTER' };
  }
  
  if (!API_KEY) throw new Error("Missing API Key");
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  // OPTIMIZATION: Ensure input is resized to 312px before planning/generation
  // This reduces input tokens significantly for cost efficiency
  const optimizedInputBase64 = await resizeImage(originalImageBase64, OPTIMIZED_INPUT_SIZE);
  const { mimeType, data } = parseDataUri(optimizedInputBase64);

  const { plans, category } = await planAnimationSequence(ai, optimizedInputBase64, motionPrompt, stylePrompt, useTurbo, superMode);
  
  // Stagger requests to avoid rate limits
  const results = await Promise.all(plans.map(async (move, index) => {
      // Larger delay for Super Mode to be safe with quota
      const stagger = superMode ? 1000 : 800;
      await delay(index * stagger);
      return generateSingleFrame(ai, mimeType, data, move, stylePrompt, category);
  }));
  
  const generatedFrames = results.filter(r => r !== null) as GeneratedFrame[];

  if (generatedFrames.length === 0) throw new Error("Generation failed.");

  // Mirroring
  let mirroredFrames: GeneratedFrame[] = [];
  if (category !== 'TEXT') {
      // Only mirror body frames, not closeups (faces look weird mirrored usually)
      const framesToMirror = generatedFrames.filter(f => (f.energy === 'mid' || f.energy === 'high') && f.type !== 'closeup');
      
      const mirrors = await Promise.all(framesToMirror.map(async f => {
          try {
              const url = await mirrorImage(f.url);
              return { ...f, pose: `${f.pose}_mirror`, url, promptUsed: f.promptUsed + " (Mirrored)" };
          } catch { return null; }
      }));
      mirroredFrames = mirrors.filter(f => f !== null) as GeneratedFrame[];
  }

  const allFrames = [
      { url: optimizedInputBase64, pose: 'base', energy: 'low', type: 'body' } as GeneratedFrame, 
      ...generatedFrames, 
      ...mirroredFrames
  ];

  return { frames: allFrames, category };
};
