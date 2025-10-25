import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Maximize2, Play } from 'lucide-react';
import { usePodcast } from '@/contexts/PodcastContext';

const podcastEmbeds = [
  {
    title: "Coast to Coast AM",
    src: "https://www.iheart.com/podcast/1100-the-best-of-coast-to-coas-18899828/?embed=true"
  },
  {
    title: "Sasquatch Chronicles",
    src: "https://www.iheart.com/podcast/267-sasquatch-chronicles-29414973/?embed=true"
  },
  {
    title: "Strange Familiars",
    src: "https://www.iheart.com/podcast/269-strange-familiars-88536416/?embed=true"
  },
  {
    title: "The Confessionals",
    src: "https://www.iheart.com/podcast/267-the-confessionals-29768844/?embed=true"
  },
  {
    title: "Bigfoot and Beyond",
    src: "https://www.iheart.com/podcast/267-bigfoot-and-beyond-with-cl-63055511/?embed=true"
  }
];

export function ParanormalPodcastsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const {
    playPodcast,
    togglePopOut,
    currentPodcast,
    isPoppedOut,
    iframeRef,
    moveIframeToPopout,
    moveIframeToMain
  } = usePodcast();

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? podcastEmbeds.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === podcastEmbeds.length - 1 ? 0 : prev + 1));
  };

  const currentPodcastData = podcastEmbeds[currentIndex];

  const isCurrentPodcastPlaying = currentPodcast?.title === currentPodcastData.title && isPoppedOut;

  const handlePlayAndPopOut = () => {
    if (!isCurrentPodcastPlaying) {
      // If we're starting a new podcast, set it as current
      playPodcast(currentPodcastData);
    }

    if (isCurrentPodcastPlaying) {
      // If already popped out, close popout to return to main player
      moveIframeToMain(currentIndex);
      togglePopOut();
    } else {
      // If not popped out, open popout immediately
      moveIframeToPopout(currentIndex);
      togglePopOut();
    }
  };

  // Find and set reference to the current podcast iframe
  useEffect(() => {
    if (currentPodcast) {
      const iframe = document.querySelector(`iframe[data-podcast-index="${currentIndex}"]`) as HTMLIFrameElement;
      if (iframe && iframe !== iframeRef.current) {
        iframeRef.current = iframe;
      }
    }
  }, [currentPodcast, currentIndex, iframeRef]);

  return (
    <div className="border border-lime-500/20 rounded-lg p-4 bg-black/40 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-lime-400 flex items-center space-x-2">
          <span>Paranormal Podcasts</span>
          {isCurrentPodcastPlaying && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-lime-400">Playing</span>
            </div>
          )}
        </h3>
        <div className="flex gap-1">
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
        {isCurrentPodcastPlaying ? (
          // Show placeholder when podcast is popped out
          <div className="bg-black/20 border-2 border-dashed border-lime-500/30 rounded-lg p-8 text-center">
            <div className="space-y-3">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-lime-500/20 rounded-full flex items-center justify-center">
                  <Maximize2 className="h-6 w-6 text-lime-400" />
                </div>
              </div>
              <p className="text-lime-400 font-medium">
                Now playing in popout player
              </p>
              <p className="text-lime-200/70 text-sm">
                {currentPodcastData.title}
              </p>
            </div>
          </div>
        ) : (
          // Show iframe player when not popped out
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
                  <iframe
                    allow="autoplay"
                    width="100%"
                    height="400"
                    src={podcast.src}
                    frameBorder="0"
                    data-podcast-index={index}
                    className={currentPodcast?.title === podcast.title && isPoppedOut ? 'invisible' : ''}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        <p className="text-lime-100 text-sm font-medium truncate flex-1">
          {currentPodcastData.title}
        </p>
        <Button
          onClick={handlePlayAndPopOut}
          variant="outline"
          size="sm"
          className="ml-2 border-lime-500/50 text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1"
        >
          {isCurrentPodcastPlaying ? (
            <>
              <Maximize2 className="h-3 w-3" />
              <span className="text-xs">Return to Player</span>
            </>
          ) : (
            <>
              <Play className="h-3 w-3" />
              <span className="text-xs">Play & Pop-out</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}