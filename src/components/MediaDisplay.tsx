import { useState, useEffect } from 'react';
import { MediaItem } from '@/lib/mediaParser';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, Maximize, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LinkPreview } from '@/components/LinkPreview';

interface MediaDisplayProps {
  media: MediaItem;
  className?: string;
}

export function MediaDisplay({ media, className }: MediaDisplayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(media.type === 'youtube');
  const [error, setError] = useState<string | null>(null);

  // Add timeout for YouTube loading
  useEffect(() => {
    if (media.type === 'youtube' && isLoading) {
      const timeout = setTimeout(() => {
        if (isLoading) {
          setError('Video is taking too long to load');
          setIsLoading(false);
        }
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [media.type, isLoading]);

  const handleMediaError = () => {
    setError('Failed to load media');
    setIsLoading(false);
  };

  const handleMediaLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const togglePlay = () => {
    const video = document.getElementById(`media-${media.url}`) as HTMLVideoElement;
    if (video) {
      if (video.paused) {
        video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    const video = document.getElementById(`media-${media.url}`) as HTMLVideoElement;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    const video = document.getElementById(`media-${media.url}`) as HTMLVideoElement;
    if (video) {
      if (!document.fullscreenElement) {
        video.requestFullscreen();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const renderMedia = () => {
    switch (media.type) {
      case 'image':
        return (
          <div className="relative group">
            {isLoading && (
              <div className="absolute inset-0 bg-lime-500/10 animate-pulse rounded-lg" />
            )}
            <img
              src={media.url}
              alt={media.alt || 'Image'}
              className={cn(
                "w-full h-auto rounded-lg transition-all duration-300",
                "hover:scale-[1.02] hover:shadow-lg hover:shadow-lime-500/20",
                error && "hidden"
              )}
              onLoad={handleMediaLoad}
              onError={handleMediaError}
            />
            {error && (
              <div className="p-4 text-center text-lime-500/60 bg-lime-500/5 rounded-lg">
                Failed to load image
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="relative group">
            {isLoading && (
              <div className="absolute inset-0 bg-lime-500/10 animate-pulse rounded-lg flex items-center justify-center">
                <div className="text-lime-500">Loading video...</div>
              </div>
            )}

            <video
              id={`media-${media.url}`}
              className={cn(
                "w-full h-auto rounded-lg",
                error && "hidden"
              )}
              controls={false}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedData={handleMediaLoad}
              onError={handleMediaError}
              poster={media.thumbnail}
            >
              <source src={media.url} type={`video/${media.metadata?.format || 'mp4'}`} />
              Your browser does not support the video tag.
            </video>

            {!error && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center space-x-2 bg-black/60 rounded-lg p-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                    onClick={togglePlay}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                    onClick={toggleMute}
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                    onClick={toggleFullscreen}
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-white hover:bg-white/20 bg-black/60"
                  onClick={() => window.open(media.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            )}

            {error && (
              <div className="p-4 text-center text-lime-500/60 bg-lime-500/5 rounded-lg">
                Failed to load video
              </div>
            )}
          </div>
        );

      case 'audio':
        return (
          <Card className="bg-lime-500/5 border-lime-500/20 p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-lime-500/20 rounded-lg flex items-center justify-center">
                  <Volume2 className="h-6 w-6 text-lime-500" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-lime-100 truncate">
                  {media.title || 'Audio'}
                </p>
                <p className="text-xs text-lime-500/60">
                  {media.metadata?.format?.toUpperCase() || 'MP3'}
                </p>
              </div>
              <audio
                controls
                className="w-32"
                onError={handleMediaError}
              >
                <source src={media.url} type={`audio/${media.metadata?.format || 'mp3'}`} />
                Your browser does not support the audio element.
              </audio>
            </div>
          </Card>
        );

      case 'youtube':
        const videoId = extractYouTubeId(media.url);
        if (!videoId) {
          return (
            <Card className="bg-lime-500/5 border-lime-500/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-lime-500/20 rounded-lg flex items-center justify-center">
                      <ExternalLink className="h-6 w-6 text-lime-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-lime-100">
                      Invalid YouTube URL
                    </p>
                    <p className="text-xs text-lime-500/60 truncate max-w-xs">
                      {media.url}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-lime-500/30 text-lime-400 hover:bg-lime-500/10"
                  onClick={() => window.open(media.url, '_blank')}
                >
                  Open
                </Button>
              </div>
            </Card>
          );
        }

        return (
          <div className="relative rounded-lg overflow-hidden bg-black group">
            <div className="relative pb-[56.25%] h-0">
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${window.location.origin}`}
                title={media.title || 'YouTube Video'}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                onError={handleMediaError}
                onLoad={handleMediaLoad}
              />
            </div>

            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
                <div className="text-lime-400">Loading video...</div>
              </div>
            )}

            {/* Error overlay */}
            {error && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded-lg p-4">
                <div className="text-red-400 text-center mb-3">Failed to load YouTube video</div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 mb-2"
                  onClick={() => window.open(media.url, '_blank')}
                >
                  Watch on YouTube
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-lime-400 hover:text-lime-300"
                  onClick={() => {
                    setError(null);
                    setIsLoading(true);
                    // Force reload the iframe by changing the src
                    const iframe = document.querySelector(`iframe[src*="${videoId}"]`) as HTMLIFrameElement;
                    if (iframe) {
                      iframe.src = iframe.src;
                    }
                  }}
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* External link button */}
            {!isLoading && !error && (
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-white hover:bg-white/20 bg-black/60"
                  onClick={() => window.open(media.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        );

      case 'vimeo':
        return (
          <div className="relative rounded-lg overflow-hidden bg-black">
            <div className="relative pb-[56.25%] h-0">
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`https://player.vimeo.com/video/${extractVimeoId(media.url)}?badge=0&byline=0&portrait=0`}
                title={media.title || 'Vimeo Video'}
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                onError={handleMediaError}
              />
            </div>
            <div className="absolute bottom-2 right-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 bg-black/60"
                onClick={() => window.open(media.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'link':
        return <LinkPreview media={media} />;

      case 'external':
        return (
          <Card className="bg-lime-500/5 border-lime-500/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-lime-500/20 rounded-lg flex items-center justify-center">
                    <ExternalLink className="h-6 w-6 text-lime-500" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-lime-100">
                    {media.title || 'External Media'}
                  </p>
                  <p className="text-xs text-lime-500/60 truncate max-w-xs">
                    {media.url}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-lime-500/30 text-lime-400 hover:bg-lime-500/10"
                onClick={() => window.open(media.url, '_blank')}
              >
                Open
              </Button>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn("my-3 first:mt-0 last:mb-0", className)}>
      {renderMedia()}
    </div>
  );
}

// Helper functions to extract IDs from URLs
function extractYouTubeId(url: string): string {
  try {
    // Handle various YouTube URL formats
    const patterns = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (error) {
    console.warn('Failed to extract YouTube ID from:', url, error);
  }

  return '';
}

function extractVimeoId(url: string): string {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : '';
}