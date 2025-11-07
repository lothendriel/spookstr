import { useState, useRef, useEffect } from 'react';
import { MediaItem } from '@/lib/mediaParser';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, Maximize, ExternalLink, Minimize, SkipBack, SkipForward, Settings, PictureInPicture2, Star } from 'lucide-react';
import { IMDBPreview } from './IMDBPreview';
import { cn } from '@/lib/utils';
import { LinkPreview } from '@/components/LinkPreview';
import { fetchInstagramOEmbed } from '@/lib/instagramAuth';

// Instagram Embed Component
function InstagramEmbed({ url, instagramId, instagramType }: { url: string; instagramId: string; instagramType: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [embedHtml, setEmbedHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch Instagram oEmbed data
    const fetchEmbed = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Use our Instagram authentication utility
        const data = await fetchInstagramOEmbed(url);

        if (data && data.html) {
          setEmbedHtml(data.html);
          setIsLoading(false);

          // Load Instagram embed script if not already loaded
          if (!(window as any).instgrm) {
            const script = document.createElement('script');
            script.src = '//www.instagram.com/embed.js';
            script.async = true;
            script.onload = () => {
              if ((window as any).instgrm?.Embeds?.process) {
                (window as any).instgrm.Embeds.process();
              }
            };
            document.body.appendChild(script);
          } else {
            // Script already loaded, just process embeds
            setTimeout(() => {
              if ((window as any).instgrm?.Embeds?.process) {
                (window as any).instgrm.Embeds.process();
              }
            }, 100);
          }
        } else {
          throw new Error('Could not fetch Instagram embed data');
        }
      } catch (err) {
        console.error('Error fetching Instagram embed:', err);
        setError('Unable to load Instagram embed');
        setIsLoading(false);
      }
    };

    fetchEmbed();
  }, [url]);

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          <p className="text-sm text-purple-300">Loading Instagram {instagramType}...</p>
        </div>
      </Card>
    );
  }

  if (error || !embedHtml) {
    return (
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 p-4 hover:bg-purple-500/15 transition-colors cursor-pointer group">
        <div className="flex items-start space-x-3" onClick={() => window.open(url, '_blank')}>
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-lg flex items-center justify-center group-hover:from-purple-500/40 group-hover:to-pink-500/40 transition-colors">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-purple-100 group-hover:text-purple-50 transition-colors">
              Instagram {instagramType.charAt(0).toUpperCase() + instagramType.slice(1)}
            </p>
            <p className="text-xs text-purple-400 truncate">
              Click to view on Instagram
            </p>
            <p className="text-xs text-purple-500/60 truncate mt-1">
              ID: {instagramId}
            </p>
          </div>
          <div className="flex-shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
              onClick={(e) => {
                e.stopPropagation();
                window.open(url, '_blank');
              }}
              title="View on Instagram"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div
      ref={containerRef}
      className="instagram-embed-container rounded-lg overflow-hidden"
      dangerouslySetInnerHTML={{ __html: embedHtml }}
    />
  );
}

// Dynamic imports for streaming libraries
let Hls: any = null;
let dashjs: any = null;

// Load streaming libraries dynamically with better error handling
if (typeof window !== 'undefined') {
  // Safe wrapper to prevent unhandled promise rejections
  const safeImport = async (importFn: () => Promise<any>, libName: string) => {
    try {
      const module = await importFn();
      return module.default;
    } catch (error) {
      console.warn(`${libName} failed to load:`, error);
      return null;
    }
  };

  // Import libraries safely
  safeImport(() => import('hls.js'), 'hls.js').then(hls => {
    Hls = hls;
  });

  safeImport(() => import('dashjs'), 'dashjs').then(dash => {
    dashjs = dashjs;
  });
}

interface MediaDisplayProps {
  media: MediaItem;
  className?: string;
}

export function MediaDisplay({ media, className }: MediaDisplayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [hlsInstance, setHlsInstance] = useState<any>(null);
  const [dashInstance, setDashInstance] = useState<any>(null);
  const [currentQuality, setCurrentQuality] = useState<string>('auto');
  const [availableQualities, setAvailableQualities] = useState<Array<{ id: string; name: string; height: number }>>([]);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  const handleMediaError = () => {
    setError('Failed to load media');
    setIsLoading(false);
  };

  const handleMediaLoad = () => {
    setIsLoading(false);
    setError(null);
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setVolume(videoRef.current.volume);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (!document.fullscreenElement) {
        videoRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const togglePictureInPicture = async () => {
    if (videoRef.current) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (error) {
        console.warn('Picture-in-picture not supported:', error);
      }
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
    setShowSettings(false);
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      // Don't handle video shortcuts if user is typing in a form element
      const activeElement = document.activeElement;
      const isFormElement = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.isContentEditable ||
        activeElement.getAttribute('role') === 'textbox'
      );

      if (isFormElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'arrowleft':
          e.preventDefault();
          skip(-10);
          break;
        case 'arrowright':
          e.preventDefault();
          skip(10);
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [volume, isPlaying]);

  // Auto-hide controls when playing
  useEffect(() => {
    if (isPlaying) {
      showControlsTemporarily();
    } else {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // Initialize streaming players
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    // Check if we need streaming libraries but they're not loaded yet
    if ((media.type === 'hls' && (!Hls || typeof Hls !== 'function')) ||
        (media.type === 'dash' && (!dashjs || typeof dashjs.MediaPlayer !== 'function'))) {
      setError('Streaming libraries are still loading. Please try again in a moment.');
      return;
    }

    // Cleanup function
    const cleanup = () => {
      if (hlsInstance) {
        try {
          hlsInstance.destroy();
        } catch (error) {
          console.warn('Error destroying HLS instance:', error);
        }
        setHlsInstance(null);
      }
      if (dashInstance) {
        try {
          dashInstance.reset();
        } catch (error) {
          console.warn('Error resetting DASH instance:', error);
        }
        setDashInstance(null);
      }
    };

    // Initialize HLS player
    if (media.type === 'hls' && Hls && typeof Hls === 'function') {
      cleanup();

      try {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferSize: 60 * 1000 * 1000, // 60MB
          maxBufferLength: 30,
        });

        hls.loadSource(media.url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (event: any, data: any) => {
          // Extract available qualities
          const qualities = data.levels.map((level: any, index: number) => ({
            id: index.toString(),
            name: level.height ? `${level.height}p` : `Quality ${index + 1}`,
            height: level.height || 0,
          }));

          // Add auto option
          qualities.unshift({ id: '-1', name: 'Auto', height: 0 });

          setAvailableQualities(qualities);
          setCurrentQuality('-1'); // Start with auto
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (event: any, data: any) => {
          setCurrentQuality(data.level.toString());
        });

        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
          try {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.error('HLS network error:', data);
                  setError('Network error loading stream');
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.error('HLS media error:', data);
                  setError('Media error playing stream');
                  break;
                default:
                  console.error('HLS error:', data);
                  setError('Error loading stream');
                  break;
              }
            }
          } catch (error) {
            console.warn('Error handling HLS error event:', error);
          }
        });

        setHlsInstance(hls);
      } catch (error) {
        console.error('Failed to initialize HLS:', error);
        setError('Failed to initialize HLS player');
      }
    }

    // Initialize DASH player
    if (media.type === 'dash' && dashjs && typeof dashjs.MediaPlayer === 'function') {
      cleanup();

      try {
        const dash = dashjs.MediaPlayer().create();
        dash.initialize(video, media.url, false);

        dash.updateSettings({
          streaming: {
            abr: {
              autoSwitchBitrate: {
                video: true,
                audio: true
              }
            },
            buffer: {
              bufferToKeep: 30,
              bufferPruningInterval: 10,
            }
          }
        });

        dash.on('streamInitialized', () => {
          // Get available video qualities
          const videoTracks = dash.getTracksForType('video');
          const qualities = videoTracks.map((track: any, index: number) => ({
            id: index.toString(),
            name: track.height ? `${track.height}p` : `Quality ${index + 1}`,
            height: track.height || 0,
          }));

          // Add auto option
          qualities.unshift({ id: '-1', name: 'Auto', height: 0 });

          setAvailableQualities(qualities);
          setCurrentQuality('-1'); // Start with auto
        });

        dash.on('error', (event: any) => {
          try {
            console.error('DASH error:', event);
            setError('Error loading DASH stream');
          } catch (error) {
            console.warn('Error handling DASH error event:', error);
          }
        });

        setDashInstance(dash);
      } catch (error) {
        console.error('Failed to initialize DASH:', error);
        setError('Failed to initialize DASH player');
      }
    }

    // Cleanup on unmount or media change
    return cleanup;
  }, [media.url, media.type, Hls, dashjs]);

  // Handle quality selection
  const handleQualityChange = (qualityId: string) => {
    setCurrentQuality(qualityId);

    if (media.type === 'hls' && hlsInstance) {
      const level = parseInt(qualityId);
      if (level >= 0) {
        hlsInstance.currentLevel = level;
      } else {
        hlsInstance.currentLevel = -1; // Auto
      }
    } else if (media.type === 'dash' && dashInstance) {
      const videoTracks = dashInstance.getTracksForType('video');
      const trackIndex = parseInt(qualityId);
      if (trackIndex >= 0 && videoTracks[trackIndex]) {
        dashInstance.setCurrentTrack(videoTracks[trackIndex]);
      } else {
        // Enable auto bitrate selection
        dashInstance.updateSettings({
          streaming: {
            abr: {
              autoSwitchBitrate: {
                video: true,
                audio: true
              }
            }
          }
        });
      }
    }

    setShowSettings(false);
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
          <div
            className="relative group rounded-lg overflow-hidden bg-black"
            onMouseMove={showControlsTemporarily}
            onMouseLeave={() => isPlaying && setShowControls(false)}
          >
            {isLoading && (
              <div className="absolute inset-0 bg-lime-500/10 animate-pulse rounded-lg flex items-center justify-center z-20">
                <div className="text-lime-500">Loading video...</div>
              </div>
            )}

            <video
              ref={videoRef}
              id={`media-${media.url}`}
              className={cn(
                "w-full h-auto max-h-[70vh]",
                error && "hidden"
              )}
              controls={false}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedData={handleMediaLoad}
              onError={handleMediaError}
              onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
              onDurationChange={() => videoRef.current && setDuration(videoRef.current.duration)}
              onVolumeChange={() => videoRef.current && setVolume(videoRef.current.volume)}
              poster={media.thumbnail}
              onClick={togglePlay}
            >
              <source src={media.url} type={`video/${media.metadata?.format || 'mp4'}`} />
              Your browser does not support the video tag.
            </video>

            {/* Video Controls Overlay */}
            {!error && (
              <>
                {/* Play/Pause overlay button */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Button
                      size="lg"
                      className="h-16 w-16 rounded-full bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                      onClick={togglePlay}
                    >
                      <Play className="h-8 w-8" />
                    </Button>
                  </div>
                )}

                {/* Bottom controls bar */}
                <div
                  className={cn(
                    "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300",
                    showControls ? "opacity-100" : "opacity-0"
                  )}
                >
                  {/* Progress bar */}
                  <div className="mb-3">
                    <div
                      className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer group/progress"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        handleSeek(percent * duration);
                      }}
                    >
                      <div
                        className="h-full bg-lime-500 rounded-full relative group-hover/progress:h-2 transition-all duration-200"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      >
                        <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-lime-500 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-white/80 mt-1">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Control buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {/* Skip back */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-white hover:bg-white/20"
                        onClick={() => skip(-10)}
                      >
                        <SkipBack className="h-4 w-4" />
                      </Button>

                      {/* Play/Pause */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 text-white hover:bg-white/20"
                        onClick={togglePlay}
                      >
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </Button>

                      {/* Skip forward */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-white hover:bg-white/20"
                        onClick={() => skip(10)}
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>

                      {/* Volume control */}
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-white hover:bg-white/20"
                          onClick={toggleMute}
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX className="h-4 w-4" />
                          ) : (
                            <Volume2 className="h-4 w-4" />
                          )}
                        </Button>
                        <div className="w-20">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-lime-500"
                          />
                        </div>
                      </div>

                      {/* Time display */}
                      <span className="text-xs text-white/80 ml-2">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Settings (Playback speed) */}
                      <div className="relative">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-white hover:bg-white/20"
                          onClick={() => setShowSettings(!showSettings)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>

                        {showSettings && (
                          <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg p-2 min-w-[120px] z-30">
                            <div className="text-xs text-white/60 mb-2">Playback Speed</div>
                            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                              <button
                                key={rate}
                                className={cn(
                                  "block w-full text-left px-2 py-1 text-xs text-white hover:bg-white/10 rounded",
                                  playbackRate === rate && "bg-lime-500/20 text-lime-400"
                                )}
                                onClick={() => handlePlaybackRateChange(rate)}
                              >
                                {rate === 1 ? 'Normal' : `${rate}x`}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Picture in Picture */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-white hover:bg-white/20"
                        onClick={togglePictureInPicture}
                      >
                        <PictureInPicture2 className="h-4 w-4" />
                      </Button>

                      {/* Fullscreen */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-white hover:bg-white/20"
                        onClick={toggleFullscreen}
                      >
                        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                      </Button>

                      {/* External link */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-white hover:bg-white/20"
                        onClick={() => window.open(media.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="p-8 text-center text-lime-500/60 bg-lime-500/5">
                <div className="text-lg mb-2">Failed to load video</div>
                <div className="text-sm">The video format may not be supported</div>
                <Button
                  variant="outline"
                  className="mt-4 border-lime-500/30 text-lime-400 hover:bg-lime-500/10"
                  onClick={() => window.open(media.url, '_blank')}
                >
                  Open in New Tab
                </Button>
              </div>
            )}
          </div>
        );

      case 'hls':
      case 'dash':
        return (
          <div
            className="relative group rounded-lg overflow-hidden bg-black"
            onMouseMove={showControlsTemporarily}
            onMouseLeave={() => isPlaying && setShowControls(false)}
          >
            {isLoading && (
              <div className="absolute inset-0 bg-lime-500/10 animate-pulse rounded-lg flex items-center justify-center z-20">
                <div className="text-lime-500">Loading {media.type.toUpperCase()} stream...</div>
              </div>
            )}

            <video
              ref={videoRef}
              id={`media-${media.url}`}
              className={cn(
                "w-full h-auto max-h-[70vh]",
                error && "hidden"
              )}
              controls={false}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedData={handleMediaLoad}
              onError={handleMediaError}
              onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
              onDurationChange={() => videoRef.current && setDuration(videoRef.current.duration)}
              onVolumeChange={() => videoRef.current && setVolume(videoRef.current.volume)}
              poster={media.thumbnail}
              onClick={togglePlay}
            >
              Your browser does not support the video tag.
            </video>

            {/* Video Controls Overlay - same as regular video but with quality selector */}
            {!error && (
              <>
                {/* Play/Pause overlay button */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Button
                      size="lg"
                      className="h-16 w-16 rounded-full bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
                      onClick={togglePlay}
                    >
                      <Play className="h-8 w-8" />
                    </Button>
                  </div>
                )}

                {/* Bottom controls bar */}
                <div
                  className={cn(
                    "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300",
                    showControls ? "opacity-100" : "opacity-0"
                  )}
                >
                  {/* Progress bar */}
                  <div className="mb-3">
                    <div
                      className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer group/progress"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        handleSeek(percent * duration);
                      }}
                    >
                      <div
                        className="h-full bg-lime-500 rounded-full relative group-hover/progress:h-2 transition-all duration-200"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      >
                        <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-lime-500 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-white/80 mt-1">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Control buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {/* Skip back */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-white hover:bg-white/20"
                        onClick={() => skip(-10)}
                      >
                        <SkipBack className="h-4 w-4" />
                      </Button>

                      {/* Play/Pause */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 text-white hover:bg-white/20"
                        onClick={togglePlay}
                      >
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </Button>

                      {/* Skip forward */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-white hover:bg-white/20"
                        onClick={() => skip(10)}
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>

                      {/* Volume control */}
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-white hover:bg-white/20"
                          onClick={toggleMute}
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX className="h-4 w-4" />
                          ) : (
                            <Volume2 className="h-4 w-4" />
                          )}
                        </Button>
                        <div className="w-20">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-lime-500"
                          />
                        </div>
                      </div>

                      {/* Time display */}
                      <span className="text-xs text-white/80 ml-2">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Quality selector */}
                      {availableQualities.length > 0 && (
                        <div className="relative">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-3 text-white hover:bg-white/20 text-xs"
                            onClick={() => setShowSettings(!showSettings)}
                          >
                            {availableQualities.find(q => q.id === currentQuality)?.name || 'Auto'}
                          </Button>

                          {showSettings && (
                            <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg p-2 min-w-[120px] z-30">
                              <div className="text-xs text-white/60 mb-2">Quality</div>
                              {availableQualities.map((quality) => (
                                <button
                                  key={quality.id}
                                  className={cn(
                                    "block w-full text-left px-2 py-1 text-xs text-white hover:bg-white/10 rounded",
                                    currentQuality === quality.id && "bg-lime-500/20 text-lime-400"
                                  )}
                                  onClick={() => handleQualityChange(quality.id)}
                                >
                                  {quality.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Playback speed */}
                      <div className="relative">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-white hover:bg-white/20"
                          onClick={() => setShowSettings(!showSettings)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>

                        {showSettings && (
                          <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg p-2 min-w-[120px] z-30">
                            <div className="text-xs text-white/60 mb-2">Playback Speed</div>
                            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                              <button
                                key={rate}
                                className={cn(
                                  "block w-full text-left px-2 py-1 text-xs text-white hover:bg-white/10 rounded",
                                  playbackRate === rate && "bg-lime-500/20 text-lime-400"
                                )}
                                onClick={() => handlePlaybackRateChange(rate)}
                              >
                                {rate === 1 ? 'Normal' : `${rate}x`}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Picture in Picture */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-white hover:bg-white/20"
                        onClick={togglePictureInPicture}
                      >
                        <PictureInPicture2 className="h-4 w-4" />
                      </Button>

                      {/* Fullscreen */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-white hover:bg-white/20"
                        onClick={toggleFullscreen}
                      >
                        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                      </Button>

                      {/* External link */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-white hover:bg-white/20"
                        onClick={() => window.open(media.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="p-8 text-center text-lime-500/60 bg-lime-500/5">
                <div className="text-lg mb-2">Failed to load {media.type.toUpperCase()} stream</div>
                <div className="text-sm">The stream format may not be supported or the URL may be invalid</div>
                <div className="text-xs text-lime-500/40 mt-2">
                  CDN: {media.metadata?.cdnProvider || 'Unknown'} | Format: {media.metadata?.format || 'Unknown'}
                </div>
                <Button
                  variant="outline"
                  className="mt-4 border-lime-500/30 text-lime-400 hover:bg-lime-500/10"
                  onClick={() => window.open(media.url, '_blank')}
                >
                  Open in New Tab
                </Button>
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
            {/* YouTube iframe with simplified, reliable parameters */}
            <div className="relative pb-[56.25%] h-0">
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                title={media.title || 'YouTube Video'}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                onError={(e) => {
                  console.warn('YouTube iframe failed to load:', e);
                  console.log('🎬 YouTube video ID:', videoId);
                  console.log('🎬 YouTube URL:', media.url);
                }}
              />
            </div>

            {/* Simple external link button */}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 bg-black/60 backdrop-blur-sm"
                onClick={() => window.open(media.url, '_blank')}
                title="Watch on YouTube"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'vimeo':
        const vimeoId = extractVimeoId(media.url);
        return (
          <div className="relative rounded-lg overflow-hidden bg-black">
            <div className="relative pb-[56.25%] h-0">
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`https://player.vimeo.com/video/${vimeoId}?badge=0&byline=0&portrait=0`}
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

      case 'twitch':
        const twitchData = extractTwitchData(media.url);
        return (
          <div className="relative rounded-lg overflow-hidden bg-black">
            <div className="relative pb-[56.25%] h-0">
              {twitchData.videoId ? (
                // Twitch VOD
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  src={`https://player.twitch.tv/?video=${twitchData.videoId}&parent=${window.location.hostname}&autoplay=false`}
                  title={media.title || 'Twitch Video'}
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  onError={handleMediaError}
                />
              ) : (
                // Twitch Live Stream
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  src={`https://player.twitch.tv/?channel=${twitchData.channel}&parent=${window.location.hostname}&autoplay=false`}
                  title={media.title || 'Twitch Stream'}
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  onError={handleMediaError}
                />
              )}
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

      case 'dailymotion':
        const dailymotionId = extractDailymotionId(media.url);
        return (
          <div className="relative rounded-lg overflow-hidden bg-black">
            <div className="relative pb-[56.25%] h-0">
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`https://www.dailymotion.com/embed/video/${dailymotionId}?autoplay=false&ui-highlight=lime`}
                title={media.title || 'Dailymotion Video'}
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

      case 'tiktok':
        const tiktokId = extractTikTokId(media.url);
        return (
          <div className="relative rounded-lg overflow-hidden bg-black">
            <div className="relative pb-[177.77%] h-0"> {/* TikTok is 9:16 aspect ratio */}
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`https://www.tiktok.com/embed/v2/${tiktokId}`}
                title={media.title || 'TikTok Video'}
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

      case 'spotify':
        const spotifyData = extractSpotifyData(media.url);
        if (!spotifyData) {
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
                      Invalid Spotify URL
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

        // Determine iframe height based on Spotify content type
        const getSpotifyHeight = (type: string) => {
          switch (type) {
            case 'track':
              return '152'; // Single track
            case 'episode':
              return '152'; // Single episode
            case 'artist':
              return '380'; // Artist top tracks
            case 'album':
              return '380'; // Album tracks
            case 'playlist':
              return '380'; // Playlist tracks
            case 'show':
              return '232'; // Podcast show
            default:
              return '380';
          }
        };

        return (
          <div className="relative rounded-lg overflow-hidden bg-black group">
            <div className="relative" style={{ paddingBottom: '0' }}>
              <iframe
                className="w-full rounded-lg"
                src={`https://open.spotify.com/embed/${spotifyData.type}/${spotifyData.id}?utm_source=generator&theme=0`}
                title={media.title || `Spotify ${spotifyData.type}`}
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                style={{ height: `${getSpotifyHeight(spotifyData.type)}px` }}
                onError={handleMediaError}
              />
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 bg-black/60 backdrop-blur-sm"
                onClick={() => window.open(media.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'imdb':
        return <IMDBPreview url={media.url} />;

      case 'instagram':
        const instagramId = extractInstagramId(media.url);
        const instagramType = media.url.includes('/reel/') ? 'reel' : 'post';

        if (!instagramId) {
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
                      Invalid Instagram URL
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

        // Use blockquote embed approach which Instagram officially supports
        return <InstagramEmbed url={media.url} instagramId={instagramId} instagramType={instagramType} />;

      case 'twitter':
        const tweetId = extractTwitterId(media.url);

        if (!tweetId) {
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
                      Invalid Twitter URL
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
          <div className="relative rounded-lg overflow-hidden bg-white group">
            {/* Twitter embed iframe */}
            <div className="relative" style={{ paddingBottom: '80%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg border-0"
                src={`https://platform.twitter.com/embed/Tweet.html?id=${tweetId}&theme=light`}
                title="Twitter Tweet"
                frameBorder="0"
                scrolling="no"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                onError={(e) => {
                  console.warn('Twitter embed failed to load:', e);
                }}
              />
            </div>

            {/* External link button */}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 bg-black/60 backdrop-blur-sm"
                onClick={() => window.open(media.url, '_blank')}
                title="View on Twitter"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'facebook':
        const facebookPostId = extractFacebookId(media.url);

        if (!facebookPostId) {
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
                      Invalid Facebook URL
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

        // Facebook embed using their official embed API
        return (
          <div className="relative rounded-lg overflow-hidden bg-white group">
            {/* Facebook embed iframe */}
            <div className="relative" style={{ paddingBottom: '100%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg border-0"
                src={`https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(media.url)}&show_text=true&width=500`}
                title="Facebook Post"
                frameBorder="0"
                scrolling="no"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                onError={(e) => {
                  console.warn('Facebook embed failed to load:', e);
                }}
              />
            </div>

            {/* External link button */}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 bg-black/60 backdrop-blur-sm"
                onClick={() => window.open(media.url, '_blank')}
                title="View on Facebook"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'minds':
        const mindsPostId = extractMindsId(media.url);

        if (!mindsPostId) {
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
                      Invalid Minds URL
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

        // Minds doesn't have an embed API, so we render as a styled link preview
        return (
          <Card className="bg-lime-500/5 border-lime-500/20 p-4 hover:bg-lime-500/10 transition-colors cursor-pointer group">
            <div className="flex items-start space-x-3" onClick={() => window.open(media.url, '_blank')}>
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-lime-500/20 rounded-lg flex items-center justify-center group-hover:bg-lime-500/30 transition-colors">
                  <div className="text-lime-500 font-bold text-lg">M</div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-lime-100 group-hover:text-lime-50 transition-colors">
                  Minds Post
                </p>
                <p className="text-xs text-lime-500/60 truncate">
                  {media.metadata?.postType === 'video' ? 'Video' :
                   media.metadata?.postType === 'image' ? 'Image' : 'Post'}
                </p>
                <p className="text-xs text-lime-500/40 truncate mt-1">
                  Post ID: {mindsPostId}
                </p>
              </div>
              <div className="flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-lime-400 hover:text-lime-300 hover:bg-lime-500/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(media.url, '_blank');
                  }}
                  title="View on Minds"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        );

      case 'odysee':
        const odyseeData = extractOdyseeData(media.url);

        if (!odyseeData.videoSlug || !odyseeData.claimId) {
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
                      Invalid Odysee URL
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

        // Odysee embed using their official embed API
        return (
          <div className="relative rounded-lg overflow-hidden bg-black group">
            {/* Odysee embed iframe */}
            <div className="relative pb-[56.25%] h-0">
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg border-0"
                src={`https://odysee.com/$/embed/${odyseeData.videoSlug}:${odyseeData.claimId}`}
                title={media.title || 'Odysee Video'}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                onError={(e) => {
                  console.warn('Odysee embed failed to load:', e);
                  console.log('🎥 Odysee data:', odyseeData);
                  console.log('🎥 Odysee URL:', media.url);
                }}
              />
            </div>

            {/* External link button */}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 bg-black/60 backdrop-blur-sm"
                onClick={() => window.open(media.url, '_blank')}
                title="Watch on Odysee"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'rumble':
        const rumbleId = extractRumbleId(media.url);
        return (
          <div className="relative rounded-lg overflow-hidden bg-black group">
            <div className="relative pb-[56.25%] h-0">
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`https://rumble.com/embed/${rumbleId}/`}
                title={media.title || 'Rumble Video'}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onError={handleMediaError}
              />
            </div>
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 bg-black/60 backdrop-blur-sm"
                onClick={() => window.open(media.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'bitchute':
        const bitchuteId = extractBitchuteId(media.url);
        return (
          <div className="relative rounded-lg overflow-hidden bg-black group">
            <div className="relative pb-[56.25%] h-0">
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`https://www.bitchute.com/embed/${bitchuteId}/`}
                title={media.title || 'BitChute Video'}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onError={handleMediaError}
              />
            </div>
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 bg-black/60 backdrop-blur-sm"
                onClick={() => window.open(media.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'peertube':
        const peertubeData = extractPeertubeData(media.url);
        return (
          <div className="relative rounded-lg overflow-hidden bg-black group">
            <div className="relative pb-[56.25%] h-0">
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`${peertubeData.instance}/videos/embed/${peertubeData.videoId}`}
                title={media.title || 'PeerTube Video'}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                sandbox="allow-same-origin allow-scripts allow-popups"
                onError={handleMediaError}
              />
            </div>
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 bg-black/60 backdrop-blur-sm"
                onClick={() => window.open(media.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'soundcloud':
        return (
          <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20">
            <div className="relative" style={{ height: '166px' }}>
              <iframe
                width="100%"
                height="166"
                scrolling="no"
                frameBorder="no"
                allow="autoplay"
                src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(media.url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`}
                title={media.title || 'SoundCloud Track'}
                onError={handleMediaError}
              />
            </div>
            <div className="absolute top-2 right-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-orange-400 hover:text-orange-300 hover:bg-orange-500/20 bg-black/60 backdrop-blur-sm"
                onClick={() => window.open(media.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'bandcamp':
        return (
          <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20">
            <div className="relative" style={{ height: '120px' }}>
              <iframe
                style={{ border: 0, width: '100%', height: '120px' }}
                src={`${media.url}/`}
                title={media.title || 'Bandcamp Release'}
                seamless
                onError={handleMediaError}
              />
            </div>
            <div className="absolute top-2 right-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 bg-black/60 backdrop-blur-sm"
                onClick={() => window.open(media.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'mixcloud':
        return (
          <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-slate-700/20 to-slate-800/10 border border-slate-500/20">
            <div className="relative" style={{ height: '120px' }}>
              <iframe
                width="100%"
                height="120"
                src={`https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=${encodeURIComponent(media.url)}`}
                title={media.title || 'Mixcloud Mix'}
                frameBorder="0"
                onError={handleMediaError}
              />
            </div>
            <div className="absolute top-2 right-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-300 hover:text-slate-200 hover:bg-slate-500/20 bg-black/60 backdrop-blur-sm"
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
    console.log('🎬 Extracting YouTube ID from:', url);

    // Handle various YouTube URL formats including www subdomains
    const patterns = [
      /(?:www\.youtube\.com|youtube\.com)\/watch[?]v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /(?:www\.youtube\.com|youtube\.com)\/embed\/([a-zA-Z0-9_-]{11})/,
      /(?:www\.youtube\.com|youtube\.com)\/shorts\/([a-zA-Z0-9_-]{11})/,
      /(?:www\.youtube\.com|youtube\.com)\/live\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        console.log('✅ YouTube ID extracted:', match[1], 'using pattern:', pattern);
        return match[1];
      }
    }

    console.warn('❌ No YouTube ID found in URL:', url);
  } catch (error) {
    console.warn('Failed to extract YouTube ID from:', url, error);
  }

  return '';
}

function extractVimeoId(url: string): string {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : '';
}

function extractTwitchData(url: string): { channel: string; videoId?: string } {
  const videoMatch = url.match(/twitch\.tv\/videos\/(\d+)/);
  if (videoMatch) {
    return { channel: '', videoId: videoMatch[1] };
  }

  const channelMatch = url.match(/twitch\.tv\/(\w+)/);
  if (channelMatch) {
    return { channel: channelMatch[1] };
  }

  return { channel: '', videoId: undefined };
}

function extractDailymotionId(url: string): string {
  const match = url.match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([a-zA-Z0-9]+)/);
  return match ? match[1] : '';
}

function extractTikTokId(url: string): string {
  const match = url.match(/(?:tiktok\.com\/@[\w.-]+\/video\/|vm\.tiktok\.com\/)([a-zA-Z0-9]+)/);
  return match ? match[1] : '';
}

function extractSpotifyData(url: string): { type: string; id: string } | null {
  const match = url.match(/open\.spotify\.com\/(track|album|playlist|artist|show|episode)\/([a-zA-Z0-9]+)/);
  if (match && match[1] && match[2]) {
    return {
      type: match[1],
      id: match[2]
    };
  }
  return null;
}

// Helper function to extract IMDB ID from URL
function extractImdbId(url: string): string {
  const match = url.match(/imdb\.com\/(?:title|name)\/([a-z0-9]+)/);
  return match ? match[1] : '';
}

// Helper function to extract Instagram ID from URL
function extractInstagramId(url: string): string {
  try {
    console.log('📷 Extracting Instagram ID from:', url);

    // Handle various Instagram URL formats including www subdomains and both p/ and reel/
    // Updated pattern to handle URLs with query parameters properly
    const patterns = [
      /https?:\/\/(?:www\.instagram\.com|instagram\.com)\/p\/([A-Za-z0-9_-]+)(?:\/?|\?[^\s]*)?/,
      /https?:\/\/(?:www\.instagram\.com|instagram\.com)\/reel\/([A-Za-z0-9_-]+)(?:\/?|\?[^\s]*)?/,
    ];

    // Also try a more comprehensive pattern that combines both p and reel
    const comprehensivePattern = /https?:\/\/(?:www\.instagram\.com|instagram\.com)\/(?:p|reel)\/([A-Za-z0-9_-]+)/;

    console.log('🔍 Testing comprehensive pattern:', comprehensivePattern);
    const comprehensiveMatch = url.match(comprehensivePattern);
    if (comprehensiveMatch && comprehensiveMatch[1]) {
      console.log('✅ Instagram ID extracted via comprehensive pattern:', comprehensiveMatch[1]);
      return comprehensiveMatch[1];
    }

    // Try individual patterns
    for (const pattern of patterns) {
      console.log('🔍 Testing pattern:', pattern);
      const match = url.match(pattern);
      if (match && match[1]) {
        console.log('✅ Instagram ID extracted:', match[1], 'using pattern:', pattern);
        return match[1];
      }
    }

    // Try even more basic pattern as fallback
    const basicPattern = /instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/;
    console.log('🔍 Testing basic pattern:', basicPattern);
    const basicMatch = url.match(basicPattern);
    if (basicMatch && basicMatch[1]) {
      console.log('✅ Instagram ID extracted via basic pattern:', basicMatch[1]);
      return basicMatch[1];
    }

    console.warn('❌ No Instagram ID found in URL:', url);
    console.warn('🔍 URL parts:', url.split('/'));
    console.warn('🔍 Query parameters:', url.split('?')[1]);
  } catch (error) {
    console.warn('Failed to extract Instagram ID from:', url, error);
  }

  return '';
}

// Helper function to extract Twitter ID from URL
function extractTwitterId(url: string): string {
  try {
    console.log('🐦 Extracting Twitter ID from:', url);

    // Handle both twitter.com and x.com URLs
    const patterns = [
      /twitter\.com\/[a-zA-Z0-9_]+\/status\/([0-9]+)/,
      /x\.com\/[a-zA-Z0-9_]+\/status\/([0-9]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        console.log('✅ Twitter ID extracted:', match[1], 'using pattern:', pattern);
        return match[1];
      }
    }

    console.warn('❌ No Twitter ID found in URL:', url);
  } catch (error) {
    console.warn('Failed to extract Twitter ID from:', url, error);
  }

  return '';
}

// Helper function to extract Facebook post ID from URL
function extractFacebookId(url: string): string {
  try {
    console.log('📘 Extracting Facebook ID from:', url);

    // Handle various Facebook URL formats including new pfbid format
    const patterns = [
      // Traditional numeric IDs
      /facebook\.com\/[^\/\s]+\/posts\/([0-9]+)/,
      /facebook\.com\/[^\/\s]+\/activity\/([0-9]+)/,
      /facebook\.com\/[^\/\s]+\/photos\/([0-9]+)/,
      /facebook\.com\/[^\/\s]+\/videos\/([0-9]+)/,
      /facebook\.com\/permalink\.php\?story_fbid=([0-9]+)/,
      /facebook\.com\/story\.php\?story_fbid=([0-9]+)/,
      /facebook\.com\/groups\/[^\/\s]+\/permalink\/([0-9]+)/,
      // New Facebook post ID format (pfbid...)
      /facebook\.com\/[^\/\s]+\/posts\/(pfbid[0-9A-Za-z]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        console.log('✅ Facebook ID extracted:', match[1], 'using pattern:', pattern);
        return match[1];
      }
    }

    console.warn('❌ No Facebook ID found in URL:', url);
  } catch (error) {
    console.warn('Failed to extract Facebook ID from:', url, error);
  }

  return '';
}

// Helper function to extract Minds post ID from URL
function extractMindsId(url: string): string {
  try {
    console.log('🧠 Extracting Minds ID from:', url);

    // Handle various Minds URL formats
    const patterns = [
      /minds\.com\/newsfeed\/([0-9]+)/,
      /minds\.com\/groups\/[^\/\s]+\/([0-9]+)/,
      /minds\.com\/[^\/\s]+\/([0-9]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        console.log('✅ Minds ID extracted:', match[1], 'using pattern:', pattern);
        return match[1];
      }
    }

    console.warn('❌ No Minds ID found in URL:', url);
  } catch (error) {
    console.warn('Failed to extract Minds ID from:', url, error);
  }

  return '';
}

// Helper function to extract Odysee data from URL
function extractOdyseeData(url: string): { channel: string; videoSlug: string; claimId: string } {
  try {
    console.log('🎥 Extracting Odysee data from:', url);

    // Handle Odysee URL format: https://odysee.com/@TheQuartering:1/walmart-shuts-down-food-wars-shoppers:c?r=...
    const pattern = /odysee\.com\/(@[^\/\s]+):([^\/\s]+)\/([^\/\s]+):([^\/\s]+)/;
    const match = url.match(pattern);

    if (match && match[1] && match[2] && match[3] && match[4]) {
      const channel = match[1]; // @TheQuartering
      const channelClaimId = match[2]; // 1
      const videoSlug = match[3]; // walmart-shuts-down-food-wars-shoppers
      const claimId = match[4]; // c

      console.log('✅ Odysee data extracted:', {
        channel,
        channelClaimId,
        videoSlug,
        claimId
      });

      return {
        channel,
        videoSlug,
        claimId
      };
    }

    console.warn('❌ No Odysee data found in URL:', url);
    console.warn('🔍 URL parts:', url.split('/'));
  } catch (error) {
    console.warn('Failed to extract Odysee data from:', url, error);
  }

  // Return fallback data
  return {
    channel: '',
    videoSlug: '',
    claimId: ''
  };
}

// Helper function to extract Rumble ID from URL
function extractRumbleId(url: string): string {
  try {
    const match = url.match(/rumble\.com\/(?:embed\/)?([a-z0-9]+)/);
    return match ? match[1] : '';
  } catch (error) {
    console.warn('Failed to extract Rumble ID from:', url, error);
    return '';
  }
}

// Helper function to extract BitChute ID from URL
function extractBitchuteId(url: string): string {
  try {
    const match = url.match(/bitchute\.com\/video\/([a-zA-Z0-9]+)/);
    return match ? match[1] : '';
  } catch (error) {
    console.warn('Failed to extract BitChute ID from:', url, error);
    return '';
  }
}

// Helper function to extract PeerTube data from URL
function extractPeertubeData(url: string): { instance: string; videoId: string } {
  try {
    const urlObj = new URL(url);
    const instance = `${urlObj.protocol}//${urlObj.hostname}`;
    const match = url.match(/\/(?:videos\/watch|w)\/([a-f0-9-]+)/);
    const videoId = match ? match[1] : '';
    return { instance, videoId };
  } catch (error) {
    console.warn('Failed to extract PeerTube data from:', url, error);
    return { instance: '', videoId: '' };
  }
}