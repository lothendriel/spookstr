import { usePodcast } from '@/contexts/PodcastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export function PopOutPodcastPlayer() {
  const {
    currentPodcast,
    isPlaying,
    isPoppedOut,
    togglePlayPause,
    togglePopOut,
    closePopOut
  } = usePodcast();

  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

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
      const maxX = window.innerWidth - 400; // 400px is approximate width
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



  if (!isPoppedOut || !currentPodcast) return null;

  return (
    <div
      className="fixed z-50 shadow-2xl border border-lime-500/30 rounded-lg overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '400px',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <Card className="border-0 bg-black/95 backdrop-blur-md">
        {/* Draggable Header */}
        <CardHeader
          className="pb-2 cursor-grab active:cursor-grabbing bg-gradient-to-r from-lime-600/20 to-lime-400/20"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-lime-400 truncate">
              {currentPodcast.title}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={closePopOut}
              className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-0">
          <div
            dangerouslySetInnerHTML={{ __html: currentPodcast.embedCode.replace('height="400"', 'height="120"') }}
            className="scale-90 origin-top"
          />
        </CardContent>
      </Card>
    </div>
  );
}