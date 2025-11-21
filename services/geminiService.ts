
import { GoogleGenAI, Modality } from "@google/genai";
import { AnalysisResult, ReferenceAsset } from "../types";

const getAiClient = () => {
  // 1. Check for manual key stored in browser (User Input)
  const manualKey = localStorage.getItem('qs_api_key');
  
  // 2. Check for environment variable (Safe replacement by Vite)
  // If not defined in vite.config.ts, this string remains empty, it won't crash.
  const envKey = process.env.API_KEY; 

  const finalKey = manualKey || envKey;

  if (!finalKey) {
    throw new Error("API Key is missing. Please click the Settings icon and enter your Google Gemini API Key.");
  }

  return new GoogleGenAI({ apiKey: finalKey });
};

export const analyzeImageIdentity = async (assets: ReferenceAsset[], mimeType: string = 'image/jpeg'): Promise<AnalysisResult> => {
  const ai = getAiClient();
  const model = 'gemini-2.5-flash';

  // Prepare image parts for all assets
  const imageParts = assets.map(asset => ({
    inlineData: { 
      mimeType: mimeType, 
      data: asset.croppedBase64.split(',')[1] 
    }
  }));

  const isMultiShot = assets.length > 1;

  const prompt = `
    You are a Forensic Identity & Photography Specialist. 
    I have provided ${assets.length} reference image(s) of the SAME person.
    
    ${isMultiShot ? 'Your task is to synthesize a composite identity profile by finding consistency across these photos.' : 'Your task is to analyze this specific image identity.'}

    Analyze these layers with extreme precision:

    1. **BIOMETRIC IDENTITY (The Face)**:
       - Focus primarily on the FIRST image for the core facial structure.
       - Exact face shape, jawline, skin texture, eye shape/color, nose, and mouth.
       - ${isMultiShot ? 'Check if hair style varies across photos. If so, describe the most common or defining style.' : 'Describe hair texture and style.'}
       
    2. **FACIAL EXPRESSION & MICRO-HABITS**:
       - ${isMultiShot ? 'Identify RECURRING habits. Does the subject always tilt their head? Do they squint? Do they smile with teeth or without?' : 'Describe the specific facial muscle habits.'}
       - Capture the "Vibe" (e.g., "Cool and stoic", "Bubbly and chaotic").
       
    3. **PHOTOGRAPHIC STYLE & ANGLES**:
       - ${isMultiShot ? 'What is their "Signature Angle"? (e.g., "Prefers left side profile", "Always high angle selfie").' : 'Analyze camera angle and lens type.'}
       
    4. **OUTFIT (Style DNA)**:
       - ${isMultiShot ? 'Synthesize their fashion sense based on all images. (e.g., "Streetwear aesthetic with heavy accessories").' : 'List visible clothing materials and colors.'}
       
    5. **ENVIRONMENT**:
       - Estimate the typical location context or vibe they seem to inhabit.

    Output valid JSON:
    {
      "description": "Comprehensive biometric description.",
      "outfit": "Detailed outfit or fashion style analysis.",
      "environment": "Context description.",
      "photographicStyle": "Camera angle habits and posing style.",
      "detectedGender": "Male/Female/Non-binary",
      "keyFeatures": ["feature 1", "feature 2", "expression feature"],
      "vibeAnalysis": "A summary of the personality projected across the images.",
      "consistencyNotes": "What features are 100% consistent across all reference images?"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          ...imageParts,
          { text: prompt }
        ]
      },
      config: {
        temperature: 0.1,
        responseMimeType: "application/json", 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text.trim()) as AnalysisResult;
  } catch (error: any) {
    console.error("Analysis failed:", error);
    // Re-throw with a user-friendly message if it's likely an API key issue
    if (error.message && (error.message.includes('API key') || error.message.includes('403') || error.message.includes('400'))) {
       throw new Error("API Key Invalid or Missing. Please check Settings.");
    }
    throw error;
  }
};

export const generateCharacterImage = async (
  analysis: AnalysisResult,
  posePrompt: string,
  primaryReferenceBase64: string, 
  mimeType: string = 'image/jpeg'
): Promise<string> => {
  const ai = getAiClient();
  const model = 'gemini-2.5-flash-image'; 
  
  const fullPrompt = `
    Task: Generate a PHOTO-REALISTIC image of the person in the provided reference image.
    
    CRITICAL IDENTITY & STYLE INSTRUCTION:
    - The output MUST look exactly like the person in the reference image.
    - **FACE & EXPRESSION**: ${analysis.description}.
    - **CONSISTENT HABITS**: ${analysis.consistencyNotes || 'Maintain facial consistency.'}
    - **VIBE**: ${analysis.vibeAnalysis || 'Natural and candid.'}
    - **EXPRESSION MATCHING**: Capture the specific vibe: ${analysis.keyFeatures.join(', ')}.
    - **CAMERA ANGLE/STYLE**: ${analysis.photographicStyle}.
    - **OUTFIT**: ${analysis.outfit}.
    - **BACKGROUND**: ${analysis.environment}.
    
    SCENARIO:
    ${posePrompt}
    
    STYLE:
    - "Friend POV" or "Selfie" (depending on reference style).
    - Shot on iPhone/Pixel. 
    - Realistic skin texture, not smooth. 
    - Slight motion blur or focus imperfections are good.
    - NO AI GLOSS. Make it look like a raw camera roll photo.
  `;

  try {
    // We treat the Primary Image as the 'Identity Anchor' for the image generation model
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: primaryReferenceBase64 } },
          { text: fullPrompt }
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE],
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image generated");

  } catch (error: any) {
    console.error("Generation failed:", error);
     if (error.message && (error.message.includes('API key') || error.message.includes('403'))) {
       throw new Error("API Key Invalid or Missing. Please check Settings.");
    }
    throw new Error("Failed to generate image.");
  }
};
