import React, { useState, useRef } from 'react';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { DropdownButton } from './ui/DropdownButton';
import { Input } from './ui/Input';
import { useAppStore } from '../store/useAppStore';
import { useImageGeneration, useImageEditing } from '../hooks/useImageGeneration';
import { useVideoGenerationWithPolling } from '../hooks/useVideoGeneration';
import { Upload, Wand2, Edit3, MousePointer, HelpCircle, ChevronDown, ChevronRight, RotateCcw, Clock, Shield, Video, X } from 'lucide-react';
import { blobToBase64, generateId } from '../utils/imageUtils';
import { PromptHints } from './PromptHints';
import { cn } from '../utils/cn';
import { CacheService } from '../services/cacheService';
import { geminiService, MODEL_OPTIONS, ASPECT_RATIOS, RESOLUTION_TIERS, DEFAULT_ASPECT_RATIO, DEFAULT_RESOLUTION_TIER, VIDEO_MODEL_OPTIONS, VIDEO_ASPECT_RATIOS, VIDEO_RESOLUTIONS, VIDEO_DURATIONS } from '../services/geminiService';
import { AspectRatio, BatchQueueRequest, VideoBatchQueueRequest, ResolutionTier, SafetyThreshold, HarmCategory, VideoModel, VideoAspectRatio, VideoResolution, VideoDuration } from '../types';

// Safety threshold options for the slider
const SAFETY_THRESHOLDS: { value: SafetyThreshold; label: string }[] = [
  { value: 'OFF', label: 'Off' },
  { value: 'BLOCK_NONE', label: 'Block none' },
  { value: 'BLOCK_ONLY_HIGH', label: 'Block few' },
  { value: 'BLOCK_MEDIUM_AND_ABOVE', label: 'Block some' },
  { value: 'BLOCK_LOW_AND_ABOVE', label: 'Block most' },
];

// Human-readable category names
const CATEGORY_LABELS: Record<HarmCategory, string> = {
  HARM_CATEGORY_HARASSMENT: 'Harassment',
  HARM_CATEGORY_HATE_SPEECH: 'Hate Speech',
  HARM_CATEGORY_SEXUALLY_EXPLICIT: 'Sexually Explicit',
  HARM_CATEGORY_DANGEROUS_CONTENT: 'Dangerous Content',
  HARM_CATEGORY_CIVIC_INTEGRITY: 'Civic Integrity',
};

export const PromptComposer: React.FC = () => {
  const {
    currentPrompt,
    setCurrentPrompt,
    selectedTool,
    setSelectedTool,
    temperature,
    setTemperature,
    seed,
    setSeed,
    selectedModel,
    setSelectedModel,
    safetySettings,
    setSafetyThreshold,
    resetSafetySettings,
    isGenerating,
    uploadedImages,
    addUploadedImage,
    removeUploadedImage,
    clearUploadedImages,
    editReferenceImages,
    addEditReferenceImage,
    removeEditReferenceImage,
    clearEditReferenceImages,
    canvasImage,
    setCanvasImage,
    showPromptPanel,
    setShowPromptPanel,
    brushStrokes,
    clearBrushStrokes,
    aspectRatio,
    setAspectRatio,
    resolutionTier,
    setResolutionTier,
    variantCount,
    setVariantCount,
    // Video state
    videoModel,
    setVideoModel,
    videoAspectRatio,
    setVideoAspectRatio,
    videoResolution,
    setVideoResolution,
    videoDurationSetting,
    setVideoDurationSetting,
    videoStartFrame,
    setVideoStartFrame,
    videoLastFrame,
    setVideoLastFrame,
    videoSourceVideo,
    setVideoSourceVideo,
    videoNegativePrompt,
    setVideoNegativePrompt,
    clearVideoSession,
  } = useAppStore();

  const { generate } = useImageGeneration();
  const { edit } = useImageEditing();
  const { generate: generateVideo, isGenerating: isVideoGenerating, progress: videoProgress } = useVideoGenerationWithPolling();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHintsModal, setShowHintsModal] = useState(false);
  const [showSafetySettings, setShowSafetySettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to get slider index from threshold value
  const getThresholdIndex = (threshold: SafetyThreshold): number => {
    return SAFETY_THRESHOLDS.findIndex(t => t.value === threshold);
  };

  // Helper to get threshold from slider index
  const getThresholdFromIndex = (index: number): SafetyThreshold => {
    return SAFETY_THRESHOLDS[index].value;
  };

  // Helper to extract base64 data from a data URL
  const extractBase64 = (dataUrl: string | null | undefined): string | undefined => {
    if (!dataUrl) return undefined;
    if (dataUrl.includes('base64,')) {
      return dataUrl.split('base64,')[1];
    }
    return dataUrl;
  };

  const isFlashModel = selectedModel === 'gemini-2.5-flash-image';

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    if (value === 'gemini-2.5-flash-image') {
      setResolutionTier(DEFAULT_RESOLUTION_TIER);
    }
  };

  const handleAspectRatioChange = (value: AspectRatio) => {
    setAspectRatio(value);
  };

  const handleResolutionTierChange = (tier: ResolutionTier) => {
    if (isFlashModel && tier !== '1K') return;
    setResolutionTier(tier);
  };

  const handleGenerate = () => {
    if (!currentPrompt.trim()) return;

    if (selectedTool === 'generate') {
      const referenceImages = uploadedImages
        .filter(img => img.includes('base64,'))
        .map(img => img.split('base64,')[1]);

      generate({
        prompt: currentPrompt,
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        temperature,
        seed: seed || undefined,
        aspectRatio,
        resolutionTier,
        variantCount: 1
      });
    } else if (selectedTool === 'edit' || selectedTool === 'mask') {
      edit(currentPrompt, 1);
    } else if (selectedTool === 'video') {
      handleVideoGenerate();
    }
  };

  const handleVideoGenerate = () => {
    if (!currentPrompt.trim()) return;

    // The hook handles extracting base64 from data URLs
    generateVideo({
      prompt: currentPrompt,
      seed: seed || undefined,
    });
  };

  const handleVideoStartFrameUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const base64 = await blobToBase64(file);
        const dataUrl = `data:${file.type};base64,${base64}`;
        setVideoStartFrame(dataUrl);
      } catch (error) {
        console.error('Failed to upload start frame:', error);
      }
    }
    event.target.value = '';
  };

  const handleVideoLastFrameUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const base64 = await blobToBase64(file);
        const dataUrl = `data:${file.type};base64,${base64}`;
        setVideoLastFrame(dataUrl);
      } catch (error) {
        console.error('Failed to upload last frame:', error);
      }
    }
    event.target.value = '';
  };

  const handleVideoSourceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      try {
        const base64 = await blobToBase64(file);
        const dataUrl = `data:${file.type};base64,${base64}`;
        setVideoSourceVideo(dataUrl);
        // Clear start/last frames when using video extension (mutually exclusive)
        setVideoStartFrame(null);
        setVideoLastFrame(null);
      } catch (error) {
        console.error('Failed to upload source video:', error);
      }
    }
    event.target.value = '';
  };

  const handleQueueForBatch = async () => {
    if (!currentPrompt.trim()) return;

    // Use the correct image set based on mode
    const isEditMode = selectedTool === 'edit' || selectedTool === 'mask';
    const imageSource = isEditMode ? editReferenceImages : uploadedImages;

    const referenceImages = imageSource
      .filter(img => img.includes('base64,'))
      .map(img => img.split('base64,')[1]);

    const originalImage = canvasImage?.includes('base64,') ? canvasImage.split('base64,')[1] : undefined;

    // Create mask from brush strokes if in edit mode and strokes exist
    let maskImage: string | undefined;
    if (isEditMode && brushStrokes.length > 0 && canvasImage) {
      try {
        // Create a temporary image to get actual dimensions
        const tempImg = new Image();
        tempImg.src = canvasImage;
        await new Promise<void>((resolve) => {
          tempImg.onload = () => resolve();
        });

        // Create mask canvas with exact image dimensions
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = tempImg.width;
        canvas.height = tempImg.height;

        // Fill with black (unmasked areas)
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw white strokes (masked areas)
        ctx.strokeStyle = 'white';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        brushStrokes.forEach(stroke => {
          if (stroke.points.length >= 4) {
            ctx.lineWidth = stroke.brushSize;
            ctx.beginPath();
            ctx.moveTo(stroke.points[0], stroke.points[1]);

            for (let i = 2; i < stroke.points.length; i += 2) {
              ctx.lineTo(stroke.points[i], stroke.points[i + 1]);
            }
            ctx.stroke();
          }
        });

        // Convert mask to base64
        const maskDataUrl = canvas.toDataURL('image/png');
        maskImage = maskDataUrl.split('base64,')[1];
      } catch (error) {
        console.error('Failed to create mask:', error);
      }
    }

    const queueRequest: BatchQueueRequest = {
      id: generateId(),
      type: selectedTool === 'generate' ? 'generate' : 'edit',
      prompt: currentPrompt,
      aspectRatio,
      resolutionTier,
      referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
      originalImage,
      maskImage,
      temperature,
      seed: seed || undefined,
      variantCount,
      status: 'pending',
      createdAt: Date.now()
    };

    // Save to IndexedDB
    await CacheService.saveQueuedRequest(queueRequest);

    // Submit to batch API
    try {
      let batchName: string;

      if (isEditMode && originalImage) {
        // Use edit batch request for edit/mask mode
        const result = await geminiService.submitBatchEditRequest({
          instruction: currentPrompt,
          originalImage,
          referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
          maskImage,
          temperature,
          seed: seed || undefined,
          variantCount,
          model: selectedModel,
          safetySettings,
          aspectRatio,
          resolutionTier
        });
        batchName = result.batchName;
      } else {
        // Use generate batch request
        const result = await geminiService.submitBatchRequest({
          prompt: currentPrompt,
          referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
          temperature,
          seed: seed || undefined,
          variantCount,
          model: selectedModel,
          safetySettings,
          aspectRatio,
          resolutionTier
        });
        batchName = result.batchName;
      }

      // Update with batch job name
      await CacheService.updateQueuedRequest(queueRequest.id, {
        status: 'submitted',
        batchJobName: batchName,
        submittedAt: Date.now()
      });
    } catch (error) {
      console.error('Failed to submit batch request:', error);
      await CacheService.updateQueuedRequest(queueRequest.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleVideoQueueForBatch = async () => {
    if (!currentPrompt.trim()) return;

    // Extract base64 from data URLs
    const startFrameBase64 = extractBase64(videoStartFrame);
    const lastFrameBase64 = extractBase64(videoLastFrame);
    const sourceVideoBase64 = extractBase64(videoSourceVideo);

    // Determine request type based on whether we're extending a video
    const requestType = sourceVideoBase64 ? 'video-extend' : 'video-generate';

    const videoQueueRequest: VideoBatchQueueRequest = {
      id: generateId(),
      type: requestType,
      prompt: currentPrompt,
      negativePrompt: videoNegativePrompt || undefined,
      aspectRatio: videoAspectRatio,
      resolution: videoResolution,
      durationSeconds: videoDurationSetting,
      startFrameImage: startFrameBase64,
      lastFrameImage: lastFrameBase64,
      sourceVideo: sourceVideoBase64,
      seed: seed || undefined,
      status: 'pending',
      createdAt: Date.now()
    };

    // Save to IndexedDB
    await CacheService.saveVideoQueuedRequest(videoQueueRequest);

    // Submit to video generation API
    try {
      const result = await geminiService.generateVideo({
        prompt: currentPrompt,
        negativePrompt: videoNegativePrompt || undefined,
        model: videoModel,
        aspectRatio: videoAspectRatio,
        resolution: videoResolution,
        durationSeconds: videoDurationSetting,
        image: startFrameBase64,
        lastFrame: lastFrameBase64,
        video: sourceVideoBase64,
        seed: seed || undefined,
      });

      // Update with operation name
      await CacheService.updateVideoQueuedRequest(videoQueueRequest.id, {
        status: 'submitted',
        operationName: result.operationName,
        submittedAt: Date.now()
      });
    } catch (error) {
      console.error('Failed to submit video request:', error);
      await CacheService.updateVideoQueuedRequest(videoQueueRequest.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const base64 = await blobToBase64(file);
        const dataUrl = `data:${file.type};base64,${base64}`;

        if (selectedTool === 'generate') {
          // Add to reference images (max 10)
          if (uploadedImages.length < 10) {
            addUploadedImage(dataUrl);
          }
        } else if (selectedTool === 'edit') {
          // For edit mode, add to separate edit reference images (max 10)
          if (editReferenceImages.length < 10) {
            addEditReferenceImage(dataUrl);
          }
          // Set as canvas image if none exists
          if (!canvasImage) {
            setCanvasImage(dataUrl);
          }
        } else if (selectedTool === 'mask') {
          // For mask mode, set as canvas image immediately
          clearUploadedImages();
          addUploadedImage(dataUrl);
          setCanvasImage(dataUrl);
        }
      } catch (error) {
        console.error('Failed to upload image:', error);
      }
    }

    // Reset input so selecting the same file again triggers onChange
    event.target.value = '';
  };

  const handleClearSession = () => {
    setCurrentPrompt('');
    clearUploadedImages();
    clearEditReferenceImages();
    clearBrushStrokes();
    setCanvasImage(null);
    setSeed(null);
    setTemperature(0.7);
    setAspectRatio(DEFAULT_ASPECT_RATIO);
    setResolutionTier(DEFAULT_RESOLUTION_TIER);
    setVariantCount(1);
    // Clear video state
    clearVideoSession();
    setVideoNegativePrompt('');
    setShowClearConfirm(false);
  };

  const videoStartFrameRef = useRef<HTMLInputElement>(null);
  const videoLastFrameRef = useRef<HTMLInputElement>(null);
  const videoSourceRef = useRef<HTMLInputElement>(null);

  const tools = [
    { id: 'generate', icon: Wand2, label: 'Generate', description: 'Create from text' },
    { id: 'edit', icon: Edit3, label: 'Edit', description: 'Modify existing' },
    { id: 'mask', icon: MousePointer, label: 'Select', description: 'Click to select' },
    { id: 'video', icon: Video, label: 'Video', description: 'Generate video' },
  ] as const;

  if (!showPromptPanel) {
    return (
      <div className="flex flex-col justify-center items-center w-8 border-r border-gray-800 bg-gray-950">
        <button
          onClick={() => setShowPromptPanel(true)}
          className="flex justify-center items-center w-6 h-16 bg-gray-800 rounded-r-lg border border-l-0 border-gray-700 transition-colors hover:bg-gray-700 group"
          title="Show Prompt Panel"
        >
          <div className="flex flex-col space-y-1">
            <div className="w-1 h-1 bg-gray-500 rounded-full group-hover:bg-gray-400"></div>
            <div className="w-1 h-1 bg-gray-500 rounded-full group-hover:bg-gray-400"></div>
            <div className="w-1 h-1 bg-gray-500 rounded-full group-hover:bg-gray-400"></div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex overflow-y-auto flex-col p-6 space-y-6 w-80 h-full border-r border-gray-800 lg:w-72 xl:w-80 bg-gray-950">
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-300">Mode</h3>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHintsModal(true)}
                className="w-6 h-6"
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPromptPanel(false)}
                className="w-6 h-6"
                title="Hide Prompt Panel"
              >
                ×
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className={cn(
                  'flex flex-col items-center p-3 rounded-lg border transition-all duration-200',
                  selectedTool === tool.id
                    ? 'bg-yellow-400/10 border-yellow-400/50 text-yellow-400'
                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                )}
              >
                <tool.icon className="mb-1 w-5 h-5" />
                <span className="text-xs font-medium">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* File Upload - Hide for video mode */}
        {selectedTool !== 'video' && (
          <div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-300">
                {selectedTool === 'generate' ? 'Reference Images' : selectedTool === 'edit' ? 'Style References' : 'Upload Image'}
              </label>
              {selectedTool === 'mask' && (
                <p className="mb-3 text-xs text-gray-400">Edit an image with masks</p>
              )}
              {selectedTool === 'generate' && (
                <p className="mb-3 text-xs text-gray-500">Optional, up to 10 images</p>
              )}
              {selectedTool === 'edit' && (
                <p className="mb-3 text-xs text-gray-500">
                  {canvasImage ? 'Optional style references, up to 10 images' : 'Upload image to edit, up to 10 images'}
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
                disabled={
                  (selectedTool === 'generate' && uploadedImages.length >= 10) ||
                  (selectedTool === 'edit' && editReferenceImages.length >= 10)
                }
              >
                <Upload className="mr-2 w-4 h-4" />
                Upload
              </Button>

              {/* Show uploaded images preview */}
              {((selectedTool === 'generate' && uploadedImages.length > 0) ||
                (selectedTool === 'edit' && editReferenceImages.length > 0)) && (
                  <div className="mt-3 space-y-2">
                    {(selectedTool === 'generate' ? uploadedImages : editReferenceImages).map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image}
                          alt={`Reference ${index + 1}`}
                          className="object-cover w-full h-20 rounded-lg border border-gray-700"
                        />
                        <button
                          onClick={() => selectedTool === 'generate' ? removeUploadedImage(index) : removeEditReferenceImage(index)}
                          className="absolute top-1 right-1 p-1 text-gray-400 rounded-full transition-colors bg-gray-900/80 hover:text-gray-200"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-1 left-1 px-2 py-1 text-xs text-gray-300 rounded bg-gray-900/80">
                          Ref {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Video Settings - Show for video mode */}
        {selectedTool === 'video' && (
          <div className="space-y-4">
            {/* Video Model */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-300">
                Video Model
              </label>
              <select
                value={videoModel}
                onChange={(e) => setVideoModel(e.target.value as VideoModel)}
                className="px-3 w-full h-9 text-sm text-gray-100 bg-gray-900 rounded border border-gray-700"
              >
                {VIDEO_MODEL_OPTIONS.map((opt) => (
                  <option key={opt.model} value={opt.model}>{opt.name}</option>
                ))}
              </select>
            </div>

            {/* Video Parameters Grid */}
            <div className="grid grid-cols-3 gap-2">
              {/* Aspect Ratio */}
              <div>
                <label className="block mb-1 text-xs text-gray-400">Aspect</label>
                <select
                  value={videoAspectRatio}
                  onChange={(e) => setVideoAspectRatio(e.target.value as VideoAspectRatio)}
                  className="px-2 w-full h-8 text-xs text-gray-100 bg-gray-900 rounded border border-gray-700"
                >
                  {VIDEO_ASPECT_RATIOS.map((ratio) => (
                    <option key={ratio} value={ratio}>{ratio}</option>
                  ))}
                </select>
              </div>

              {/* Resolution */}
              <div>
                <label className="block mb-1 text-xs text-gray-400">Resolution</label>
                <select
                  value={videoResolution}
                  onChange={(e) => setVideoResolution(e.target.value as VideoResolution)}
                  className="px-2 w-full h-8 text-xs text-gray-100 bg-gray-900 rounded border border-gray-700"
                >
                  {VIDEO_RESOLUTIONS.map((res) => (
                    <option key={res} value={res}>{res}</option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block mb-1 text-xs text-gray-400">Duration</label>
                <select
                  value={videoDurationSetting}
                  onChange={(e) => setVideoDurationSetting(parseInt(e.target.value) as VideoDuration)}
                  className="px-2 w-full h-8 text-xs text-gray-100 bg-gray-900 rounded border border-gray-700"
                >
                  {VIDEO_DURATIONS.map((dur) => (
                    <option key={dur} value={dur}>{dur}s</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Start Frame */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-300">
                Start Frame <span className="text-xs text-gray-500">(optional)</span>
              </label>
              <input
                ref={videoStartFrameRef}
                type="file"
                accept="image/*"
                onChange={handleVideoStartFrameUpload}
                className="hidden"
              />
              {videoStartFrame ? (
                <div className="relative">
                  <img
                    src={videoStartFrame}
                    alt="Start frame"
                    className="object-cover w-full h-24 rounded-lg border border-purple-500/50"
                  />
                  <button
                    onClick={() => setVideoStartFrame(null)}
                    className="absolute top-1 right-1 p-1 text-gray-400 rounded-full transition-colors bg-gray-900/80 hover:text-gray-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-1 left-1 px-2 py-1 text-xs text-purple-300 rounded bg-gray-900/80">
                    First Frame
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => videoStartFrameRef.current?.click()}
                  className="w-full border-dashed"
                  size="sm"
                  disabled={!!videoSourceVideo}
                  title={videoSourceVideo ? 'Cannot use with source video' : undefined}
                >
                  <Upload className="mr-2 w-3 h-3" />
                  Upload Start Frame
                </Button>
              )}
              {videoSourceVideo && !videoStartFrame && (
                <p className="mt-1 text-xs text-gray-500">
                  Start frame cannot be used with video extension
                </p>
              )}
            </div>

            {/* Last Frame */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-300">
                Last Frame <span className="text-xs text-gray-500">(optional)</span>
              </label>
              <input
                ref={videoLastFrameRef}
                type="file"
                accept="image/*"
                onChange={handleVideoLastFrameUpload}
                className="hidden"
              />
              {videoLastFrame ? (
                <div className="relative">
                  <img
                    src={videoLastFrame}
                    alt="Last frame"
                    className="object-cover w-full h-24 rounded-lg border border-purple-500/50"
                  />
                  <button
                    onClick={() => setVideoLastFrame(null)}
                    className="absolute top-1 right-1 p-1 text-gray-400 rounded-full transition-colors bg-gray-900/80 hover:text-gray-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-1 left-1 px-2 py-1 text-xs text-purple-300 rounded bg-gray-900/80">
                    Last Frame
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => videoLastFrameRef.current?.click()}
                  className="w-full border-dashed"
                  size="sm"
                  disabled={!!videoSourceVideo}
                  title={videoSourceVideo ? 'Cannot use with source video' : undefined}
                >
                  <Upload className="mr-2 w-3 h-3" />
                  Upload Last Frame
                </Button>
              )}
              {videoSourceVideo && !videoLastFrame && (
                <p className="mt-1 text-xs text-gray-500">
                  Last frame cannot be used with video extension
                </p>
              )}
            </div>

            {/* Source Video for Extension */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-300">
                Source Video <span className="text-xs text-gray-500">(for extension)</span>
              </label>
              <input
                ref={videoSourceRef}
                type="file"
                accept="video/*"
                onChange={handleVideoSourceUpload}
                className="hidden"
              />
              {videoSourceVideo ? (
                <div className="relative">
                  <video
                    src={videoSourceVideo}
                    className="object-cover w-full h-24 rounded-lg border border-purple-500/50"
                  />
                  <button
                    onClick={() => setVideoSourceVideo(null)}
                    className="absolute top-1 right-1 p-1 text-gray-400 rounded-full transition-colors bg-gray-900/80 hover:text-gray-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-1 left-1 px-2 py-1 text-xs text-purple-300 rounded bg-gray-900/80">
                    Source Video
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => videoSourceRef.current?.click()}
                  className="w-full border-dashed"
                  size="sm"
                  disabled={!!videoStartFrame || !!videoLastFrame}
                  title={videoStartFrame || videoLastFrame ? 'Cannot use with start/last frame' : undefined}
                >
                  <Upload className="mr-2 w-3 h-3" />
                  Upload Video to Extend
                </Button>
              )}
              {(videoStartFrame || videoLastFrame) && !videoSourceVideo && (
                <p className="mt-1 text-xs text-gray-500">
                  Video extension cannot be used with start/last frame
                </p>
              )}
            </div>

            {/* Negative Prompt */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-300">
                Negative Prompt <span className="text-xs text-gray-500">(optional)</span>
              </label>
              <Textarea
                value={videoNegativePrompt}
                onChange={(e) => setVideoNegativePrompt(e.target.value)}
                placeholder="Things to avoid in the video..."
                className="min-h-[60px] resize-none text-sm"
              />
            </div>
          </div>
        )}

        {/* Prompt Input */}
        <div>
          <label className="block mb-3 text-sm font-medium text-gray-300">
            {selectedTool === 'video'
              ? 'Describe your video'
              : selectedTool === 'generate'
                ? 'Describe what you want to create'
                : 'Describe your changes'}
          </label>
          <Textarea
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            placeholder={
              selectedTool === 'video'
                ? 'A cinematic shot of a golden retriever running through a field of sunflowers at sunset...'
                : selectedTool === 'generate'
                  ? 'A serene mountain landscape at sunset with a lake reflecting the golden sky...'
                  : 'Make the sky more dramatic, add storm clouds...'
            }
            className="min-h-[120px] resize-none"
          />

          {/* Prompt Quality Indicator */}
          <button
            onClick={() => setShowHintsModal(true)}
            className="flex items-center mt-2 text-xs transition-colors hover:text-gray-400 group"
          >
            {currentPrompt.length < 20 ? (
              <HelpCircle className="mr-2 w-3 h-3 text-red-500 group-hover:text-red-400" />
            ) : (
              <div className={cn(
                'h-2 w-2 rounded-full mr-2',
                currentPrompt.length < 50 ? 'bg-yellow-500' : 'bg-green-500'
              )} />
            )}
            <span className="text-gray-500 group-hover:text-gray-400">
              {currentPrompt.length < 20 ? 'Add detail for better results' :
                currentPrompt.length < 50 ? 'Good detail level' : 'Excellent prompt detail'}
            </span>
          </button>
        </div>


        {/* Generate Button with Batch Queue Option */}
        <DropdownButton
          onClick={handleGenerate}
          disabled={(isGenerating || isVideoGenerating) || !currentPrompt.trim()}
          options={selectedTool === 'video' ? [
            {
              id: 'queue-video',
              label: 'Add to Queue',
              icon: <Clock className="w-4 h-4" />,
              onClick: handleVideoQueueForBatch
            }
          ] : [
            {
              id: 'queue-batch',
              label: 'Queue for Batch (50% cost)',
              icon: <Clock className="w-4 h-4" />,
              onClick: handleQueueForBatch
            }
          ]}
        >
          {isGenerating || isVideoGenerating ? (
            <span className="flex items-center">
              <div className="mr-2 w-4 h-4 rounded-full border-b-2 border-gray-900 animate-spin" />
              {selectedTool === 'video' ? (
                videoProgress ? `Generating... ${Math.round(videoProgress * 100)}%` : 'Starting...'
              ) : 'Generating...'}
            </span>
          ) : (
            <span className="flex items-center">
              {selectedTool === 'video' ? (
                <Video className="mr-2 w-4 h-4" />
              ) : (
                <Wand2 className="mr-2 w-4 h-4" />
              )}
              {selectedTool === 'video'
                ? 'Generate Video'
                : selectedTool === 'generate'
                  ? 'Generate'
                  : 'Apply Edit'}
            </span>
          )}
        </DropdownButton>

        {/* Advanced Controls */}
        <div>
          <button
            onClick={() => setShowClearConfirm(!showClearConfirm)}
            className="flex items-center mb-4 text-sm text-gray-400 transition-colors duration-200 hover:text-red-400"
          >
            <RotateCcw className="mr-2 w-4 h-4" />
            Clear Session
          </button>

          {showClearConfirm && (
            <div className="p-3 mt-3 bg-gray-800 rounded-lg border border-gray-700">
              <p className="mb-3 text-xs text-gray-300">
                Are you sure you want to clear this session? This will remove all uploads, prompts, and canvas content.
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearSession}
                  className="flex-1"
                >
                  Yes, Clear
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-gray-400 transition-colors duration-200 hover:text-gray-300"
          >
            {showAdvanced ? <ChevronDown className="mr-1 w-4 h-4" /> : <ChevronRight className="mr-1 w-4 h-4" />}
            {showAdvanced ? 'Hide' : 'Show'} Advanced Controls
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4">
              {/* Image-specific settings - hide for video mode */}
              {selectedTool !== 'video' && (
                <>
                  {/* Model */}
                  <div>
                    <label className="block mb-2 text-xs text-gray-400">
                      Model
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className="px-2 w-full h-8 text-xs text-gray-100 bg-gray-900 rounded border border-gray-700"
                    >
                      {MODEL_OPTIONS.map((opt) => (
                        <option key={opt.model} value={opt.model}>{opt.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Aspect Ratio */}
                  <div>
                    <label className="block mb-2 text-xs text-gray-400">
                      Aspect Ratio
                    </label>
                    <select
                      value={aspectRatio}
                      onChange={(e) => handleAspectRatioChange(e.target.value as AspectRatio)}
                      className="px-2 w-full h-8 text-xs text-gray-100 bg-gray-900 rounded border border-gray-700"
                    >
                      {ASPECT_RATIOS.map((ratio) => (
                        <option key={ratio} value={ratio}>{ratio}</option>
                      ))}
                    </select>
                  </div>

                  {/* Resolution */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs text-gray-400">
                        Resolution Tier
                      </label>
                      {isFlashModel && (
                        <span className="text-[10px] text-gray-500">Flash supports 1K only</span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {RESOLUTION_TIERS.map((tier) => {
                        const disabled = isFlashModel && tier !== '1K';
                        return (
                          <button
                            key={tier}
                            onClick={() => handleResolutionTierChange(tier)}
                            disabled={disabled}
                            className={cn(
                              'h-8 text-xs rounded border transition-colors',
                              resolutionTier === tier
                                ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-300'
                                : 'border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800',
                              disabled && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            {tier}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Temperature */}
                  <div>
                    <label className="block mb-2 text-xs text-gray-400">
                      Creativity ({temperature})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                </>
              )}

              {/* Seed - shared between image and video */}
              <div>
                <label className="block mb-2 text-xs text-gray-400">
                  Seed (optional)
                </label>
                <input
                  type="number"
                  value={seed || ''}
                  onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Random"
                  className="px-2 w-full h-8 text-xs text-gray-100 bg-gray-900 rounded border border-gray-700"
                />
              </div>

              {/* Batch Settings - hide for video mode */}
              {selectedTool !== 'video' && (
                <div className="pt-4 border-t border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300">Batch settings</span>
                    <span className="text-[10px] text-gray-500">Applies to queue only</span>
                  </div>

                  {/* Variants (batch only) */}
                  <div>
                    <label className="block mb-2 text-xs text-gray-400">
                      Variants (min 1)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={variantCount}
                      onChange={(e) => {
                        const value = Math.max(1, parseInt(e.target.value || '1', 10));
                        setVariantCount(value);
                      }}
                      className="px-2 w-full h-8 text-xs text-gray-100 bg-gray-900 rounded border border-gray-700"
                    />
                    <p className="mt-1 text-[11px] text-gray-500">
                      Used for batch queue; realtime uses 1 image.
                    </p>
                  </div>
                </div>
              )}

              {/* Safety Settings - hide for video mode */}
              {selectedTool !== 'video' && (
                <div className="pt-4 border-t border-gray-800">
                  <button
                    onClick={() => setShowSafetySettings(!showSafetySettings)}
                    className="flex items-center w-full text-xs text-gray-400 transition-colors hover:text-gray-300"
                  >
                    <Shield className="mr-2 w-4 h-4" />
                    <span className="flex-1 text-left">Safety Settings</span>
                    {showSafetySettings ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  {showSafetySettings && (
                    <div className="p-3 mt-3 space-y-4 rounded-lg border border-gray-800 bg-gray-900/50">
                      <p className="text-xs text-gray-500">
                        Adjust how likely you are to see responses that could be harmful.
                      </p>

                      {safetySettings.map((setting) => (
                        <div key={setting.category}>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs text-gray-400">
                              {CATEGORY_LABELS[setting.category]}
                            </label>
                            <span className="text-xs text-indigo-400">
                              {SAFETY_THRESHOLDS[getThresholdIndex(setting.threshold)].label}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="4"
                            step="1"
                            value={getThresholdIndex(setting.threshold)}
                            onChange={(e) => setSafetyThreshold(setting.category, getThresholdFromIndex(parseInt(e.target.value)))}
                            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider accent-indigo-500"
                          />
                        </div>
                      ))}

                      <button
                        onClick={resetSafetySettings}
                        className="text-xs text-indigo-400 transition-colors hover:text-indigo-300"
                      >
                        Reset defaults
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts */}
        <div className="pt-4 border-t border-gray-800">
          <h4 className="mb-2 text-xs font-medium text-gray-400">Shortcuts</h4>
          <div className="space-y-1 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Generate</span>
              <span>⌘ + Enter</span>
            </div>
            <div className="flex justify-between">
              <span>Re-roll</span>
              <span>⇧ + R</span>
            </div>
            <div className="flex justify-between">
              <span>Edit mode</span>
              <span>E</span>
            </div>
            <div className="flex justify-between">
              <span>History</span>
              <span>H</span>
            </div>
            <div className="flex justify-between">
              <span>Toggle Panel</span>
              <span>P</span>
            </div>
          </div>
        </div>
      </div>
      {/* Prompt Hints Modal */}
      <PromptHints open={showHintsModal} onOpenChange={setShowHintsModal} />
    </>
  );
};
