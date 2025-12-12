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
  videoGenerations: VideoGeneration[];
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

// Unified queue status for both image and video batch requests
export type QueueStatus = 'pending' | 'submitted' | 'processing' | 'succeeded' | 'failed';

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
  batchJobName?: string;
  status: QueueStatus;
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

// Video generation types
export type VideoModel =
  | 'veo-3.1-generate-preview'
  | 'veo-3.1-fast-generate-preview'
  | 'veo-3.0-generate-001'
  | 'veo-3.0-fast-generate-001';

export type VideoAspectRatio = '16:9' | '9:16';
export type VideoResolution = '720p' | '1080p';
export type VideoDuration = 4 | 6 | 8;

export interface VideoAsset {
  id: string;
  type: 'video_output';
  url: string;
  mimeType: string;
  width: number;
  height: number;
  duration: number;
  thumbnailUrl?: string;
  checksum: string;
}

export interface VideoGeneration {
  id: string;
  prompt: string;
  negativePrompt?: string;
  parameters: {
    aspectRatio?: VideoAspectRatio;
    resolution?: VideoResolution;
    durationSeconds?: VideoDuration;
    seed?: number;
  };
  startFrameAsset?: Asset;
  lastFrameAsset?: Asset;
  referenceAssets?: Asset[];
  sourceVideoAsset?: VideoAsset;
  outputAsset?: VideoAsset;
  modelVersion: string;
  timestamp: number;
}

export interface VideoBatchQueueRequest {
  id: string;
  type: 'video-generate' | 'video-extend';
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: VideoAspectRatio;
  resolution?: VideoResolution;
  durationSeconds?: VideoDuration;
  startFrameImage?: string;
  lastFrameImage?: string;
  referenceImages?: string[];
  sourceVideo?: string;
  seed?: number;
  operationName?: string;
  batchJobName?: string;
  status: QueueStatus;
  progressPercent?: number;
  resultVideo?: string;
  thumbnailUrl?: string;
  createdAt: number;
  submittedAt?: number;
  completedAt?: number;
  error?: string;
}

// API Request interfaces (shared between apiService and geminiService)
export interface GenerateRequest {
  prompt: string;
  referenceImages?: string[];
  temperature?: number;
  seed?: number;
  variantCount?: number;
  model?: string;
  safetySettings?: SafetySetting[];
  aspectRatio?: AspectRatio;
  resolutionTier?: ResolutionTier;
}

export interface EditRequest {
  instruction: string;
  originalImage: string;
  referenceImages?: string[];
  maskImage?: string;
  temperature?: number;
  seed?: number;
  variantCount?: number;
  model?: string;
  safetySettings?: SafetySetting[];
  aspectRatio?: AspectRatio;
  resolutionTier?: ResolutionTier;
}

export interface SegmentRequest {
  query: string;
  image?: string;
  maskImage?: string;
  temperature?: number;
  seed?: number;
  model?: string;
  safetySettings?: SafetySetting[];
  aspectRatio?: AspectRatio;
  resolutionTier?: ResolutionTier;
}

export interface SegmentResponse {
  masks: string[];
  boxes?: { x: number; y: number; width: number; height: number }[];
}

// Video API Request interfaces
export interface VideoGenerateRequest {
  prompt: string;
  negativePrompt?: string;
  model?: VideoModel;
  aspectRatio?: VideoAspectRatio;
  resolution?: VideoResolution;
  durationSeconds?: VideoDuration;
  image?: string;
  lastFrame?: string;
  referenceImages?: string[];
  video?: string;
  seed?: number;
}

export interface VideoOperationStatus {
  done: boolean;
  state: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  error?: string;
  progress?: number;
}

export interface VideoResult {
  video: string;
  mimeType: string;
  durationSeconds: number;
  width: number;
  height: number;
}

// Default safety settings constant
export const DEFAULT_SAFETY_SETTINGS: SafetySetting[] = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_LOW_AND_ABOVE' },
];
