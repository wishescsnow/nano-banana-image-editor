import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2, XCircle, Loader2, Trash2, RefreshCw, Copy, Video, Play } from 'lucide-react';
import { cn } from '../utils/cn';
import { CacheService } from '../services/cacheService';
import { geminiService } from '../services/geminiService';
import { BatchQueueRequest, VideoBatchQueueRequest } from '../types';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/Button';

// Combined type for queue items
type QueueItem = (BatchQueueRequest & { isVideo?: false }) | (VideoBatchQueueRequest & { isVideo: true });

export const QueuedRequestsPanel: React.FC = () => {
  const [queuedRequests, setQueuedRequests] = useState<QueueItem[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { setCanvasImage, setCanvasImages, setCanvasZoom, setCanvasPan, setCanvasVideo } = useAppStore();

  // Helper to load image and reset canvas view
  const loadImageToCanvas = (base64Data: string | string[]) => {
    // Clear video first so image shows
    setCanvasVideo(null);
    // Reset zoom/pan so the new image is visible
    setCanvasZoom(1);
    setCanvasPan({ x: 0, y: 0 });
    if (Array.isArray(base64Data)) {
      const urls = base64Data.map((data) => `data:image/png;base64,${data}`);
      setCanvasImages(urls);
    } else {
      setCanvasImage(`data:image/png;base64,${base64Data}`);
    }
  };

  // Helper to load video to canvas
  const loadVideoToCanvas = (base64Data: string) => {
    // Clear image first so video shows
    setCanvasImage(null);
    setCanvasVideo(`data:video/mp4;base64,${base64Data}`);
  };

  const loadQueuedRequests = async () => {
    const imageRequests = await CacheService.getAllQueuedRequests();
    const videoRequests = await CacheService.getAllVideoQueuedRequests();

    // Combine and mark video requests
    const combinedRequests: QueueItem[] = [
      ...imageRequests.map(r => ({ ...r, isVideo: false as const })),
      ...videoRequests.map(r => ({ ...r, isVideo: true as const }))
    ];

    // Sort by creation time, newest first
    combinedRequests.sort((a, b) => b.createdAt - a.createdAt);
    setQueuedRequests(combinedRequests);
  };

  useEffect(() => {
    loadQueuedRequests();
  }, []);

  const handleSelectRequest = async (request: QueueItem) => {
    setSelectedRequestId(request.id);

    // Handle video requests
    if (request.isVideo) {
      const freshRequest = await CacheService.getVideoQueuedRequest(request.id);
      if (!freshRequest) return;

      // If already succeeded, load the result
      if (freshRequest.status === 'succeeded' && freshRequest.resultVideo) {
        console.log('Loading cached video result');
        loadVideoToCanvas(freshRequest.resultVideo);
        return;
      }

      // Video operations use operation polling, not batch jobs
      // The video generation hook handles polling, so we just load what's available
      if (freshRequest.status === 'processing' && freshRequest.operationName) {
        try {
          const status = await geminiService.getVideoOperationStatus(freshRequest.operationName);

          if (status.state === 'SUCCEEDED') {
            const result = await geminiService.getVideoOperationResult(freshRequest.operationName);

            await CacheService.updateVideoQueuedRequest(freshRequest.id, {
              status: 'succeeded',
              resultVideo: result.video,
              completedAt: Date.now()
            });

            loadVideoToCanvas(result.video);
            loadQueuedRequests();
          } else if (status.state === 'FAILED') {
            await CacheService.updateVideoQueuedRequest(freshRequest.id, {
              status: 'failed',
              error: status.error || 'Video generation failed'
            });
            loadQueuedRequests();
          }
        } catch (error) {
          console.error('Error checking video operation status:', error);
        }
      }
      return;
    }

    // Handle image requests
    const freshRequest = await CacheService.getQueuedRequest(request.id);
    if (!freshRequest) return;

    // If already succeeded, load the result
    if (freshRequest.status === 'succeeded' && freshRequest.resultImages?.length) {
      console.log('Loading cached result image');
      loadImageToCanvas(freshRequest.resultImages);
      return;
    }

    // If submitted, check status
    if (freshRequest.status === 'submitted' && freshRequest.batchJobName) {
      try {
        const { state } = await geminiService.getBatchStatus(freshRequest.batchJobName);

        if (state === 'JOB_STATE_SUCCEEDED') {
          const images = await geminiService.getBatchResults(freshRequest.batchJobName);

          await CacheService.updateQueuedRequest(freshRequest.id, {
            status: 'succeeded',
            resultImages: images,
            completedAt: Date.now()
          });

          if (images.length > 0) {
            console.log('Loading newly fetched result image');
            loadImageToCanvas(images);
          }

          loadQueuedRequests();
        } else if (state === 'JOB_STATE_FAILED' || state === 'JOB_STATE_CANCELLED') {
          await CacheService.updateQueuedRequest(freshRequest.id, {
            status: 'failed',
            error: `Job ${state.replace('JOB_STATE_', '').toLowerCase()}`
          });
          loadQueuedRequests();
        }
      } catch (error) {
        console.error('Error checking batch status:', error);
      }
    }
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);

    for (const request of queuedRequests) {
      // Handle video requests
      if (request.isVideo) {
        if ((request.status === 'submitted' || request.status === 'processing') && request.operationName) {
          try {
            const status = await geminiService.getVideoOperationStatus(request.operationName);

            if (status.state === 'SUCCEEDED') {
              const result = await geminiService.getVideoOperationResult(request.operationName);
              await CacheService.updateVideoQueuedRequest(request.id, {
                status: 'succeeded',
                resultVideo: result.video,
                completedAt: Date.now()
              });
            } else if (status.state === 'FAILED') {
              await CacheService.updateVideoQueuedRequest(request.id, {
                status: 'failed',
                error: status.error || 'Video generation failed'
              });
            }
          } catch (error) {
            console.error('Error checking video operation status:', error);
          }
        }
        continue;
      }

      // Handle image requests
      if (request.status === 'submitted' && request.batchJobName) {
        try {
          const { state } = await geminiService.getBatchStatus(request.batchJobName);

          if (state === 'JOB_STATE_SUCCEEDED') {
            const images = await geminiService.getBatchResults(request.batchJobName);
            await CacheService.updateQueuedRequest(request.id, {
              status: 'succeeded',
              resultImages: images,
              completedAt: Date.now()
            });
          } else if (state === 'JOB_STATE_FAILED' || state === 'JOB_STATE_CANCELLED') {
            await CacheService.updateQueuedRequest(request.id, {
              status: 'failed',
              error: `Job ${state.replace('JOB_STATE_', '').toLowerCase()}`
            });
          }
        } catch (error) {
          console.error('Error checking batch status:', error);
        }
      }
    }

    await loadQueuedRequests();
    setIsRefreshing(false);
  };

  const handleDeleteRequest = async (id: string, isVideo: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isVideo) {
      await CacheService.deleteVideoQueuedRequest(id);
    } else {
      await CacheService.deleteQueuedRequest(id);
    }
    loadQueuedRequests();
    if (selectedRequestId === id) {
      setSelectedRequestId(null);
    }
  };

  const handleCopyPrompt = async (prompt: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(prompt);
  };

  const getStatusIcon = (status: BatchQueueRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'submitted':
        return <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />;
      case 'succeeded':
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />;
    }
  };

  const getStatusText = (status: BatchQueueRequest['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'submitted':
        return 'Processing...';
      case 'succeeded':
        return 'Completed';
      case 'failed':
        return 'Failed';
    }
  };

  const formatTimestamp = (ts: number) =>
    new Date(ts).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

  const renderTypeChip = (request: QueueItem) => {
    const baseClasses =
      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border gap-1';

    if (request.isVideo) {
      return (
        <span className={`${baseClasses} bg-purple-500/10 text-purple-200 border-purple-400/30`}>
          <Video className="w-3 h-3" />
          Video
        </span>
      );
    }

    const variantClasses =
      request.type === 'generate'
        ? 'bg-yellow-500/10 text-yellow-200 border-yellow-400/30'
        : 'bg-blue-500/10 text-blue-200 border-blue-400/30';

    return (
      <span className={`${baseClasses} ${variantClasses}`}>
        {request.type === 'generate' ? 'Generate' : 'Edit'}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-medium text-gray-400">Queued Requests</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefreshAll}
          disabled={isRefreshing}
          className="h-6 px-2"
        >
          <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
        </Button>
      </div>

      {/* Queue List */}
      {queuedRequests.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-sm text-gray-500">No queued requests</p>
          <p className="text-xs text-gray-600 mt-1">
            Use the dropdown on Generate to queue requests
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          {queuedRequests.map((request) => (
            <div
              key={request.id}
              onClick={() => handleSelectRequest(request)}
              className={cn(
                'p-3 rounded-lg border cursor-pointer transition-all duration-200',
                selectedRequestId === request.id
                  ? request.isVideo
                    ? 'bg-purple-400/10 border-purple-400/50'
                    : 'bg-yellow-400/10 border-yellow-400/50'
                  : 'bg-gray-900 border-gray-700 hover:border-gray-600'
              )}
            >
              {/* Status and Delete */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(request.status)}
                  <span className="text-xs text-gray-400">
                    {getStatusText(request.status)}
                    {request.isVideo && request.status === 'processing' && request.progressPercent !== undefined && (
                      <span className="ml-1 text-purple-400">{Math.round(request.progressPercent * 100)}%</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => handleCopyPrompt(request.prompt, e)}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                    title="Copy prompt"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteRequest(request.id, !!request.isVideo, e)}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Prompt Preview */}
              <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                {request.prompt}
              </p>

              {/* Variant / image count or video info */}
              <div className="flex justify-between items-center text-[11px] text-gray-500 mb-2">
                {request.isVideo ? (
                  <span>
                    {request.durationSeconds}s • {request.aspectRatio} • {request.resolution}
                  </span>
                ) : (
                  <span>
                    Images: {request.resultImages ? `${request.resultImages.length}/${request.variantCount ?? 1}` : (request.variantCount ?? 1)}
                  </span>
                )}
                {renderTypeChip(request)}
              </div>

              {/* Result Preview - Image */}
              {!request.isVideo && request.status === 'succeeded' && request.resultImages?.[0] && (
                <div className="mt-2">
                  <img
                    src={`data:image/png;base64,${request.resultImages[0]}`}
                    alt="Result"
                    className="w-full h-20 object-cover rounded border border-gray-700"
                  />
                </div>
              )}

              {/* Result Preview - Video */}
              {request.isVideo && request.status === 'succeeded' && request.resultVideo && (
                <div className="mt-2 relative">
                  <video
                    src={`data:video/mp4;base64,${request.resultVideo}`}
                    className="w-full h-20 object-cover rounded border border-purple-700"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded">
                    <div className="w-8 h-8 rounded-full bg-purple-500/80 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {request.status === 'failed' && request.error && (
                <p className="text-xs text-red-400 mt-1">{request.error}</p>
              )}

              {/* Timestamp */}
              <div className="flex justify-end text-xs text-gray-500 mt-2">
                <span>{formatTimestamp(request.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

