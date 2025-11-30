import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2, XCircle, Loader2, Trash2, RefreshCw, Copy } from 'lucide-react';
import { cn } from '../utils/cn';
import { CacheService } from '../services/cacheService';
import { geminiService } from '../services/geminiService';
import { BatchQueueRequest } from '../types';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/Button';

export const QueuedRequestsPanel: React.FC = () => {
  const [queuedRequests, setQueuedRequests] = useState<BatchQueueRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { setCanvasImage, setCanvasZoom, setCanvasPan } = useAppStore();

  // Helper to load image and reset canvas view
  const loadImageToCanvas = (base64Data: string) => {
    // Reset zoom/pan so the new image is visible
    setCanvasZoom(1);
    setCanvasPan({ x: 0, y: 0 });
    setCanvasImage(`data:image/png;base64,${base64Data}`);
  };

  const loadQueuedRequests = async () => {
    const requests = await CacheService.getAllQueuedRequests();
    setQueuedRequests(requests);
  };

  useEffect(() => {
    loadQueuedRequests();
  }, []);

  const handleSelectRequest = async (request: BatchQueueRequest) => {
    setSelectedRequestId(request.id);

    // Always fetch fresh data from cache first
    const freshRequest = await CacheService.getQueuedRequest(request.id);
    if (!freshRequest) return;

    // If already succeeded, load the result
    if (freshRequest.status === 'succeeded' && freshRequest.resultImages?.length) {
      console.log('Loading cached result image');
      loadImageToCanvas(freshRequest.resultImages[0]);
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
            loadImageToCanvas(images[0]);
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

  const handleDeleteRequest = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await CacheService.deleteQueuedRequest(id);
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
                  ? 'bg-yellow-400/10 border-yellow-400/50'
                  : 'bg-gray-900 border-gray-700 hover:border-gray-600'
              )}
            >
              {/* Status and Delete */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(request.status)}
                  <span className="text-xs text-gray-400">
                    {getStatusText(request.status)}
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
                    onClick={(e) => handleDeleteRequest(request.id, e)}
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

              {/* Result Preview */}
              {request.status === 'succeeded' && request.resultImages?.[0] && (
                <div className="mt-2">
                  <img
                    src={`data:image/png;base64,${request.resultImages[0]}`}
                    alt="Result"
                    className="w-full h-20 object-cover rounded border border-gray-700"
                  />
                </div>
              )}

              {/* Error Message */}
              {request.status === 'failed' && request.error && (
                <p className="text-xs text-red-400 mt-1">{request.error}</p>
              )}

              {/* Timestamp */}
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{request.type === 'generate' ? 'Generate' : 'Edit'}</span>
                <span>{new Date(request.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

