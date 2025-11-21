
export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  scenario: string;
  timestamp: number;
}

export interface ReferenceAsset {
  id: string;
  croppedBase64: string; // The face crop used for analysis
  originalBase64: string; // The full image used for generation reference
  timestamp: number;
  isPrimary: boolean;
}

export interface AlbumSession {
  id: string;
  timestamp: number;
  images: GeneratedImage[];
  referenceAssets: ReferenceAsset[]; // Updated from single string
  analysisSummary: string;
  sourceImageStub?: string;
}

export interface AnalysisResult {
  description: string; // Physical features
  outfit: string;      // Clothes description
  environment: string; // Background & Lighting description
  photographicStyle: string; // Camera angles, lens type, selfie vs portrait
  detectedGender: string;
  keyFeatures: string[];
  vibeAnalysis?: string; // New: Analysis of the overall vibe across multiple photos
  consistencyNotes?: string; // New: What stays the same across photos?
  ethnicityEstimate?: string;
}

export enum AppState {
  IDLE = 'IDLE',
  CROPPING = 'CROPPING',
  ANALYZING = 'ANALYZING',
  READY_TO_GENERATE = 'READY_TO_GENERATE',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}