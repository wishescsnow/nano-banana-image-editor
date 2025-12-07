import { AspectRatio, ResolutionTier, SafetySetting } from '../types';
import { apiService } from './apiService';

export const MODEL_OPTIONS = [
  { name: 'Nano Banana Pro', model: 'gemini-3-pro-image-preview' },
  { name: 'Nano Banana', model: 'gemini-2.5-flash-image' },
] as const;

export const DEFAULT_MODEL = MODEL_OPTIONS[0].model;
export const DEFAULT_ASPECT_RATIO: AspectRatio = 'auto';
export const DEFAULT_RESOLUTION_TIER: ResolutionTier = '1K';

export const DEFAULT_SAFETY_SETTINGS: SafetySetting[] = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_LOW_AND_ABOVE' },
];

export const ASPECT_RATIOS: AspectRatio[] = ['auto', '1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9'];
export const RESOLUTION_TIERS: ResolutionTier[] = ['1K', '2K', '4K'];

type ResolutionDimensions = { width: number; height: number };
type ResolutionMap = Record<AspectRatio, Partial<Record<ResolutionTier, ResolutionDimensions>>>;

export const PRO_RESOLUTIONS: ResolutionMap = {
  '1:1': {
    '1K': { width: 1024, height: 1024 },
    '2K': { width: 2048, height: 2048 },
    '4K': { width: 4096, height: 4096 },
  },
  '2:3': {
    '1K': { width: 848, height: 1264 },
    '2K': { width: 1696, height: 2528 },
    '4K': { width: 3392, height: 5056 },
  },
  '3:2': {
    '1K': { width: 1264, height: 848 },
    '2K': { width: 2528, height: 1696 },
    '4K': { width: 5056, height: 3392 },
  },
  '3:4': {
    '1K': { width: 896, height: 1200 },
    '2K': { width: 1792, height: 2400 },
    '4K': { width: 3584, height: 4800 },
  },
  '4:3': {
    '1K': { width: 1200, height: 896 },
    '2K': { width: 2400, height: 1792 },
    '4K': { width: 4800, height: 3584 },
  },
  '9:16': {
    '1K': { width: 768, height: 1376 },
    '2K': { width: 1536, height: 2752 },
    '4K': { width: 3072, height: 5504 },
  },
  '16:9': {
    '1K': { width: 1376, height: 768 },
    '2K': { width: 2752, height: 1536 },
    '4K': { width: 5504, height: 3072 },
  },
};

export const FLASH_RESOLUTIONS: ResolutionMap = {
  '1:1': { '1K': { width: 1024, height: 1024 } },
  '2:3': { '1K': { width: 832, height: 1248 } },
  '3:2': { '1K': { width: 1248, height: 832 } },
  '3:4': { '1K': { width: 864, height: 1184 } },
  '4:3': { '1K': { width: 1184, height: 864 } },
  '9:16': { '1K': { width: 768, height: 1344 } },
  '16:9': { '1K': { width: 1344, height: 768 } },
};

export const MODEL_RESOLUTIONS: Record<string, ResolutionMap> = {
  'gemini-3-pro-image-preview': PRO_RESOLUTIONS,
  'gemini-2.5-flash-image': FLASH_RESOLUTIONS,
};

export interface GenerationRequest {
  prompt: string;
  referenceImages?: string[]; // base64 array
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
  originalImage: string; // base64
  referenceImages?: string[]; // base64 array
  maskImage?: string; // base64
  temperature?: number;
  seed?: number;
  variantCount?: number;
  model?: string;
  safetySettings?: SafetySetting[];
  aspectRatio?: AspectRatio;
  resolutionTier?: ResolutionTier;
}

export interface SegmentationRequest {
  query: string; // "the object at pixel (x,y)" or "the red car"
  image?: string; // base64
  maskImage?: string; // base64
  temperature?: number;
  seed?: number;
  model?: string;
  safetySettings?: SafetySetting[];
  aspectRatio?: AspectRatio;
  resolutionTier?: ResolutionTier;
}

export class GeminiService {
  async generateImage(request: GenerationRequest): Promise<string[]> {
    try {
      const response = await apiService.generateImage({
        prompt: request.prompt,
        referenceImages: request.referenceImages,
        temperature: request.temperature,
        seed: request.seed,
        variantCount: request.variantCount,
        model: request.model ?? DEFAULT_MODEL,
        safetySettings: request.safetySettings ?? DEFAULT_SAFETY_SETTINGS,
        aspectRatio: request.aspectRatio,
        resolutionTier: request.resolutionTier,
      });
      return response.images;
    } catch (error) {
      console.error('Error generating image:', error);
      throw new Error('Failed to generate image. Please try again.');
    }
  }

  async editImage(request: EditRequest): Promise<string[]> {
    try {
      const response = await apiService.editImage({
        instruction: request.instruction,
        originalImage: request.originalImage,
        referenceImages: request.referenceImages,
        maskImage: request.maskImage,
        temperature: request.temperature,
        seed: request.seed,
        variantCount: request.variantCount,
        model: request.model ?? DEFAULT_MODEL,
        safetySettings: request.safetySettings ?? DEFAULT_SAFETY_SETTINGS,
        aspectRatio: request.aspectRatio,
        resolutionTier: request.resolutionTier,
      });
      return response.images;
    } catch (error) {
      console.error('Error editing image:', error);
      throw new Error('Failed to edit image. Please try again.');
    }
  }

  async segmentImage(request: SegmentationRequest): Promise<any> {
    try {
      return await apiService.segmentImage({
        query: request.query,
        image: request.image,
        maskImage: request.maskImage,
        temperature: request.temperature,
        seed: request.seed,
        model: request.model ?? DEFAULT_MODEL,
        safetySettings: request.safetySettings ?? DEFAULT_SAFETY_SETTINGS,
        aspectRatio: request.aspectRatio,
        resolutionTier: request.resolutionTier,
      });
    } catch (error) {
      console.error('Error segmenting image:', error);
      throw new Error('Failed to segment image. Please try again.');
    }
  }

  // Batch API methods
  async submitBatchRequest(request: GenerationRequest): Promise<{ batchName: string }> {
    try {
      return await apiService.submitBatchGenerate({
        prompt: request.prompt,
        referenceImages: request.referenceImages,
        temperature: request.temperature,
        seed: request.seed,
        variantCount: request.variantCount,
        model: request.model ?? DEFAULT_MODEL,
        safetySettings: request.safetySettings ?? DEFAULT_SAFETY_SETTINGS,
        aspectRatio: request.aspectRatio,
        resolutionTier: request.resolutionTier,
      });
    } catch (error) {
      console.error('Error submitting batch request:', error);
      throw new Error('Failed to submit batch request. Please try again.');
    }
  }

  async submitBatchEditRequest(request: EditRequest): Promise<{ batchName: string }> {
    try {
      return await apiService.submitBatchEdit({
        instruction: request.instruction,
        originalImage: request.originalImage,
        referenceImages: request.referenceImages,
        maskImage: request.maskImage,
        temperature: request.temperature,
        seed: request.seed,
        variantCount: request.variantCount,
        model: request.model ?? DEFAULT_MODEL,
        safetySettings: request.safetySettings ?? DEFAULT_SAFETY_SETTINGS,
        aspectRatio: request.aspectRatio,
        resolutionTier: request.resolutionTier,
      });
    } catch (error) {
      console.error('Error submitting batch edit request:', error);
      throw new Error('Failed to submit batch edit request. Please try again.');
    }
  }

  async getBatchStatus(batchName: string): Promise<{
    state: string;
    destFileName?: string;
  }> {
    try {
      return await apiService.getBatchStatus(batchName);
    } catch (error) {
      console.error('Error getting batch status:', error);
      throw new Error('Failed to get batch status.');
    }
  }

  async getBatchResults(batchName: string): Promise<string[]> {
    try {
      const response = await apiService.getBatchResults(batchName);
      return response.images;
    } catch (error) {
      console.error('Error getting batch results:', error);
      throw new Error('Failed to get batch results.');
    }
  }

  async submitBatchSegmentRequest(request: SegmentationRequest): Promise<{ batchName: string }> {
    try {
      return await apiService.submitBatchSegment({
        query: request.query,
        image: request.image,
        maskImage: request.maskImage,
        temperature: request.temperature,
        seed: request.seed,
        model: request.model ?? DEFAULT_MODEL,
        safetySettings: request.safetySettings ?? DEFAULT_SAFETY_SETTINGS,
        aspectRatio: request.aspectRatio,
        resolutionTier: request.resolutionTier,
      });
    } catch (error) {
      console.error('Error submitting batch segmentation request:', error);
      throw new Error('Failed to submit batch segmentation request. Please try again.');
    }
  }
}

export const geminiService = new GeminiService();
