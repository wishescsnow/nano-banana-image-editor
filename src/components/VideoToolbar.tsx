import React from 'react';
import { Play, Pause, Volume2, VolumeX, Download, SkipBack, SkipForward, Maximize2 } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';

interface VideoToolbarProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  muted: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onMuteToggle: () => void;
  onDownload: () => void;
  onFullscreen?: () => void;
  className?: string;
}

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const VideoToolbar: React.FC<VideoToolbarProps> = ({
  isPlaying,
  currentTime,
  duration,
  muted,
  onPlayPause,
  onSeek,
  onMuteToggle,
  onDownload,
  onFullscreen,
  className,
}) => {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onSeek(value);
  };

  const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    onSeek(Math.max(0, Math.min(duration, newTime)));
  };

  return (
    <div className={cn('flex justify-between items-center gap-3', className)}>
      {/* Left side - Playback controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSeek(0)}
          title="Restart"
        >
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onPlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSeek(duration)}
          title="End"
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>

      {/* Center - Timeline */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-xs text-gray-400 min-w-[36px] text-right font-mono">
          {formatTime(currentTime)}
        </span>
        <div
          className="flex-1 h-6 flex items-center cursor-pointer group"
          onClick={handleSliderClick}
        >
          <div className="relative w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
            {/* Progress bar */}
            <div
              className="absolute h-full bg-purple-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
            {/* Thumb indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>
        </div>
        <span className="text-xs text-gray-400 min-w-[36px] font-mono">
          {formatTime(duration)}
        </span>
      </div>

      {/* Right side - Volume, fullscreen, download */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMuteToggle}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </Button>
        {onFullscreen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onFullscreen}
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={onDownload}
          title="Download video"
        >
          <Download className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">Download</span>
        </Button>
      </div>
    </div>
  );
};
