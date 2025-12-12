import {
  GenerateRequest,
  EditRequest,
  SegmentRequest,
  SegmentResponse,
  VideoGenerateRequest,
  VideoOperationStatus,
  VideoResult,
} from '../types';

// Re-export types for backward compatibility
export type { GenerateRequest, EditRequest, SegmentRequest, SegmentResponse, VideoGenerateRequest, VideoOperationStatus, VideoResult };

const API_BASE = '/api';

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

  async segmentImage(request: SegmentRequest): Promise<SegmentResponse> {
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

  // Video generation API methods
  async generateVideo(request: VideoGenerateRequest): Promise<{ operationName: string; model: string }> {
    const response = await fetch(`${API_BASE}/video/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  },

  async getVideoOperationStatus(operationName: string): Promise<VideoOperationStatus> {
    const response = await fetch(`${API_BASE}/video/operation/status?name=${encodeURIComponent(operationName)}`, {
      method: 'GET',
    });
    return handleResponse(response);
  },

  async getVideoOperationResult(operationName: string): Promise<VideoResult> {
    const response = await fetch(`${API_BASE}/video/operation/result?name=${encodeURIComponent(operationName)}`, {
      method: 'GET',
    });
    return handleResponse(response);
  },

  // Note: Video generation does not support batch API.
  // Use generateVideo() which returns an operation name for polling.
};
