import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePodcast } from '@/contexts/PodcastContext';
import {
  Play,
  Pause,
  Maximize2,
  Volume2,
  VolumeX,
  X,
  RotateCcw
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function PodcastPlayerCard() {
  const {
    currentPodcast,
    isPlaying,
    isPoppedOut,
    playPodcast,
    pausePodcast,
    togglePlayPause,
    togglePopOut,
    stopPodcast
  } = usePodcast();

  const [isMuted, setIsMuted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Default podcast if none is selected
  const defaultPodcast = {
    title: "Coast to Coast AM",
    embedCode: `<iframe allow="autoplay" width="100%" height="400" src="https://www.iheart.com/podcast/1100-the-best-of-coast-to-coas-18899828/?embed=true" frameborder="0"></iframe>`
  };

  const displayPodcast = currentPodcast || defaultPodcast;

  const handlePlay = () => {
    if (!currentPodcast) {
      playPodcast(defaultPodcast);
    } else {
      togglePlayPause();
    }
  };

  const handlePopOut = () => {
    togglePopOut();
  };

  const handleStop = () => {
    stopPodcast();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Note: iHeart iframe doesn't expose mute controls via postMessage
    // This is a visual indicator only
  };

  // Don't show the main card if the player is popped out
  if (isPoppedOut && currentPodcast) {
    return null;
  }

  return (
    <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lime-400 flex items-center space-x-2">
            <Volume2 className="h-5 w-5" />
            <span>{displayPodcast.title}</span>
            {isPlaying && (
              <div className="flex items-center space-x-1 ml-2">
                <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-lime-400">Playing</span>
              </div>
            )}
          </CardTitle>

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="h-8 w-8 text-lime-400 hover:text-lime-300 hover:bg-lime-500/20"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlay}
              className="h-8 w-8 text-lime-400 hover:text-lime-300 hover:bg-lime-500/20"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            {currentPodcast && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePopOut}
                  className="h-8 w-8 text-lime-400 hover:text-lime-300 hover:bg-lime-500/20"
                  title="Pop out player"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleStop}
                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                  title="Stop podcast"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div
          dangerouslySetInnerHTML={{ __html: displayPodcast.embedCode }}
          ref={iframeRef}
        />
      </CardContent>
    </Card>
  );
}