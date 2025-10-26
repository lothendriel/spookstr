import { useState, useRef, useEffect } from 'react';
import { MediaItem } from '@/lib/mediaParser';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, Maximize, ExternalLink, Minimize, SkipBack, SkipForward, Settings, PictureInPicture2, Star } from 'lucide-react';
import { IMDBPreview } from './IMDBPreview';
import { cn } from '@/lib/utils';
import { LinkPreview } from '@/components/LinkPreview';

// Map video file extensions to proper MIME types
const videoMimeTypeMap: Record<string, string> = {
  'mp4': 'video/mp4',
  'webm': 'video/webm',
  'mov': 'video/quicktime',
  'avi': 'video/x-msvideo',
  'mkv': 'video/x-matroska',
  'flv': 'video/x-flv',
  'ogv': 'video/ogg',
  '3gp': 'video/3gpp',
  'm4v': 'video/x-m4v',
  'wmv': 'video/x-ms-wmv',
  'asf': 'video/x-ms-asf',
  'rm': 'application/vnd.rn-realmedia',
  'rmvb': 'application/vnd.rn-realmedia-vbr',
  'ts': 'video/mp2t',
  'm2ts': 'video/mp2t',
  'mts': 'video/mp2t',
  'divx': 'video/divx',
  'xvid': 'video/x-xvid',
};

// Map audio file extensions to proper MIME types
const audioMimeTypeMap: Record<string, string> = {
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'ogg': 'audio/ogg',
  'flac': 'audio/flac',
  'm4a': 'audio/mp4',
  'aac': 'audio/aac',
  'opus': 'audio/opus',
  'wma': 'audio/x-ms-wma',
  'ra': 'audio/x-realaudio',
  'ac3': 'audio/ac3',
  'dts': 'audio/vnd.dts',
};

function getVideoMimeType(format: string): string {
  return videoMimeTypeMap[format.toLowerCase()] || 'video/mp4';
}

function getAudioMimeType(format: string): string {
  return audioMimeTypeMap[format.toLowerCase()] || 'audio/mpeg';
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
              <source src={media.url} type={getVideoMimeType(media.metadata?.format || 'mp4')} />
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
                <source src={media.url} type={getAudioMimeType(media.metadata?.format || 'mp3')} />
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
          <div className="relative rounded-lg overflow-hidden bg-black">
            <div className="relative pb-[56.25%] h-0">
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={media.title || 'YouTube Video'}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
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
      /youtube\.com\/watch[?]v=([a-zA-Z0-9_-]{11})/,
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