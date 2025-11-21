
export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  scenario: string;
  timestamp: number;
}

export interface ReferenceImage {
  id: string;
  original: string; // Base64 full image
  crop: string;     // Base64 cropped face
  timestamp: number;
}

export interface AlbumSession {
  id: string;
  timestamp: number;
  images: GeneratedImage[];
  referenceDeck: ReferenceImage[]; // Now stores multiple sources
  analysisSummary: string;
}

export interface AnalysisResult {
  description: string; // Physical features
  outfit: string;      // Clothes description
  environment: string; // Background & Lighting description
  photographicStyle: string; // Camera angles, lens type, selfie vs portrait
  detectedGender: string;
  keyFeatures: string[];
  ethnicityEstimate?: string;
  compositeScore?: number; // How consistent the images are
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
