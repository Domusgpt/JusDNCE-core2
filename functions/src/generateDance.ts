/**
 * jusDNCE AI - Secure Gemini API Callable Function
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 */

import { https } from "firebase-functions/v2";
import { GoogleGenAI, Type } from "@google/genai";
import { defineSecret } from "firebase-functions/params";
import { verifyAuth } from "./middleware/auth";
import { checkRateLimit } from "./middleware/rateLimit";
import { checkAndDeductCredits } from "./utils/credits";
import { logInfo, logError } from "./utils/logger";
import {
  GenerateDanceRequest,
  GenerateDanceResponse,
  GeneratedFrame,
} from "./types";

// Secret definition - will be loaded from Secret Manager
const geminiApiKey = defineSecret("GEMINI_API_KEY");

type SubjectCategory = "CHARACTER" | "TEXT" | "SYMBOL";
type EnergyLevel = "low" | "mid" | "high";

interface AnimationPlan {
  pose: string;
  energy: EnergyLevel;
  prompt: string;
}

interface AnimationResponse {
  category: SubjectCategory;
  plans: AnimationPlan[];
}

/**
 * Parse data URI to extract mime type and base64 data
 */
function parseDataUri(dataUri: string): { mimeType: string; data: string } {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new https.HttpsError("invalid-argument", "Invalid image data URI");
  }
  return { mimeType: match[1], data: match[2] };
}

/**
 * Plan animation sequence using Gemini AI
 */
async function planAnimationSequence(
  ai: GoogleGenAI,
  baseImageBase64: string,
  motionPrompt: string,
  stylePrompt: string,
  isTurbo: boolean
): Promise<AnimationResponse> {
  const { mimeType, data } = parseDataUri(baseImageBase64);

  const turboInstructions = `Plan 4 distinct keyframes.
    1. LOW: Center Idle (Symmetrical)
    2. MID: Asymmetrical Move (Left)
    3. MID: Asymmetrical Move (Left)
    4. HIGH: Impact Pose (Left)`;

  const qualityInstructions = `Plan 8 keyframes.
    Low: 2 Frames. Mid: 4 Frames. High: 2 Frames. Focus on directional asymmetry (LEFT SIDE ONLY).`;

  const systemInstruction = `You are an Animation Director.
    First, analyze the image and classify the subject into one of these categories:
    - 'CHARACTER': A person, animal, robot, or creature with limbs.
    - 'TEXT': Words, typography, logos with text.
    - 'SYMBOL': Abstract shapes, icons, objects without faces or text.

    Then plan keyframes based on the detected CATEGORY:
    - IF CHARACTER: Focus on body language, dancing, jumping, kicking.
      Prompts: "Hair whip left", "Superhero landing left", "High kick left".
    - IF TEXT: Focus on distortion, effects, and pulse. Do NOT rotate or flip text.
      Prompts: "Wind shear effect", "Neon pulse", "Liquid melt dripping", "Chromatic aberration shift", "3D Extrusion forward".
    - IF SYMBOL: Focus on geometry and energy.
      Prompts: "Rapid spin left", "Energy flare", "Geometric expansion", "Glowing aura pulse".

    ${isTurbo ? turboInstructions : qualityInstructions}
    Output JSON object: { category, plans: [{pose, energy, prompt}] }.`;

  const userPrompt = `Motion: "${motionPrompt || "Dance/Pulse"}". Style: "${stylePrompt}".`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ inlineData: { mimeType, data } }, { text: userPrompt }] },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, enum: ["CHARACTER", "TEXT", "SYMBOL"] },
            plans: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  pose: { type: Type.STRING },
                  energy: { type: Type.STRING, enum: ["low", "mid", "high"] },
                  prompt: { type: Type.STRING },
                },
                required: ["pose", "energy", "prompt"],
              },
            },
          },
          required: ["category", "plans"],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini");
    }
    const result = JSON.parse(responseText);
    return result as AnimationResponse;
  } catch (error: any) {
    logError("Animation planning failed", error);
    throw new https.HttpsError("internal", "Failed to plan animation sequence");
  }
}

/**
 * Generate a single frame using Gemini
 */
async function generateSingleFrame(
  ai: GoogleGenAI,
  mimeType: string,
  data: string,
  move: AnimationPlan,
  stylePrompt: string,
  motionPrompt: string,
  category: SubjectCategory
): Promise<GeneratedFrame | null> {
  let categorySpecificPrompt = "";
  switch (category) {
    case "CHARACTER":
      categorySpecificPrompt = `The subject is a PERSON or CHARACTER. Apply the pose transformation naturally to the body. `;
      break;
    case "TEXT":
      categorySpecificPrompt = `The subject is TEXT or TYPOGRAPHY. Apply visual effects WITHOUT rotating or flipping the text. `;
      break;
    case "SYMBOL":
      categorySpecificPrompt = `The subject is a SYMBOL or ABSTRACT SHAPE. Apply geometric transformations and energy effects. `;
      break;
  }

  // Add expressive face prompt for characters
  let facePrompt = "";
  if (category === "CHARACTER") {
    facePrompt = " Make the facial expression fun, dynamic, and expressive.";
  }

  const fullPrompt = `${categorySpecificPrompt}Style: ${stylePrompt}. Action: ${move.prompt}.${facePrompt} Keep identity/face/clothes/font/design IDENTICAL to source.`;

  try {
    // Use gemini-2.5-flash-image model for image generation (no responseMimeType needed)
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ inlineData: { mimeType, data } }, { text: fullPrompt }],
      },
    });

    // Find the part with image data
    const part = response.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData
    );

    if (part?.inlineData?.data) {
      return {
        imageData: `data:image/jpeg;base64,${part.inlineData.data}`,
        timestamp: Date.now(),
        category: move.energy,
      };
    }
  } catch (error: any) {
    logError(`Frame generation failed for ${move.pose}`, error);
  }

  return null;
}

/**
 * Firebase Callable Function: Generate Dance Frames
 * Secured with authentication, rate limiting, and credit checks
 */
export const generateDanceFrames = https.onCall<
  GenerateDanceRequest,
  Promise<GenerateDanceResponse>
>(
  {
    secrets: [geminiApiKey],
    region: "us-central1",
    timeoutSeconds: 540, // 9 minutes (Gemini can take time)
    memory: "512MiB",
  },
  async (request): Promise<GenerateDanceResponse> => {
    try {
      // 1. Verify authentication
      const uid = await verifyAuth(request);
      logInfo("Generation request started", { uid });

      // 2. Check rate limit
      await checkRateLimit(uid);

      // 3. Check and deduct credits (1 credit per generation)
      const creditsRemaining = await checkAndDeductCredits(uid, 1);
      logInfo("Credit deducted", { uid, creditsRemaining });

      // 4. Validate input
      const { imageBase64, stylePrompt, motionPrompt, useTurbo } = request.data;

      if (!imageBase64) {
        throw new https.HttpsError("invalid-argument", "Image data is required");
      }

      // 5. Get Gemini API key from Secret Manager
      const apiKey = geminiApiKey.value();
      if (!apiKey) {
        throw new https.HttpsError("internal", "API key not configured");
      }

      // 6. Initialize Gemini AI
      const ai = new GoogleGenAI({ apiKey });
      const { mimeType, data } = parseDataUri(imageBase64);

      // 7. Plan animation sequence
      const { plans, category } = await planAnimationSequence(
        ai,
        imageBase64,
        motionPrompt,
        stylePrompt,
        useTurbo
      );

      logInfo("Animation planned", { uid, category, frameCount: plans.length });

      // 8. Generate frames in parallel
      const results = await Promise.all(
        plans.map((move) =>
          generateSingleFrame(ai, mimeType, data, move, stylePrompt, motionPrompt, category)
        )
      );

      const generatedFrames = results.filter((r) => r !== null) as GeneratedFrame[];

      if (generatedFrames.length === 0) {
        throw new https.HttpsError(
          "internal",
          "Frame generation failed. Please try again."
        );
      }

      // 9. Add original image as base frame
      const allFrames: GeneratedFrame[] = [
        {
          imageData: imageBase64,
          timestamp: Date.now(),
          category: "base",
        },
        ...generatedFrames,
      ];

      logInfo("Generation complete", {
        uid,
        totalFrames: allFrames.length,
        creditsRemaining,
      });

      return {
        frames: allFrames,
        category,
        creditsRemaining,
      };
    } catch (error: any) {
      if (error instanceof https.HttpsError) {
        throw error;
      }

      logError("Unexpected error in generateDanceFrames", error, {
        uid: request.auth?.uid,
      });

      throw new https.HttpsError(
        "internal",
        "An unexpected error occurred during generation"
      );
    }
  }
);
