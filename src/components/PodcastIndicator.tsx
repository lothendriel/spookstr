import { usePodcast } from '@/contexts/PodcastContext';
import { Button } from '@/components/ui/button';
import {
  Volume2,
  Play,
  Pause,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useState } from 'react';

export function PodcastIndicator() {
  const {
    currentPodcast,
    isPlaying,
    isPoppedOut,
    togglePlayPause,
    togglePopOut
  } = usePodcast();

  const [isExpanded, setIsExpanded] = useState(false);

  // Only show indicator when podcast is popped out
  // This gives users access to controls when the main carousel is hidden
  if (!currentPodcast || !isPlaying || !isPoppedOut) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className={`bg-black/95 backdrop-blur-md border border-lime-500/30 rounded-lg shadow-xl transition-all duration-300 ${
        isExpanded ? 'w-80' : 'w-auto'
      }`}>
        <div className="flex items-center p-3 space-x-3">
          {/* Audio animation */}
          <div className="flex items-center space-x-1">
            <div className="w-1 h-4 bg-lime-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1 h-6 bg-lime-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1 h-3 bg-lime-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
          </div>

          {/* Podcast info (only when expanded) */}
          {isExpanded && (
            <div className="flex-1 min-w-0">
              <p className="text-sm text-lime-400 font-medium truncate">
                {currentPodcast.title}
              </p>
              <p className="text-xs text-lime-500/60">
                Playing in pop-out player
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlayPause}
              className="h-8 w-8 text-lime-400 hover:text-lime-300 hover:bg-lime-500/20"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={togglePopOut}
              className="h-8 w-8 text-lime-400 hover:text-lime-300 hover:bg-lime-500/20"
              title="Return to main player"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>

            {/* Expand/Collapse button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 text-lime-400 hover:text-lime-300 hover:bg-lime-500/20"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}