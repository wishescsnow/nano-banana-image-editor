import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { geminiService, DEFAULT_VIDEO_MODEL, DEFAULT_VIDEO_ASPECT_RATIO, DEFAULT_VIDEO_RESOLUTION, DEFAULT_VIDEO_DURATION } from '../services/geminiService';
import { VideoGenerateRequest } from '../services/apiService';
import { useAppStore } from '../store/useAppStore';
import { generateId } from '../utils/imageUtils';
import { VideoGeneration, VideoAsset, Asset } from '../types';
import { useState, useEffect, useCallback } from 'react';

// Helper to extract base64 data from a data URL with validation
const extractBase64 = (dataUrl: string | null | undefined): string | undefined => {
  if (!dataUrl) return undefined;
  if (dataUrl.includes('base64,')) {
    const parts = dataUrl.split('base64,');
    if (parts.length >= 2 && parts[1]) {
      return parts[1];
    }
    console.warn('Invalid base64 data URL format');
    return undefined;
  }
  // Already raw base64
  return dataUrl;
};

// Hook for starting video generation
export const useVideoGeneration = () => {
  const {
    setIsGenerating,
    videoModel,
    videoAspectRatio,
    videoResolution,
    videoDurationSetting,
    videoStartFrame,
    videoLastFrame,
    videoSourceVideo,
    videoNegativePrompt,
  } = useAppStore();

  const [operationName, setOperationName] = useState<string | null>(null);
  const [generationModel, setGenerationModel] = useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: async (request: VideoGenerateRequest) => {
      // Extract base64 from data URLs - the API expects raw base64, not data URLs
      const startFrameBase64 = request.image ?? extractBase64(videoStartFrame);
      const lastFrameBase64 = request.lastFrame ?? extractBase64(videoLastFrame);
      const sourceVideoBase64 = request.video ?? extractBase64(videoSourceVideo);

      const response = await geminiService.generateVideo({
        ...request,
        model: request.model ?? videoModel,
        aspectRatio: request.aspectRatio ?? videoAspectRatio,
        resolution: request.resolution ?? videoResolution,
        durationSeconds: request.durationSeconds ?? videoDurationSetting,
        negativePrompt: request.negativePrompt ?? (videoNegativePrompt || undefined),
        image: startFrameBase64,
        lastFrame: lastFrameBase64,
        video: sourceVideoBase64,
      });
      return response;
    },
    onMutate: () => {
      setIsGenerating(true);
    },
    onSuccess: (response) => {
      setOperationName(response.operationName);
      setGenerationModel(response.model);
    },
    onError: (error) => {
      console.error('Video generation failed to start:', error);
      setIsGenerating(false);
    }
  });

  const clearOperation = useCallback(() => {
    setOperationName(null);
    setGenerationModel(null);
  }, []);

  return {
    generate: generateMutation.mutate,
    isStarting: generateMutation.isPending,
    operationName,
    generationModel,
    clearOperation,
    error: generateMutation.error
  };
};

// Hook for polling video operation status
export const useVideoOperationPolling = (
  operationName: string | null,
  generationModel: string | null,
  prompt: string,
  onComplete?: () => void
) => {
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ['videoOperation', operationName],
    queryFn: async () => {
      if (!operationName) return null;
      return await geminiService.getVideoOperationStatus(operationName);
    },
    enabled: !!operationName,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 5000;
      if (data.state === 'SUCCEEDED' || data.state === 'FAILED') {
        return false; // Stop polling
      }
      return 5000; // Poll every 5 seconds
    },
  });

  // Fetch result when operation is complete
  const resultQuery = useQuery({
    queryKey: ['videoResult', operationName],
    queryFn: async () => {
      if (!operationName) return null;
      return await geminiService.getVideoOperationResult(operationName);
    },
    enabled: !!operationName && statusQuery.data?.state === 'SUCCEEDED',
    staleTime: Infinity, // Don't refetch, result won't change
  });

  // Handle successful video generation
  useEffect(() => {
    if (resultQuery.data && operationName && generationModel) {
      // Use getState() to avoid stale closures
      const {
        addVideoGeneration,
        setCanvasVideo,
        setIsGenerating,
        setCurrentProject,
        currentProject,
        videoAspectRatio,
        videoResolution,
        videoDurationSetting,
      } = useAppStore.getState();

      const result = resultQuery.data;

      // Create video URL from base64
      const videoUrl = `data:${result.mimeType};base64,${result.video}`;

      // Create video asset
      const videoAsset: VideoAsset = {
        id: generateId(),
        type: 'video_output',
        url: videoUrl,
        mimeType: result.mimeType,
        width: result.width,
        height: result.height,
        duration: result.durationSeconds,
        checksum: result.video.slice(0, 32),
      };

      // Create video generation record
      const videoGeneration: VideoGeneration = {
        id: generateId(),
        prompt,
        parameters: {
          aspectRatio: videoAspectRatio,
          resolution: videoResolution,
          durationSeconds: videoDurationSetting,
        },
        outputAsset: videoAsset,
        modelVersion: generationModel,
        timestamp: Date.now(),
      };

      // Update state
      addVideoGeneration(videoGeneration);
      setCanvasVideo(videoUrl);
      setIsGenerating(false);

      // Create project if none exists
      if (!currentProject) {
        const newProject = {
          id: generateId(),
          title: 'Untitled Project',
          generations: [],
          edits: [],
          videoGenerations: [videoGeneration],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        setCurrentProject(newProject);
      }

      // Invalidate the status query to prevent refetching
      queryClient.invalidateQueries({ queryKey: ['videoOperation', operationName] });

      // Call completion callback
      onComplete?.();
    }
  }, [resultQuery.data, operationName, generationModel, prompt, queryClient, onComplete]);

  // Handle failed video generation
  useEffect(() => {
    if (statusQuery.data?.state === 'FAILED') {
      const { setIsGenerating } = useAppStore.getState();
      console.error('Video generation failed:', statusQuery.data.error);
      setIsGenerating(false);
      onComplete?.();
    }
  }, [statusQuery.data?.state, onComplete]);

  return {
    status: statusQuery.data,
    result: resultQuery.data,
    isPolling: statusQuery.isFetching,
    isLoadingResult: resultQuery.isLoading,
    error: statusQuery.error || resultQuery.error,
    progress: statusQuery.data?.progress,
  };
};

// Combined hook for video generation with polling
export const useVideoGenerationWithPolling = () => {
  const [prompt, setPrompt] = useState('');
  const videoGeneration = useVideoGeneration();

  const polling = useVideoOperationPolling(
    videoGeneration.operationName,
    videoGeneration.generationModel,
    prompt,
    () => {
      videoGeneration.clearOperation();
      setPrompt('');
    }
  );

  const generate = useCallback((request: VideoGenerateRequest) => {
    setPrompt(request.prompt);
    videoGeneration.generate(request);
  }, [videoGeneration.generate]);

  return {
    generate,
    isGenerating: videoGeneration.isStarting || !!videoGeneration.operationName,
    operationName: videoGeneration.operationName,
    status: polling.status,
    progress: polling.progress,
    error: videoGeneration.error || polling.error,
  };
};
