"use strict";
/**
 * jusDNCE AI - Secure Gemini API Callable Function
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDanceFrames = void 0;
const v2_1 = require("firebase-functions/v2");
const genai_1 = require("@google/genai");
const params_1 = require("firebase-functions/params");
const auth_1 = require("./middleware/auth");
const rateLimit_1 = require("./middleware/rateLimit");
const credits_1 = require("./utils/credits");
const logger_1 = require("./utils/logger");
// Secret definition - will be loaded from Secret Manager
const geminiApiKey = (0, params_1.defineSecret)("GEMINI_API_KEY");
/**
 * Parse data URI to extract mime type and base64 data
 */
function parseDataUri(dataUri) {
    const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
        throw new v2_1.https.HttpsError("invalid-argument", "Invalid image data URI");
    }
    return { mimeType: match[1], data: match[2] };
}
/**
 * Plan animation sequence using Gemini AI
 */
async function planAnimationSequence(ai, baseImageBase64, motionPrompt, stylePrompt, isTurbo) {
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
                    type: genai_1.Type.OBJECT,
                    properties: {
                        category: { type: genai_1.Type.STRING, enum: ["CHARACTER", "TEXT", "SYMBOL"] },
                        plans: {
                            type: genai_1.Type.ARRAY,
                            items: {
                                type: genai_1.Type.OBJECT,
                                properties: {
                                    pose: { type: genai_1.Type.STRING },
                                    energy: { type: genai_1.Type.STRING, enum: ["low", "mid", "high"] },
                                    prompt: { type: genai_1.Type.STRING },
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
        return result;
    }
    catch (error) {
        (0, logger_1.logError)("Animation planning failed", error);
        throw new v2_1.https.HttpsError("internal", "Failed to plan animation sequence");
    }
}
/**
 * Generate a single frame using Gemini
 */
async function generateSingleFrame(ai, mimeType, data, move, stylePrompt, motionPrompt, category) {
    var _a, _b, _c, _d, _e;
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
        const part = (_d = (_c = (_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d.find((p) => p.inlineData);
        if ((_e = part === null || part === void 0 ? void 0 : part.inlineData) === null || _e === void 0 ? void 0 : _e.data) {
            return {
                imageData: `data:image/jpeg;base64,${part.inlineData.data}`,
                timestamp: Date.now(),
                category: move.energy,
            };
        }
    }
    catch (error) {
        (0, logger_1.logError)(`Frame generation failed for ${move.pose}`, error);
    }
    return null;
}
/**
 * Firebase Callable Function: Generate Dance Frames
 * Secured with authentication, rate limiting, and credit checks
 */
exports.generateDanceFrames = v2_1.https.onCall({
    secrets: [geminiApiKey],
    region: "us-central1",
    timeoutSeconds: 540, // 9 minutes (Gemini can take time)
    memory: "512MiB",
}, async (request) => {
    var _a;
    try {
        // 1. Verify authentication
        const uid = await (0, auth_1.verifyAuth)(request);
        (0, logger_1.logInfo)("Generation request started", { uid });
        // 2. Check rate limit
        await (0, rateLimit_1.checkRateLimit)(uid);
        // 3. Check and deduct credits (1 credit per generation)
        const creditsRemaining = await (0, credits_1.checkAndDeductCredits)(uid, 1);
        (0, logger_1.logInfo)("Credit deducted", { uid, creditsRemaining });
        // 4. Validate input
        const { imageBase64, stylePrompt, motionPrompt, useTurbo } = request.data;
        if (!imageBase64) {
            throw new v2_1.https.HttpsError("invalid-argument", "Image data is required");
        }
        // 5. Get Gemini API key from Secret Manager
        const apiKey = geminiApiKey.value();
        if (!apiKey) {
            throw new v2_1.https.HttpsError("internal", "API key not configured");
        }
        // 6. Initialize Gemini AI
        const ai = new genai_1.GoogleGenAI({ apiKey });
        const { mimeType, data } = parseDataUri(imageBase64);
        // 7. Plan animation sequence
        const { plans, category } = await planAnimationSequence(ai, imageBase64, motionPrompt, stylePrompt, useTurbo);
        (0, logger_1.logInfo)("Animation planned", { uid, category, frameCount: plans.length });
        // 8. Generate frames in parallel
        const results = await Promise.all(plans.map((move) => generateSingleFrame(ai, mimeType, data, move, stylePrompt, motionPrompt, category)));
        const generatedFrames = results.filter((r) => r !== null);
        if (generatedFrames.length === 0) {
            throw new v2_1.https.HttpsError("internal", "Frame generation failed. Please try again.");
        }
        // 9. Add original image as base frame
        const allFrames = [
            {
                imageData: imageBase64,
                timestamp: Date.now(),
                category: "base",
            },
            ...generatedFrames,
        ];
        (0, logger_1.logInfo)("Generation complete", {
            uid,
            totalFrames: allFrames.length,
            creditsRemaining,
        });
        return {
            frames: allFrames,
            category,
            creditsRemaining,
        };
    }
    catch (error) {
        if (error instanceof v2_1.https.HttpsError) {
            throw error;
        }
        (0, logger_1.logError)("Unexpected error in generateDanceFrames", error, {
            uid: (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid,
        });
        throw new v2_1.https.HttpsError("internal", "An unexpected error occurred during generation");
    }
});
//# sourceMappingURL=generateDance.js.map