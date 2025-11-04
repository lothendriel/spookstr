import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MediaDisplay } from '@/components/MediaDisplay';
import { MediaItem } from '@/lib/mediaParser';
import { X, ChevronLeft, ChevronRight, Download, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export function MediaLightbox({ 
  isOpen, 
  onClose, 
  media, 
  currentIndex, 
  onIndexChange 
}: MediaLightboxProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);

  const currentItem = media[currentIndex];
  const hasMultiple = media.length > 1;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasMultiple && currentIndex > 0) {
            onIndexChange(currentIndex - 1);
          }
          break;
        case 'ArrowRight':
          if (hasMultiple && currentIndex < media.length - 1) {
            onIndexChange(currentIndex + 1);
          }
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, currentIndex, hasMultiple, onClose, onIndexChange]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!lightboxRef.current) return;

    if (!document.fullscreenElement) {
      lightboxRef.current.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < media.length - 1) {
      onIndexChange(currentIndex + 1);
    }
  };

  const handleDownload = () => {
    if (currentItem?.url) {
      const link = document.createElement('a');
      link.href = currentItem.url;
      link.download = currentItem.title || `media_${currentIndex + 1}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExternalLink = () => {
    if (currentItem?.url) {
      window.open(currentItem.url, '_blank');
    }
  };

  if (!currentItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        ref={lightboxRef}
        className={cn(
          "max-w-[95vw] max-h-[95vh] p-0 bg-black border-none",
          "flex flex-col items-center justify-center",
          isFullscreen && "w-screen h-screen max-w-none max-h-none"
        )}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 z-50 h-8 w-8 p-0 text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Navigation buttons */}
        {hasMultiple && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 z-50 h-8 w-8 p-0",
                "text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              onClick={goToPrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 z-50 h-8 w-8 p-0",
                "text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              onClick={goToNext}
              disabled={currentIndex === media.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Media counter */}
        {hasMultiple && (
          <div className="absolute top-4 left-4 z-50 bg-black/60 text-white text-xs px-2 py-1 rounded">
            {currentIndex + 1} / {media.length}
          </div>
        )}

        {/* Action buttons */}
        <div className="absolute bottom-4 right-4 z-50 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-white hover:bg-white/20"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-white hover:bg-white/20"
            onClick={handleExternalLink}
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-white hover:bg-white/20"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a1 1 0 011-1h4a1 1 0 010 2v2a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm0 8v4a1 1 0 001 1h4a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1zm12 0a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2a1 1 0 011-1h4a1 1 0 011 1v4zm0-8a1 1 0 00-1-1h-4a1 1 0 00-1 1v2a1 1 0 001 1h4a1 1 0 001-1V4z" clipRule="evenodd"/>
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 10v-4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1zm14-4a1 1 0 00-1-1h-4a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1v-4zm0-10a1 1 0 00-1-1h-4a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V4z" clipRule="evenodd"/>
              </svg>
            )}
          </Button>
        </div>

        {/* Media content */}
        <div className="w-full h-full flex items-center justify-center p-4">
          <MediaDisplay
            media={currentItem}
            className="max-w-full max-h-full"
          />
        </div>

        {/* Media info overlay */}
        <div className="absolute bottom-4 left-4 z-50 max-w-xs">
          <div className="bg-black/60 text-white p-3 rounded-lg backdrop-blur-sm">
            <h3 className="font-medium text-sm mb-1 truncate">
              {currentItem.title || `Media ${currentIndex + 1}`}
            </h3>
            <p className="text-xs text-gray-300 truncate">
              {currentItem.type.toUpperCase()}
              {currentItem.metadata?.format && ` • ${currentItem.metadata.format.toUpperCase()}`}
            </p>
            {currentItem.description && (
              <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                {currentItem.description}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}