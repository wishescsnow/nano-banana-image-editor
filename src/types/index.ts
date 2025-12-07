export interface Asset {
  id: string;
  type: 'original' | 'mask' | 'output';
  url: string;
  mime: string;
  width: number;
  height: number;
  checksum: string;
}

export interface Generation {
  id: string;
  prompt: string;
  parameters: {
    aspectRatio?: AspectRatio;
    resolutionTier?: ResolutionTier;
    width?: number;
    height?: number;
    seed?: number;
    temperature?: number;
    variantCount?: number;
  };
  sourceAssets: Asset[];
  outputAssets: Asset[];
  modelVersion: string;
  timestamp: number;
  costEstimate?: number;
}

export interface Edit {
  id: string;
  parentGenerationId: string;
  maskAssetId?: string;
  maskReferenceAsset?: Asset;
  instruction: string;
  outputAssets: Asset[];
  timestamp: number;
}

export interface Project {
  id: string;
  title: string;
  generations: Generation[];
  edits: Edit[];
  createdAt: number;
  updatedAt: number;
}

export interface SegmentationMask {
  id: string;
  imageData: ImageData;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  feather: number;
}

export interface BrushStroke {
  id: string;
  points: number[];
  brushSize: number;
  color: string;
}

export interface PromptHint {
  category: 'subject' | 'scene' | 'action' | 'style' | 'camera';
  text: string;
  example: string;
}

export interface BatchQueueRequest {
  id: string;
  type: 'generate' | 'edit';
  prompt: string;
  aspectRatio?: AspectRatio;
  resolutionTier?: ResolutionTier;
  referenceImages?: string[];
  originalImage?: string;
  maskImage?: string;
  temperature?: number;
  seed?: number;
   variantCount?: number;
  batchJobName?: string; // Gemini batch job name after submission
  status: 'pending' | 'submitted' | 'succeeded' | 'failed';
  resultImages?: string[];
  createdAt: number;
  submittedAt?: number;
  completedAt?: number;
  error?: string;
}

// Safety settings types
export type SafetyThreshold =
  | 'OFF'
  | 'BLOCK_NONE'
  | 'BLOCK_ONLY_HIGH'
  | 'BLOCK_MEDIUM_AND_ABOVE'
  | 'BLOCK_LOW_AND_ABOVE';

export type HarmCategory =
  | 'HARM_CATEGORY_HARASSMENT'
  | 'HARM_CATEGORY_HATE_SPEECH'
  | 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
  | 'HARM_CATEGORY_DANGEROUS_CONTENT'
  | 'HARM_CATEGORY_CIVIC_INTEGRITY';

export interface SafetySetting {
  category: HarmCategory;
  threshold: SafetyThreshold;
}

export type AspectRatio = 'auto' | '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9';

export type ResolutionTier = '1K' | '2K' | '4K';
