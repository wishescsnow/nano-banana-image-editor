import React, { useState, useRef } from 'react';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { DropdownButton } from './ui/DropdownButton';
import { useAppStore } from '../store/useAppStore';
import { useImageGeneration, useImageEditing } from '../hooks/useImageGeneration';
import { Upload, Wand2, Edit3, MousePointer, HelpCircle, ChevronDown, ChevronRight, RotateCcw, Clock, Shield } from 'lucide-react';
import { blobToBase64, generateId } from '../utils/imageUtils';
import { PromptHints } from './PromptHints';
import { cn } from '../utils/cn';
import { CacheService } from '../services/cacheService';
import { geminiService, MODEL_OPTIONS } from '../services/geminiService';
import { BatchQueueRequest, SafetyThreshold, HarmCategory } from '../types';

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
    brushSize,
    clearBrushStrokes,
  } = useAppStore();

  const { generate } = useImageGeneration();
  const { edit } = useImageEditing();
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
        seed: seed || undefined
      });
    } else if (selectedTool === 'edit' || selectedTool === 'mask') {
      edit(currentPrompt);
    }
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
      referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
      originalImage,
      maskImage,
      temperature,
      seed: seed || undefined,
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
          model: selectedModel,
          safetySettings
        });
        batchName = result.batchName;
      } else {
        // Use generate batch request
        const result = await geminiService.submitBatchRequest({
          prompt: currentPrompt,
          referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
          temperature,
          seed: seed || undefined,
          model: selectedModel,
          safetySettings
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
    setShowClearConfirm(false);
  };

  const tools = [
    { id: 'generate', icon: Wand2, label: 'Generate', description: 'Create from text' },
    { id: 'edit', icon: Edit3, label: 'Edit', description: 'Modify existing' },
    { id: 'mask', icon: MousePointer, label: 'Select', description: 'Click to select' },
  ] as const;

  if (!showPromptPanel) {
    return (
      <div className="w-8 bg-gray-950 border-r border-gray-800 flex flex-col items-center justify-center">
        <button
          onClick={() => setShowPromptPanel(true)}
          className="w-6 h-16 bg-gray-800 hover:bg-gray-700 rounded-r-lg border border-l-0 border-gray-700 flex items-center justify-center transition-colors group"
          title="Show Prompt Panel"
        >
          <div className="flex flex-col space-y-1">
            <div className="w-1 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full"></div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="w-80 lg:w-72 xl:w-80 h-full bg-gray-950 border-r border-gray-800 p-6 flex flex-col space-y-6 overflow-y-auto">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">Mode</h3>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHintsModal(true)}
                className="h-6 w-6"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPromptPanel(false)}
                className="h-6 w-6"
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
                <tool.icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* File Upload */}
        <div>
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1 block">
              {selectedTool === 'generate' ? 'Reference Images' : selectedTool === 'edit' ? 'Style References' : 'Upload Image'}
            </label>
            {selectedTool === 'mask' && (
              <p className="text-xs text-gray-400 mb-3">Edit an image with masks</p>
            )}
            {selectedTool === 'generate' && (
              <p className="text-xs text-gray-500 mb-3">Optional, up to 10 images</p>
            )}
            {selectedTool === 'edit' && (
              <p className="text-xs text-gray-500 mb-3">
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
              <Upload className="h-4 w-4 mr-2" />
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
                        className="w-full h-20 object-cover rounded-lg border border-gray-700"
                      />
                      <button
                        onClick={() => selectedTool === 'generate' ? removeUploadedImage(index) : removeEditReferenceImage(index)}
                        className="absolute top-1 right-1 bg-gray-900/80 text-gray-400 hover:text-gray-200 rounded-full p-1 transition-colors"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-1 left-1 bg-gray-900/80 text-xs px-2 py-1 rounded text-gray-300">
                        Ref {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>

        {/* Prompt Input */}
        <div>
          <label className="text-sm font-medium text-gray-300 mb-3 block">
            {selectedTool === 'generate' ? 'Describe what you want to create' : 'Describe your changes'}
          </label>
          <Textarea
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            placeholder={
              selectedTool === 'generate'
                ? 'A serene mountain landscape at sunset with a lake reflecting the golden sky...'
                : 'Make the sky more dramatic, add storm clouds...'
            }
            className="min-h-[120px] resize-none"
          />

          {/* Prompt Quality Indicator */}
          <button
            onClick={() => setShowHintsModal(true)}
            className="mt-2 flex items-center text-xs hover:text-gray-400 transition-colors group"
          >
            {currentPrompt.length < 20 ? (
              <HelpCircle className="h-3 w-3 mr-2 text-red-500 group-hover:text-red-400" />
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
          disabled={isGenerating || !currentPrompt.trim()}
          options={[
            {
              id: 'queue-batch',
              label: 'Queue for Batch (50% cost)',
              icon: <Clock className="h-4 w-4" />,
              onClick: handleQueueForBatch
            }
          ]}
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              {selectedTool === 'generate' ? 'Generate' : 'Apply Edit'}
            </>
          )}
        </DropdownButton>

        {/* Advanced Controls */}
        <div>
          <button
            onClick={() => setShowClearConfirm(!showClearConfirm)}
            className="flex items-center text-sm text-gray-400 hover:text-red-400 transition-colors duration-200 mb-4"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear Session
          </button>

          {showClearConfirm && (
            <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
              <p className="text-xs text-gray-300 mb-3">
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
            className="flex items-center text-sm text-gray-400 hover:text-gray-300 transition-colors duration-200"
          >
            {showAdvanced ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
            {showAdvanced ? 'Hide' : 'Show'} Advanced Controls
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4">
              {/* Model */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">
                  Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full h-8 px-2 bg-gray-900 border border-gray-700 rounded text-xs text-gray-100"
                >
                  {MODEL_OPTIONS.map((opt) => (
                    <option key={opt.model} value={opt.model}>{opt.name}</option>
                  ))}
                </select>
              </div>

              {/* Temperature */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">
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

              {/* Seed */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">
                  Seed (optional)
                </label>
                <input
                  type="number"
                  value={seed || ''}
                  onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Random"
                  className="w-full h-8 px-2 bg-gray-900 border border-gray-700 rounded text-xs text-gray-100"
                />
              </div>

              {/* Safety Settings */}
              <div className="pt-4 border-t border-gray-800">
                <button
                  onClick={() => setShowSafetySettings(!showSafetySettings)}
                  className="flex items-center w-full text-xs text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  <span className="flex-1 text-left">Safety Settings</span>
                  {showSafetySettings ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                {showSafetySettings && (
                  <div className="mt-3 p-3 bg-gray-900/50 rounded-lg border border-gray-800 space-y-4">
                    <p className="text-xs text-gray-500">
                      Adjust how likely you are to see responses that could be harmful.
                    </p>

                    {safetySettings.map((setting) => (
                      <div key={setting.category}>
                        <div className="flex items-center justify-between mb-1">
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
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Reset defaults
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts */}
        <div className="pt-4 border-t border-gray-800">
          <h4 className="text-xs font-medium text-gray-400 mb-2">Shortcuts</h4>
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