import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Maximize2, Play, Pause, X, Volume2, VolumeX } from 'lucide-react';
import { usePodcast } from '@/contexts/PodcastContext';

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

export function ParanormalPodcastsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const {
    playPodcast,
    togglePopOut,
    currentPodcast,
    isPoppedOut,
    isPlaying,
    togglePlayPause,
    stopPodcast
  } = usePodcast();

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? podcastEmbeds.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === podcastEmbeds.length - 1 ? 0 : prev + 1));
  };

  const currentPodcastData = podcastEmbeds[currentIndex];
  const isCurrentPodcastPlaying = currentPodcast?.title === currentPodcastData.title;
  const isThisPodcastActive = isCurrentPodcastPlaying && !isPoppedOut;

  const handlePlay = () => {
    if (!isCurrentPodcastPlaying) {
      // Start playing this podcast
      playPodcast(currentPodcastData);
    } else {
      // Toggle play/pause for current podcast
      togglePlayPause();
    }
  };

  const handlePopOut = () => {
    if (isCurrentPodcastPlaying) {
      // Pop out the currently playing podcast
      togglePopOut();
    } else {
      // Start playing and then pop out
      playPodcast(currentPodcastData);
      setTimeout(() => togglePopOut(), 100); // Small delay to ensure state updates
    }
  };

  const handleStop = () => {
    stopPodcast();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Note: iHeart iframe doesn't expose mute controls via postMessage
    // This is a visual indicator only
  };

  // Don't show the carousel if this podcast is popped out
  if (isCurrentPodcastPlaying && isPoppedOut) {
    return null;
  }

  return (
    <div className="border border-lime-500/20 rounded-lg p-4 bg-black/40 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-lime-400 flex items-center space-x-2">
          <Volume2 className="h-5 w-5" />
          <span>Paranormal Podcasts</span>
          {isThisPodcastActive && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-lime-400">
                {isPlaying ? 'Playing' : 'Paused'}
              </span>
            </div>
          )}
        </h3>

        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="h-8 w-8 text-lime-400 hover:text-lime-300 hover:bg-lime-500/10"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevious}
            className="h-8 w-8 text-lime-400 hover:text-lime-300 hover:bg-lime-500/10 border border-lime-500/20"
            aria-label="Previous podcast"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNext}
            className="h-8 w-8 text-lime-400 hover:text-lime-300 hover:bg-lime-500/10 border border-lime-500/20"
            aria-label="Next podcast"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative">
        <div className="overflow-x-hidden whitespace-nowrap">
          <div
            className="inline-flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {podcastEmbeds.map((podcast, index) => (
              <div
                key={index}
                className="w-[100%] min-w-[100%] inline-block align-top"
              >
                <div
                  dangerouslySetInnerHTML={{ __html: podcast.embedCode }}
                  className="mt-2"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <p className="text-lime-100 text-sm font-medium truncate flex-1">
          {currentPodcastData.title}
        </p>

        <div className="flex items-center space-x-1">
          {isThisPodcastActive && (
            <>
              <Button
                onClick={handleStop}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                title="Stop podcast"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}

          <Button
            onClick={handlePlay}
            variant="outline"
            size="sm"
            className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1"
          >
            {isThisPodcastActive && isPlaying ? (
              <>
                <Pause className="h-3 w-3" />
                <span className="text-xs">Pause</span>
              </>
            ) : (
              <>
                <Play className="h-3 w-3" />
                <span className="text-xs">Play</span>
              </>
            )}
          </Button>

          <Button
            onClick={handlePopOut}
            variant="outline"
            size="sm"
            className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1"
          >
            {isCurrentPodcastPlaying && isPoppedOut ? (
              <>
                <Pause className="h-3 w-3" />
                <span className="text-xs">Playing</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3 w-3" />
                <span className="text-xs">Pop-out</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}