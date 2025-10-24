import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? podcastEmbeds.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === podcastEmbeds.length - 1 ? 0 : prev + 1));
  };

  const currentPodcast = podcastEmbeds[currentIndex];

  return (
    <div className="border border-lime-500/20 rounded-lg p-4 bg-black/40 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-lime-400">Paranormal Podcasts</h3>
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

      <p className="text-center text-lime-100 text-sm mt-3 font-medium">
        {currentPodcast.title}
      </p>
    </div>
  );
}