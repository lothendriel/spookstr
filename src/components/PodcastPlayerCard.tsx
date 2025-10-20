import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Play, Pause, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export default function PodcastPlayerCard() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRSS = async () => {
      try {
        // Using CORS proxy to avoid CORS issues
        const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://rss.premiereradio.net/podcast/coast.xml');
        const response = await fetch(proxyUrl);

        if (!response.ok) {
          throw new Error('Failed to fetch RSS feed');
        }

        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'application/xml');
        const items = xmlDoc.querySelectorAll('item');

        const episodesData = Array.from(items).map(item => {
          return {
            title: item.querySelector('title')?.textContent?.trim() || 'Untitled Episode',
            description: item.querySelector('description')?.textContent?.trim() || '',
            url: item.querySelector('enclosure')?.getAttribute('url') || '',
            pubDate: item.querySelector('pubDate')?.textContent || ''
          };
        });

        setEpisodes(episodesData);
        if (episodesData.length > 0) {
          setCurrentEpisode(episodesData[0]);
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching podcast feed:', err);
        setError('Failed to load podcast episodes. Please try again later.');
        setIsLoading(false);
        toast({
          title: 'Error',
          description: 'Could not load podcast episodes. The API might be down or have CORS restrictions.',
          variant: 'destructive',
        });
      }
    };

    fetchRSS();
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  };

  const nextEpisode = () => {
    if (!episodes.length) return;

    const currentIndex = episodes.findIndex(e => e?.url === currentEpisode?.url);
    const nextIndex = (currentIndex + 1) % episodes.length;
    setCurrentEpisode(episodes[nextIndex]);
  };

  const prevEpisode = () => {
    if (!episodes.length) return;

    const currentIndex = episodes.findIndex(e => e?.url === currentEpisode?.url);
    const prevIndex = (currentIndex - 1 + episodes.length) % episodes.length;
    setCurrentEpisode(episodes[prevIndex]);
  };

  const restartEpisode = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lime-400 flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM10 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM14 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM18 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6z" />
          </svg>
          <span>Coast to Coast AM Podcast</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="w-full bg-black/30 rounded-lg p-4">
          {currentEpisode ? (
            <div>
              <audio
                ref={audioRef}
                src={currentEpisode.url}
                className="w-full"
                onEnded={() => {
                  nextEpisode();
                }}
                onTimeUpdate={() => {
                  // Add any progress UI here if needed
                }}
              />
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    size="icon"
                    className="bg-lime-500 hover:bg-lime-400 text-black"
                    onClick={restartEpisode}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    className="bg-lime-500 hover:bg-lime-400 text-black"
                    onClick={togglePlay}
                  >
                    {currentEpisode && audioRef.current?.paused ? (
                      <Play className="h-4 w-4" />
                    ) : (
                      <Pause className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    className="bg-lime-500 hover:bg-lime-400 text-black"
                    onClick={nextEpisode}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
                  onClick={() => {
                    setIsLoading(true);
                    setError(null);
                    setEpisodes([]);
                    setCurrentEpisode(null);
                    const fetchRSS = async () => {
                      try {
                        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://rss.premiereradio.net/podcast/coast.xml');
                        const response = await fetch(proxyUrl);
                        if (!response.ok) throw new Error('Failed to fetch RSS feed');

                        const text = await response.text();
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(text, 'application/xml');
                        const items = xmlDoc.querySelectorAll('item');

                        const episodesData = Array.from(items).map(item => {
                          return {
                            title: item.querySelector('title')?.textContent?.trim() || 'Untitled Episode',
                            description: item.querySelector('description')?.textContent?.trim() || '',
                            url: item.querySelector('enclosure')?.getAttribute('url') || '',
                            pubDate: item.querySelector('pubDate')?.textContent || ''
                          };
                        });

                        setEpisodes(episodesData);
                        if (episodesData.length > 0) {
                          setCurrentEpisode(episodesData[0]);
                        }
                        setIsLoading(false);
                      } catch (err) {
                        console.error('Error refreshing podcast feed:', err);
                        setError('Failed to refresh podcast episodes');
                        setIsLoading(false);
                        toast({
                          title: 'Error',
                          description: 'Could not refresh podcast episodes. Please try again later.',
                          variant: 'destructive',
                        });
                      }
                    };
                    fetchRSS();
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-lime-500/60">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Skeleton className="h-10 w-10 rounded-full mb-2" />
                  <p className="text-lime-500/60">Loading episodes...</p>
                </div>
              ) : (
                error ? (
                  <div>
                    <p className="text-red-400">{error}</p>
                    <Button
                      variant="outline"
                      className="mt-2 border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
                      onClick={() => window.location.reload()}
                    >
                      Reload Page
                    </Button>
                  </div>
                ) : (
                  'Select an episode to play'
                )
              )}
            </div>
          )}
        </div>

        <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-black/20 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            episodes.map((episode, index) => (
              <div
                key={index}
                onClick={() => setCurrentEpisode(episode)}
                className={`cursor-pointer transition-all rounded-lg p-3 ${currentEpisode?.url === episode.url ? 'bg-black/30' : 'hover:bg-black/30'}`}
              >
                <h3 className="text-lime-100 font-medium truncate">{episode.title}</h3>
                <p className="text-lime-500/70 text-sm line-clamp-2">{episode.description}</p>
                {episode.pubDate && (
                  <p className="text-lime-500/50 text-xs mt-1">
                    {new Date(episode.pubDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}