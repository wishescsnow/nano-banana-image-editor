import {
  AspectRatio,
  ResolutionTier,
  SafetySetting,
  VideoAspectRatio,
  VideoResolution,
  VideoDuration,
  VideoModel,
  GenerateRequest,
  EditRequest,
  SegmentRequest,
  SegmentResponse,
  DEFAULT_SAFETY_SETTINGS,
} from '../types';
import { apiService, VideoGenerateRequest, VideoOperationStatus, VideoResult } from './apiService';

export const MODEL_OPTIONS = [
  { name: 'Nano Banana Pro', model: 'gemini-3-pro-image-preview' },
  { name: 'Nano Banana', model: 'gemini-2.5-flash-image' },
] as const;

export const DEFAULT_MODEL = MODEL_OPTIONS[0].model;
export const DEFAULT_ASPECT_RATIO: AspectRatio = 'auto';
export const DEFAULT_RESOLUTION_TIER: ResolutionTier = '1K';

// Re-export DEFAULT_SAFETY_SETTINGS for backward compatibility
export { DEFAULT_SAFETY_SETTINGS };

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

// Video generation constants
export const VIDEO_MODEL_OPTIONS: { name: string; model: VideoModel }[] = [
  { name: 'Veo 3.1', model: 'veo-3.1-generate-preview' },
  { name: 'Veo 3.1 Fast', model: 'veo-3.1-fast-generate-preview' },
  { name: 'Veo 3.0', model: 'veo-3.0-generate-001' },
  { name: 'Veo 3.0 Fast', model: 'veo-3.0-fast-generate-001' },
];

export const DEFAULT_VIDEO_MODEL: VideoModel = 'veo-3.0-generate-001';
export const DEFAULT_VIDEO_ASPECT_RATIO: VideoAspectRatio = '16:9';
export const DEFAULT_VIDEO_RESOLUTION: VideoResolution = '720p';
export const DEFAULT_VIDEO_DURATION: VideoDuration = 4;

export const VIDEO_ASPECT_RATIOS: VideoAspectRatio[] = ['16:9', '9:16'];
export const VIDEO_RESOLUTIONS: VideoResolution[] = ['720p', '1080p'];
export const VIDEO_DURATIONS: VideoDuration[] = [4, 6, 8];

// Type aliases for backward compatibility
export type GenerationRequest = GenerateRequest;
export type SegmentationRequest = SegmentRequest;

export class GeminiService {
  async generateImage(request: GenerateRequest): Promise<string[]> {
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

  async segmentImage(request: SegmentRequest): Promise<SegmentResponse> {
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

  // Video generation methods
  async generateVideo(request: VideoGenerateRequest): Promise<{ operationName: string; model: string }> {
    try {
      return await apiService.generateVideo({
        ...request,
        model: request.model ?? DEFAULT_VIDEO_MODEL,
        aspectRatio: request.aspectRatio ?? DEFAULT_VIDEO_ASPECT_RATIO,
        resolution: request.resolution ?? DEFAULT_VIDEO_RESOLUTION,
        durationSeconds: request.durationSeconds ?? DEFAULT_VIDEO_DURATION,
      });
    } catch (error) {
      console.error('Error generating video:', error);
      throw new Error('Failed to start video generation. Please try again.');
    }
  }

  async getVideoOperationStatus(operationName: string): Promise<VideoOperationStatus> {
    try {
      return await apiService.getVideoOperationStatus(operationName);
    } catch (error) {
      console.error('Error getting video operation status:', error);
      throw new Error('Failed to get video operation status.');
    }
  }

  async getVideoOperationResult(operationName: string): Promise<VideoResult> {
    try {
      return await apiService.getVideoOperationResult(operationName);
    } catch (error) {
      console.error('Error getting video result:', error);
      throw new Error('Failed to get video result.');
    }
  }

  // Note: Video generation does not support batch API like images do.
  // Video generation is inherently async - use generateVideo() and poll with
  // getVideoOperationStatus() / getVideoOperationResult().
}

export const geminiService = new GeminiService();
