import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/Button';
import { History, Download, Image as ImageIcon, Layers, Clock, Video, Play } from 'lucide-react';
import { cn } from '../utils/cn';
import { ImagePreviewModal } from './ImagePreviewModal';
import { QueuedRequestsPanel } from './QueuedRequestsPanel';
import { CacheService } from '../services/cacheService';

type TabType = 'history' | 'queue';

export const HistoryPanel: React.FC = () => {
  const {
    currentProject,
    canvasImage,
    canvasVideo,
    selectedGenerationId,
    selectedEditId,
    selectedVideoGenerationId,
    selectGeneration,
    selectEdit,
    selectVideoGeneration,
    showHistory,
    setShowHistory,
    setCanvasImage,
    setCanvasImages,
    setCanvasVideo,
    selectedTool
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabType>('history');
  const [queueCount, setQueueCount] = useState(0);

  const [previewModal, setPreviewModal] = React.useState<{
    open: boolean;
    imageUrl: string;
    title: string;
    description?: string;
  }>({
    open: false,
    imageUrl: '',
    title: '',
    description: ''
  });

  const generations = currentProject?.generations || [];
  const edits = currentProject?.edits || [];
  const videoGenerations = currentProject?.videoGenerations || [];

  // Get current image dimensions
  const [imageDimensions, setImageDimensions] = React.useState<{ width: number; height: number } | null>(null);

  // Load queue count (includes both image batch and video requests)
  useEffect(() => {
    const loadQueueCount = async () => {
      const imageRequests = await CacheService.getAllQueuedRequests();
      const videoRequests = await CacheService.getAllVideoQueuedRequests();
      setQueueCount(imageRequests.length + videoRequests.length);
    };
    loadQueueCount();

    // Refresh count periodically
    const interval = setInterval(loadQueueCount, 5000);
    return () => clearInterval(interval);
  }, []);
  
  React.useEffect(() => {
    if (canvasImage) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
      };
      img.src = canvasImage;
    } else {
      setImageDimensions(null);
    }
  }, [canvasImage]);

  if (!showHistory) {
    return (
      <div className="w-8 bg-gray-950 border-l border-gray-800 flex flex-col items-center justify-center">
        <button
          onClick={() => setShowHistory(true)}
          className="w-6 h-16 bg-gray-800 hover:bg-gray-700 rounded-l-lg border border-r-0 border-gray-700 flex items-center justify-center transition-colors group"
          title="Show History Panel"
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
    <div className="w-80 bg-gray-950 border-l border-gray-800 p-6 flex flex-col h-full">
      {/* Header with Close */}
      <div className="flex items-center justify-end mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowHistory(!showHistory)}
          className="h-6 w-6"
          title="Hide Panel"
        >
          ×
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-900 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            'flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200',
            activeTab === 'history'
              ? 'bg-gray-800 text-gray-100'
              : 'text-gray-400 hover:text-gray-300'
          )}
        >
          <History className="h-4 w-4" />
          <span>History</span>
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={cn(
            'flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 relative',
            activeTab === 'queue'
              ? 'bg-gray-800 text-gray-100'
              : 'text-gray-400 hover:text-gray-300'
          )}
        >
          <Clock className="h-4 w-4" />
          <span>Queue</span>
          {queueCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {queueCount}
            </span>
          )}
        </button>
      </div>

      {/* Queue Tab Content */}
      {activeTab === 'queue' && <QueuedRequestsPanel />}

      {/* History Tab Content */}
      {activeTab === 'history' && (
        <>

      {/* Variants Grid */}
      <div className="mb-6 flex-shrink-0">
        <h4 className="text-xs font-medium text-gray-400 mb-3">Current Variants</h4>
        {generations.length === 0 && edits.length === 0 && videoGenerations.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🖼️</div>
            <p className="text-sm text-gray-500">No generations yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Show generations */}
            {generations.slice(-2).map((generation, index) => (
              <div
                key={generation.id}
                className={cn(
                  'relative aspect-square rounded-lg border-2 cursor-pointer transition-all duration-200 overflow-hidden',
                  selectedGenerationId === generation.id
                    ? 'border-yellow-400'
                    : 'border-gray-700 hover:border-gray-600'
                )}
                onClick={() => {
                  selectGeneration(generation.id);
                  selectVideoGeneration(null);
                  if (generation.outputAssets.length > 0) {
                    setCanvasImages(generation.outputAssets.map((asset) => asset.url));
                  }
                }}
              >
                {generation.outputAssets[0] ? (
                  <>
                    <img
                      src={generation.outputAssets[0].url}
                      alt="Generated variant"
                      className="w-full h-full object-cover"
                    />
                  </>
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400" />
                  </div>
                )}

                {/* Variant Number */}
                <div className="absolute top-2 left-2 bg-gray-900/80 text-xs px-2 py-1 rounded">
                  #{index + 1}
                </div>
              </div>
            ))}

            {/* Show edits */}
            {edits.slice(-2).map((edit, index) => (
              <div
                key={edit.id}
                className={cn(
                  'relative aspect-square rounded-lg border-2 cursor-pointer transition-all duration-200 overflow-hidden',
                  selectedEditId === edit.id
                    ? 'border-yellow-400'
                    : 'border-gray-700 hover:border-gray-600'
                )}
                onClick={() => {
                  if (edit.outputAssets.length > 0) {
                    setCanvasImages(edit.outputAssets.map((asset) => asset.url));
                    selectEdit(edit.id);
                    selectGeneration(null);
                    selectVideoGeneration(null);
                  }
                }}
              >
                {edit.outputAssets[0] ? (
                  <img
                    src={edit.outputAssets[0].url}
                    alt="Edited variant"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400" />
                  </div>
                )}

                {/* Edit Label */}
                <div className="absolute top-2 left-2 bg-purple-900/80 text-xs px-2 py-1 rounded">
                  Edit #{index + 1}
                </div>
              </div>
            ))}

            {/* Show video generations */}
            {videoGenerations.slice(-2).map((videoGen, index) => (
              <div
                key={videoGen.id}
                className={cn(
                  'relative aspect-video rounded-lg border-2 cursor-pointer transition-all duration-200 overflow-hidden',
                  selectedVideoGenerationId === videoGen.id
                    ? 'border-purple-400'
                    : 'border-gray-700 hover:border-gray-600'
                )}
                onClick={() => {
                  selectVideoGeneration(videoGen.id);
                  selectGeneration(null);
                  selectEdit(null);
                  if (videoGen.outputAsset?.url) {
                    setCanvasVideo(videoGen.outputAsset.url);
                  }
                }}
              >
                {videoGen.outputAsset ? (
                  <>
                    {/* Video thumbnail - use first frame of video or a placeholder */}
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <video
                        src={videoGen.outputAsset.url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    </div>
                    {/* Play icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-10 h-10 rounded-full bg-purple-500/80 flex items-center justify-center">
                        <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400" />
                  </div>
                )}

                {/* Video Label */}
                <div className="absolute top-2 left-2 bg-purple-600/80 text-xs px-2 py-1 rounded flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  Video #{index + 1}
                </div>

                {/* Duration badge */}
                {videoGen.outputAsset?.duration && (
                  <div className="absolute bottom-2 right-2 bg-gray-900/80 text-xs px-2 py-1 rounded">
                    {videoGen.outputAsset.duration}s
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current Image/Video Info */}
      {(canvasImage || canvasVideo || imageDimensions) && (
        <div className="mb-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
          <h4 className="text-xs font-medium text-gray-400 mb-2">
            {canvasVideo ? 'Current Video' : 'Current Image'}
          </h4>
          <div className="space-y-1 text-xs text-gray-500">
            {imageDimensions && !canvasVideo && (
              <div className="flex justify-between">
                <span>Dimensions:</span>
                <span className="text-gray-300">{imageDimensions.width} × {imageDimensions.height}</span>
              </div>
            )}
            {canvasVideo && selectedVideoGenerationId && (() => {
              const videoGen = videoGenerations.find(v => v.id === selectedVideoGenerationId);
              return videoGen?.outputAsset ? (
                <>
                  <div className="flex justify-between">
                    <span>Resolution:</span>
                    <span className="text-gray-300">{videoGen.outputAsset.width} × {videoGen.outputAsset.height}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="text-gray-300">{videoGen.outputAsset.duration}s</span>
                  </div>
                </>
              ) : null;
            })()}
            <div className="flex justify-between">
              <span>Mode:</span>
              <span className="text-gray-300 capitalize">{selectedTool}</span>
            </div>
          </div>
        </div>
      )}

      {/* Generation Details */}
      <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-700 flex-1 overflow-y-auto min-h-0">
        <h4 className="text-xs font-medium text-gray-400 mb-2">Generation Details</h4>
        {(() => {
          const gen = generations.find(g => g.id === selectedGenerationId);
          const selectedEdit = edits.find(e => e.id === selectedEditId);
          const videoGen = videoGenerations.find(v => v.id === selectedVideoGenerationId);

          if (videoGen) {
            return (
              <div className="space-y-3">
                <div className="space-y-2 text-xs text-gray-500">
                  <div>
                    <span className="text-gray-400">Prompt:</span>
                    <p className="text-gray-300 mt-1">{videoGen.prompt}</p>
                  </div>
                  {videoGen.negativePrompt && (
                    <div>
                      <span className="text-gray-400">Negative Prompt:</span>
                      <p className="text-gray-300 mt-1">{videoGen.negativePrompt}</p>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Model:</span>
                    <span className="text-purple-400">{videoGen.modelVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="text-purple-400 flex items-center gap-1">
                      <Video className="w-3 h-3" /> Video
                    </span>
                  </div>
                  {videoGen.parameters.aspectRatio && (
                    <div className="flex justify-between">
                      <span>Aspect Ratio:</span>
                      <span>{videoGen.parameters.aspectRatio}</span>
                    </div>
                  )}
                  {videoGen.parameters.resolution && (
                    <div className="flex justify-between">
                      <span>Resolution:</span>
                      <span>{videoGen.parameters.resolution}</span>
                    </div>
                  )}
                  {videoGen.parameters.durationSeconds && (
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{videoGen.parameters.durationSeconds}s</span>
                    </div>
                  )}
                  {videoGen.parameters.seed && (
                    <div className="flex justify-between">
                      <span>Seed:</span>
                      <span>{videoGen.parameters.seed}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{new Date(videoGen.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Start Frame */}
                {videoGen.startFrameAsset && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-400 mb-2">Start Frame</h5>
                    <button
                      onClick={() => setPreviewModal({
                        open: true,
                        imageUrl: videoGen.startFrameAsset!.url,
                        title: 'Start Frame',
                        description: 'The first frame used to guide the video generation'
                      })}
                      className="relative aspect-video w-20 rounded border border-purple-700 hover:border-purple-600 transition-colors overflow-hidden group"
                    >
                      <img
                        src={videoGen.startFrameAsset.url}
                        alt="Start frame"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ImageIcon className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  </div>
                )}

                {/* Last Frame */}
                {videoGen.lastFrameAsset && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-400 mb-2">Last Frame</h5>
                    <button
                      onClick={() => setPreviewModal({
                        open: true,
                        imageUrl: videoGen.lastFrameAsset!.url,
                        title: 'Last Frame',
                        description: 'The last frame used to guide the video generation'
                      })}
                      className="relative aspect-video w-20 rounded border border-purple-700 hover:border-purple-600 transition-colors overflow-hidden group"
                    >
                      <img
                        src={videoGen.lastFrameAsset.url}
                        alt="Last frame"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ImageIcon className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  </div>
                )}
              </div>
            );
          } else if (gen) {
            return (
              <div className="space-y-3">
                <div className="space-y-2 text-xs text-gray-500">
                  <div>
                    <span className="text-gray-400">Prompt:</span>
                    <p className="text-gray-300 mt-1">{gen.prompt}</p>
                  </div>
                  <div className="flex justify-between">
                    <span>Model:</span>
                    <span>{gen.modelVersion}</span>
                  </div>
                  {gen.parameters.seed && (
                    <div className="flex justify-between">
                      <span>Seed:</span>
                      <span>{gen.parameters.seed}</span>
                    </div>
                  )}
                </div>

                {/* Reference Images */}
                {gen.sourceAssets.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-400 mb-2">Reference Images</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {gen.sourceAssets.map((asset, index) => (
                        <button
                          key={asset.id}
                          onClick={() => setPreviewModal({
                            open: true,
                            imageUrl: asset.url,
                            title: `Reference Image ${index + 1}`,
                            description: 'This reference image was used to guide the generation'
                          })}
                          className="relative aspect-square rounded border border-gray-700 hover:border-gray-600 transition-colors overflow-hidden group"
                        >
                          <img
                            src={asset.url}
                            alt={`Reference ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="absolute bottom-1 left-1 bg-gray-900/80 text-xs px-1 py-0.5 rounded text-gray-300">
                            Ref {index + 1}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          } else if (selectedEdit) {
            const parentGen = generations.find(g => g.id === selectedEdit.parentGenerationId);
            return (
              <div className="space-y-3">
                <div className="space-y-2 text-xs text-gray-500">
                  <div>
                    <span className="text-gray-400">Edit Instruction:</span>
                    <p className="text-gray-300 mt-1">{selectedEdit.instruction}</p>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span>Image Edit</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{new Date(selectedEdit.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {selectedEdit.maskAssetId && (
                    <div className="flex justify-between">
                      <span>Mask:</span>
                      <span className="text-purple-400">Applied</span>
                    </div>
                  )}
                </div>

                {/* Parent Generation Reference */}
                {parentGen && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-400 mb-2">Original Image</h5>
                    <button
                      onClick={() => setPreviewModal({
                        open: true,
                        imageUrl: parentGen.outputAssets[0]?.url || '',
                        title: 'Original Image',
                        description: 'The base image that was edited'
                      })}
                      className="relative aspect-square w-16 rounded border border-gray-700 hover:border-gray-600 transition-colors overflow-hidden group"
                    >
                      <img
                        src={parentGen.outputAssets[0]?.url}
                        alt="Original"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ImageIcon className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  </div>
                )}

                {/* Mask Visualization */}
                {selectedEdit.maskReferenceAsset && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-400 mb-2">Masked Reference</h5>
                    <button
                      onClick={() => setPreviewModal({
                        open: true,
                        imageUrl: selectedEdit.maskReferenceAsset!.url,
                        title: 'Masked Reference Image',
                        description: 'This image with mask overlay was sent to the AI model to guide the edit'
                      })}
                      className="relative aspect-square w-16 rounded border border-gray-700 hover:border-gray-600 transition-colors overflow-hidden group"
                    >
                      <img
                        src={selectedEdit.maskReferenceAsset.url}
                        alt="Masked reference"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ImageIcon className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute bottom-1 left-1 bg-purple-900/80 text-xs px-1 py-0.5 rounded text-purple-300">
                        Mask
                      </div>
                    </button>
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <div className="space-y-2 text-xs text-gray-500">
                <p className="text-gray-400">Select a generation, edit, or video to view details</p>
              </div>
            );
          }
        })()}
      </div>

      {/* Actions */}
      <div className="space-y-3 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            // Check for video first
            if (selectedVideoGenerationId) {
              const videoGen = videoGenerations.find(v => v.id === selectedVideoGenerationId);
              const videoUrl = videoGen?.outputAsset?.url;
              if (videoUrl) {
                const link = document.createElement('a');
                link.href = videoUrl;
                link.download = `nano-banana-video-${Date.now()}.mp4`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
              return;
            }

            // Find the currently displayed image (either generation or edit)
            let imageUrl: string | null = null;

            if (selectedGenerationId) {
              const gen = generations.find(g => g.id === selectedGenerationId);
              imageUrl = gen?.outputAssets[0]?.url || null;
            } else {
              // If no generation selected, try to get the current canvas image
              const { canvasImage } = useAppStore.getState();
              imageUrl = canvasImage;
            }

            if (imageUrl) {
              // Handle both data URLs and regular URLs
              if (imageUrl.startsWith('data:')) {
                const link = document.createElement('a');
                link.href = imageUrl;
                link.download = `nano-banana-${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } else {
                // For external URLs, we need to fetch and convert to blob
                fetch(imageUrl)
                  .then(response => response.blob())
                  .then(blob => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `nano-banana-${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  });
              }
            }
          }}
          disabled={!selectedGenerationId && !selectedVideoGenerationId && !useAppStore.getState().canvasImage}
        >
          <Download className="h-4 w-4 mr-2" />
          {selectedVideoGenerationId ? 'Download Video' : 'Download'}
        </Button>
      </div>
      </>
      )}
      
      {/* Image Preview Modal */}
      <ImagePreviewModal
        open={previewModal.open}
        onOpenChange={(open) => setPreviewModal(prev => ({ ...prev, open }))}
        imageUrl={previewModal.imageUrl}
        title={previewModal.title}
        description={previewModal.description}
      />
    </div>
  );
};