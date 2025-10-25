import { usePodcast } from '@/contexts/PodcastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Minimize2, 
  Play, 
  Pause, 
  X, 
  Volume2,
  VolumeX,
  Maximize2
} from 'lucide-react';
import { useState, useEffect } from 'react';

export function PopOutPodcastPlayer() {
  const { 
    currentPodcast, 
    isPlaying, 
    isPoppedOut, 
    togglePlayPause, 
    togglePopOut, 
    closePopOut 
  } = usePodcast();
  
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Toggle mute by sending message to iframe
  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Note: iHeart iframe doesn't expose mute controls via postMessage
    // This is a visual indicator only
  };

  if (!isPoppedOut || !currentPodcast) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Card className={`bg-black/95 backdrop-blur-md border border-lime-500/30 shadow-xl transition-all duration-300 ${
        isExpanded ? 'w-96' : 'w-80'
      }`}>
        <CardContent className="p-4">
          {/* Header with controls */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {/* Audio animation */}
              <div className="flex items-center space-x-1 flex-shrink-0">
                <div className="w-1 h-3 bg-lime-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-5 bg-lime-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-4 bg-lime-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
              </div>
              
              {/* Podcast title */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-lime-400 font-medium truncate">
                  {currentPodcast.title}
                </p>
                <p className="text-xs text-lime-500/60">
                  {isPlaying ? 'Now Playing' : 'Paused'}
                </p>
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex items-center space-x-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="h-7 w-7 text-lime-400 hover:text-lime-300 hover:bg-lime-500/20"
              >
                {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlayPause}
                className="h-7 w-7 text-lime-400 hover:text-lime-300 hover:bg-lime-500/20"
              >
                {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 w-7 text-lime-400 hover:text-lime-300 hover:bg-lime-500/20"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePopOut}
                className="h-7 w-7 text-lime-400 hover:text-lime-300 hover:bg-lime-500/20"
                title="Minimize to indicator"
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={closePopOut}
                className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                title="Close player"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Expandable content - podcast player iframe */}
          {isExpanded && (
            <div className="mt-3 border-t border-lime-500/20 pt-3">
              <div
                dangerouslySetInnerHTML={{ __html: currentPodcast.embedCode.replace('height="400"', 'height="250"') }}
                className="scale-95 origin-top"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}