import { AspectRatio, ResolutionTier, SafetySetting } from '../types';

const API_BASE = '/api';

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

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export const apiService = {
  async generateImage(request: GenerateRequest): Promise<{ images: string[] }> {
    const response = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  async editImage(request: EditRequest): Promise<{ images: string[] }> {
    const response = await fetch(`${API_BASE}/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  async segmentImage(request: SegmentRequest): Promise<any> {
    const response = await fetch(`${API_BASE}/segment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  // Batch API methods
  async submitBatchGenerate(request: GenerateRequest): Promise<{ batchName: string }> {
    const response = await fetch(`${API_BASE}/batch/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  async submitBatchEdit(request: EditRequest): Promise<{ batchName: string }> {
    const response = await fetch(`${API_BASE}/batch/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  async getBatchStatus(batchName: string): Promise<{ state: string; destFileName?: string }> {
    const response = await fetch(`${API_BASE}/batch/${encodeURIComponent(batchName)}`, {
      method: 'GET',
    });
    return handleResponse(response);
  },

  async getBatchResults(batchName: string): Promise<{ images: string[] }> {
    const response = await fetch(`${API_BASE}/batch/${encodeURIComponent(batchName)}/results`, {
      method: 'GET',
    });
    return handleResponse(response);
  },

  async submitBatchSegment(request: SegmentRequest): Promise<{ batchName: string }> {
    const response = await fetch(`${API_BASE}/batch/segment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },
};
