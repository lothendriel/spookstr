import { usePodcast } from '@/contexts/PodcastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const podcastEmbeds = [
  {
    title: "Coast to Coast AM",
    embedCode: `<iframe allow="autoplay" width="100%" height="400" src="https://www.iheart.com/podcast/1100-the-best-of-coast-to-coas-18899828/?embed=true" frameborder="0"></iframe>`
  },
  {
    title: "Sasquatch Chronicles",
    embedCode: `<iframe allow="autoplay" width="100%" height="400" src="https://www.iheart.com/podcast/267-sasquatch-chronicles-29414973/?embed=true" frameborder="0"></iframe>`
  },
  {
    title: "Strange Familiars",
    embedCode: `<iframe allow="autoplay" width="100%" height="400" src="https://www.iheart.com/podcast/269-strange-familiars-88536416/?embed=true" frameborder="0"></iframe>`
  },
  {
    title: "The Confessionals",
    embedCode: `<iframe allow="autoplay" width="100%" height="400" src="https://www.iheart.com/podcast/267-the-confessionals-29768844/?embed=true" frameborder="0"></iframe>`
  },
  {
    title: "Bigfoot and Beyond",
    embedCode: `<iframe allow="autoplay" width="100%" height="400" src="https://www.iheart.com/podcast/267-bigfoot-and-beyond-with-cl-63055511/?embed=true" frameborder="0"></iframe>`
  }
];

export function PopOutPodcastPlayer() {
  const {
    currentPodcast,
    isPoppedOut,
    closePopOut,
    playPodcast
  } = usePodcast();

  const [currentPodcastIndex, setCurrentPodcastIndex] = useState(0);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Handle iframe messaging for play/pause state
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handle messages from the iframe if needed
      if (event.data.type === 'podcast-state') {
        // Update local state based on iframe messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;

      // Keep within viewport bounds
      const maxX = window.innerWidth - 320; // 320px is approximate width
      const maxY = window.innerHeight - 200; // 200px is approximate height

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Find current podcast index
  useEffect(() => {
    if (currentPodcast) {
      const index = podcastEmbeds.findIndex(p => p.title === currentPodcast.title);
      if (index !== -1) {
        setCurrentPodcastIndex(index);
      }
    }
  }, [currentPodcast]);

  const goToPreviousPodcast = () => {
    const newIndex = currentPodcastIndex === 0 ? podcastEmbeds.length - 1 : currentPodcastIndex - 1;
    setCurrentPodcastIndex(newIndex);
    playPodcast(podcastEmbeds[newIndex]);
  };

  const goToNextPodcast = () => {
    const newIndex = currentPodcastIndex === podcastEmbeds.length - 1 ? 0 : currentPodcastIndex + 1;
    setCurrentPodcastIndex(newIndex);
    playPodcast(podcastEmbeds[newIndex]);
  };

  if (!isPoppedOut || !currentPodcast) return null;

  return (
    <div
      className="fixed z-50 shadow-2xl border border-lime-500/30 rounded-lg overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '320px',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <Card className="border-0 bg-black/95 backdrop-blur-md">
        {/* Minimal Draggable Header with Navigation */}
        <CardHeader
          className="pb-2 cursor-grab active:cursor-grabbing bg-gradient-to-r from-lime-600/20 to-lime-400/20"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousPodcast}
                className="h-6 w-6 text-lime-400 hover:text-lime-300 hover:bg-lime-500/20 flex-shrink-0"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <CardTitle className="text-sm text-lime-400 truncate">
                {currentPodcast.title}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextPodcast}
                className="h-6 w-6 text-lime-400 hover:text-lime-300 hover:bg-lime-500/20 flex-shrink-0"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={closePopOut}
              className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20 flex-shrink-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>

        {/* Minimal Content - Ultra Compact */}
        <CardContent className="p-0">
          <div
            dangerouslySetInnerHTML={{ __html: currentPodcast.embedCode.replace('height="400"', 'height="120"') }}
            style={{ transform: 'scale(0.85)', transformOrigin: 'top center', height: '102px', overflow: 'hidden' }}
          />
        </CardContent>
      </Card>
    </div>
  );
}