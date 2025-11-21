
import { GoogleGenAI, Modality } from "@google/genai";
import { AnalysisResult, ReferenceImage } from "../types";

const getAiClient = () => {
  // Check for manual key first, then environment variable
  const manualKey = localStorage.getItem('qs_api_key');
  
  // Safe access to process.env for browser environments (prevents "process is not defined" crash)
  let envKey = '';
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      // @ts-ignore
      envKey = process.env.API_KEY;
    }
  } catch (e) {
    // Ignore error if process is not defined
  }

  const finalKey = manualKey || envKey || '';
  
  if (!finalKey) {
    console.warn("No API Key found. Calls will likely fail.");
  }

  return new GoogleGenAI({ apiKey: finalKey });
};

// UPDATED: Handles both Single-Shot and Multi-Shot logic
export const analyzeImageIdentity = async (referenceDeck: ReferenceImage[]): Promise<AnalysisResult> => {
  const ai = getAiClient();
  const model = 'gemini-2.5-flash';
  const isSingle = referenceDeck.length === 1;

  // Prepare parts: We send the CROPPED faces for biometric analysis
  const imageParts = referenceDeck.map((ref) => ({
    inlineData: { mimeType: 'image/jpeg', data: ref.crop.split(',')[1] }
  }));

  // We also send the FULL images to analyze the "Vibe" and photography habits
  const contextParts = referenceDeck.map((ref) => ({
    inlineData: { mimeType: 'image/jpeg', data: ref.original.split(',')[1] }
  }));

  // DYNAMIC PROMPT: Adapts based on whether we have 1 image or multiple
  let prompt = '';

  if (isSingle) {
    // SINGLE SHOT PROMPT
    prompt = `
      You are a Forensic Identity & Photography Director.
      I have provided a SINGLE reference image of a person (both the cropped face and the full original context).

      YOUR TASK: Create a detailed BIOMETRIC & STYLE PROFILE based on this specific image.

      1. **BIOMETRICS (The Face)**:
         - Analyze the face shape, jawline, eye shape, and nose structure precisely.
         - Describe the skin texture and any visible features.
         
      2. **EXPRESSION & VIBE**:
         - What is the subject's expression in this photo? 
         - Is it candid, posed, serious, or playful?
         
      3. **PHOTOGRAPHIC STYLE**:
         - Analyze the lighting, angle, and camera type of this specific shot.
         - Example: "Mirror selfie," "Professional portrait," "Outdoor candid".
         
      4. **OUTFIT**:
         - Describe the visible clothing in detail.
         
      5. **ENVIRONMENT**:
         - Describe the background setting.

      Output valid JSON:
      {
        "description": "Detailed biometric description of the face.",
        "outfit": "Detailed description of the clothing.",
        "environment": "Description of background/setting.",
        "photographicStyle": "Camera angle, lighting style, and photo type.",
        "detectedGender": "Male/Female/Non-binary",
        "keyFeatures": ["specific feature 1", "expression details", "vibe"],
        "compositeScore": 100
      }
    `;
  } else {
    // MULTI SHOT COMPOSITE PROMPT
    prompt = `
      You are a Forensic Identity & Photography Director.
      I have provided ${referenceDeck.length} sets of images of the SAME person. 
      Some are cropped faces (for biometrics), some are full original photos (for context/vibe).
      
      YOUR TASK: Create a COMPOSITE PROFILE. Do not describe just one image. Find the CONSISTENT truth across all of them.

      1. **COMPOSITE BIOMETRICS (The Face - STRICT)**:
         - Analyze the face from the different angles provided.
         - Define the exact face shape, jawline, and eye shape that is consistent across all photos.
         
      2. **FACIAL MICRO-HABITS**:
         - Look at all images. Do they usually smile? Do they tilt their head?
         - Define the "Signature Expression" based on this collection.
         
      3. **PHOTOGRAPHIC HABITS (The Vibe)**:
         - What is the recurring photography style? (e.g., "Messy mirror selfies," "Flash photography").
         
      4. **OUTFIT STRATEGY**:
         - If outfits vary, describe the "Style Archetype" (e.g., "Streetwear minimalist").
         - If outfit is identical, describe it strictly.
         
      5. **ENVIRONMENT**:
         - Describe the common settings or general vibe found in these photos.

      Output valid JSON:
      {
        "description": "Comprehensive composite biometric description.",
        "outfit": "Outfit details or Style Archetype.",
        "environment": "Common environmental context.",
        "photographicStyle": "The subject's recurring photography habits and angles.",
        "detectedGender": "Male/Female/Non-binary",
        "keyFeatures": ["habit 1", "habit 2", "signature expression"],
        "compositeScore": 100
      }
    `;
  }

  try {
    const parts = [
      ...imageParts, // Prioritize face details
      ...contextParts.slice(0, 2), // Add context (limit to 2 max to save tokens, even if deck is larger)
      { text: prompt }
    ];

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        temperature: 0.1,
        responseMimeType: "application/json", 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text.trim()) as AnalysisResult;
  } catch (error) {
    console.error("Analysis failed:", error);
    throw new Error("Failed to analyze identity. Check API Key in settings.");
  }
};

export const generateCharacterImage = async (
  analysis: AnalysisResult,
  posePrompt: string,
  referenceDeck: ReferenceImage[]
): Promise<string> => {
  const ai = getAiClient();
  const model = 'gemini-2.5-flash-image'; 
  
  // Select reference images. If single shot, use just that one. 
  // If multi-shot, use up to 3 originals for context.
  const referenceParts = referenceDeck.slice(0, 3).map(ref => ({
    inlineData: { mimeType: 'image/jpeg', data: ref.original.split(',')[1] }
  }));

  const fullPrompt = `
    Task: Generate a PHOTO-REALISTIC image of the person in the provided reference images.
    
    CRITICAL INSTRUCTION:
    - I have provided ${referenceParts.length} reference photos of the subject. 
    - Use these to understand their Identity, Body Language, and Fashion Style.
    - **DO NOT** copy the exact pose of the reference. Create a NEW photo in their style.
    
    1. IDENTITY (STRICT):
    - Subject must look exactly like the person in the references.
    - **FACE DETAILS**: ${analysis.description}.
    - **SIGNATURE FEATURES**: ${analysis.keyFeatures.join(', ')}.
    
    2. PHOTOGRAPHY HABITS (The Vibe):
    - The user wants a photo that fits this person's habits: ${analysis.photographicStyle}.
    - If they usually take selfies, make it a selfie.
    
    3. SCENARIO (The Action):
    - ${posePrompt}
    
    4. ASSETS:
    - **OUTFIT**: ${analysis.outfit}.
    - **BACKGROUND**: ${analysis.environment}.
    
    STYLE:
    - "Friend POV" or "Selfie".
    - Shot on iPhone/Pixel. 
    - Realistic skin texture, imperfections, noise.
    - NO AI GLOSS. Raw camera roll aesthetic.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          ...referenceParts,
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

  } catch (error) {
    console.error("Generation failed:", error);
    throw new Error("Failed to generate image. Check API Key in settings.");
  }
};
