import { useState, useEffect, useRef } from 'react';
import { X, Pause, Play, Volume2, VolumeX, Maximize2 } from 'lucide-react';

interface PodcastPlayerProps {
  episodeTitle: string;
  audioSrc: string;
  onClose?: () => void;
  onPopoutClick?: () => void;
}

export function PodcastPlayer({ 
  episodeTitle, 
  audioSrc,
  onClose,
  onPopoutClick
}: PodcastPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlayPause = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioRef.current?.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  const handleTimeUpdate = () => {
    // Could add progress bar here if needed
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      
      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, []);

  return (
    <div className={`fixed bottom-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg transition-all duration-300 ${showControls ? 'h-24 w-72' : 'h-12 w-12'} flex flex-col overflow-hidden`} style={{ maxHeight: '96vh' }}>
      <div className="bg-gray-50 p-2 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2 pr-2 overflow-hidden whitespace-nowrap">
          <span className="text-xs font-medium truncate">{episodeTitle}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onPopoutClick} className="p-1 hover:bg-gray-100 rounded" aria-label="Pop out player">
            <Maximize2 size={16} />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close player">
            <X size={16} />
          </button>
        </div>
      </div>
      
      {showControls && (
        <>
          <div className="p-2 flex items-center justify-between">
            <button 
              onClick={togglePlayPause} 
              className="hover:bg-gray-100 p-1 rounded"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            
            <div className="flex items-center gap-2 ml-auto">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={isMuted ? 0 : volume} 
                onChange={handleVolumeChange}
                className="w-20"
              />
              <button 
                onClick={toggleMute}
                className="hover:bg-gray-100 p-1 rounded"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </div>
          </div>
          
          <div className="px-2 pb-2">
            <audio ref={audioRef} src={audioSrc} preload="auto" />
          </div>
        </>
      )}
    </div>
  );
}