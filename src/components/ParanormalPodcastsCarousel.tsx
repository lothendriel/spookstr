import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Maximize2, Play } from 'lucide-react';
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
  const { playPodcast, togglePopOut, currentPodcast, isPoppedOut } = usePodcast();

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? podcastEmbeds.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === podcastEmbeds.length - 1 ? 0 : prev + 1));
  };

  const currentPodcastData = podcastEmbeds[currentIndex];

  const handlePlayAndPopOut = () => {
    playPodcast(currentPodcastData);
    if (!isPoppedOut) {
      togglePopOut();
    }
  };

  const isCurrentPodcastPlaying = currentPodcast?.title === currentPodcastData.title && isPoppedOut;

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

      {isPoppedOut ? (
        <div className="mt-2 h-[400px] flex items-center justify-center border border-lime-500/20 rounded-lg bg-black/20">
          <div className="text-center space-y-2">
            <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse mx-auto"></div>
            <p className="text-lime-400 text-sm font-medium">
              Player in popout mode
            </p>
            <p className="text-lime-300/60 text-xs">
              Close popout to restore player here
            </p>
          </div>
        </div>
      ) : (
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
      )}

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
              <span className="text-xs">Pop-out</span>
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