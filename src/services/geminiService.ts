import { SafetySetting } from '../types';
import { apiService } from './apiService';

export const MODEL_OPTIONS = [
  { name: 'Nano Banana Pro', model: 'gemini-3-pro-image-preview' },
  { name: 'Nano Banana', model: 'gemini-2.5-flash-image' },
] as const;

export const DEFAULT_MODEL = MODEL_OPTIONS[0].model;

export const DEFAULT_SAFETY_SETTINGS: SafetySetting[] = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_LOW_AND_ABOVE' },
];

export interface GenerationRequest {
  prompt: string;
  referenceImages?: string[]; // base64 array
  temperature?: number;
  seed?: number;
  model?: string;
  safetySettings?: SafetySetting[];
}

export interface EditRequest {
  instruction: string;
  originalImage: string; // base64
  referenceImages?: string[]; // base64 array
  maskImage?: string; // base64
  temperature?: number;
  seed?: number;
  model?: string;
  safetySettings?: SafetySetting[];
}

export interface SegmentationRequest {
  image: string; // base64
  query: string; // "the object at pixel (x,y)" or "the red car"
}

export class GeminiService {
  async generateImage(request: GenerationRequest): Promise<string[]> {
    try {
      const response = await apiService.generateImage({
        prompt: request.prompt,
        referenceImages: request.referenceImages,
        temperature: request.temperature,
        seed: request.seed,
        model: request.model ?? DEFAULT_MODEL,
        safetySettings: request.safetySettings ?? DEFAULT_SAFETY_SETTINGS,
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
        model: request.model ?? DEFAULT_MODEL,
        safetySettings: request.safetySettings ?? DEFAULT_SAFETY_SETTINGS,
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
        image: request.image,
        query: request.query,
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
        model: request.model ?? DEFAULT_MODEL,
        safetySettings: request.safetySettings ?? DEFAULT_SAFETY_SETTINGS,
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
        model: request.model ?? DEFAULT_MODEL,
        safetySettings: request.safetySettings ?? DEFAULT_SAFETY_SETTINGS,
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
}

export const geminiService = new GeminiService();
