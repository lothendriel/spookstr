import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchImdbData } from '@/lib/mediaParser';

interface IMDBData {
  title: string;
  type: string;
  year?: string;
  rating?: string;
  thumbnail: string;
  description: string;
}

interface IMDBPreviewProps {
  url: string;
  className?: string;
}

export function IMDBPreview({ url, className }: IMDBPreviewProps) {
  const [data, setData] = useState<IMDBData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadIMDBData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch real IMDB data
        const movieData = await fetchImdbData(url);
        setData(movieData);
      } catch (err) {
        console.error('Failed to fetch IMDB data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch IMDB data');
      } finally {
        setLoading(false);
      }
    };

    loadIMDBData();
  }, [url]);

  if (loading) {
    return (
      <Card className={cn("bg-gradient-to-br from-yellow-900/20 via-amber-900/10 to-transparent border-amber-500/20 overflow-hidden", className)}>
        <CardContent className="p-0">
          <div className="flex">
            {/* Loading skeleton for poster */}
            <div className="flex-shrink-0 w-24 h-36 bg-amber-500/10">
              <Skeleton className="w-full h-full" />
            </div>

            {/* Loading skeleton for content */}
            <div className="flex-1 p-4 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <div className="flex space-x-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={cn("bg-gradient-to-br from-yellow-900/20 via-amber-900/10 to-transparent border-amber-500/20 overflow-hidden", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-amber-100">IMDb</h3>
              <p className="text-sm text-amber-500/60">Unable to load preview</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
              onClick={() => window.open(url, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-gradient-to-br from-yellow-900/20 via-amber-900/10 to-transparent border-amber-500/20 hover:border-amber-500/40 transition-all duration-200 overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="flex">
          {/* Poster/Thumbnail */}
          <div className="flex-shrink-0 w-24 h-36 bg-amber-500/10 flex items-center justify-center overflow-hidden">
            {data.thumbnail ? (
              <img
                src={data.thumbnail}
                alt={data.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.warn('Failed to load IMDB poster:', data.thumbnail);
                  e.currentTarget.src = `https://via.placeholder.com/300x450?text=${encodeURIComponent(data.title)}`;
                }}
                onLoad={() => {
                  console.log('Successfully loaded IMDB poster:', data.thumbnail);
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-amber-700/10 flex items-center justify-center">
                <Star className="h-8 w-8 text-amber-500/60" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-amber-100 truncate mb-1">
                  {data.title}
                </h3>
                <div className="flex items-center space-x-2 text-xs text-amber-500/60">
                  {data.type && (
                    <span className="bg-amber-500/20 px-2 py-1 rounded">
                      {data.type}
                    </span>
                  )}
                  {data.year && (
                    <span>{data.year}</span>
                  )}
                  {data.rating && (
                    <span className="flex items-center space-x-1">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      <span>{data.rating}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-2">
                <div className="text-xs text-amber-500/60 font-medium">
                  IMDb
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                  onClick={() => window.open(url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {data.description && (
              <p className="text-sm text-amber-200/80 line-clamp-2 leading-relaxed">
                {data.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}