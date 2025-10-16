import { useState, useEffect } from 'react';
import { MediaItem } from '@/lib/mediaParser';
import { getOpenGraphData, OpenGraphData } from '@/lib/mediaParser';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkPreviewProps {
  media: MediaItem;
  className?: string;
}

export function LinkPreview({ media, className }: LinkPreviewProps) {
  const [ogData, setOgData] = useState<OpenGraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (media.type !== 'link') return;
      
      try {
        setIsLoading(true);
        const data = await getOpenGraphData(media.url);
        setOgData(data);
        setError(null);
      } catch (err) {
        setError('Failed to load preview');
        console.warn('Failed to fetch link preview:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [media.url, media.type]);

  const title = ogData?.title || media.title || extractDomainName(media.url);
  const description = ogData?.description || media.description || 'Click to view this website';
  const imageUrl = ogData?.image || media.thumbnail;
  const siteName = ogData?.siteName || extractDomainName(media.url);

  const handleClick = () => {
    window.open(media.url, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <Card 
        className={cn(
          "w-full bg-lime-500/5 border-lime-500/20 overflow-hidden cursor-pointer hover:border-lime-500/40 transition-all duration-200",
          className
        )}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-lime-500/20 rounded-md flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-lime-500/20 rounded w-3/4 mb-2" />
                <div className="h-3 bg-lime-500/10 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-lime-500/10 rounded" />
              <div className="h-3 bg-lime-500/10 rounded w-5/6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card 
        className={cn(
          "w-full bg-lime-500/5 border-lime-500/20 overflow-hidden cursor-pointer hover:border-lime-500/40 transition-all duration-200",
          className
        )}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-lime-500/20 rounded-md flex items-center justify-center flex-shrink-0">
              <Globe className="h-4 w-4 text-lime-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-lime-100 truncate">
                {title}
              </p>
              <p className="text-xs text-lime-500/60 truncate">
                {media.url}
              </p>
            </div>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <ExternalLink className="h-4 w-4 text-lime-500" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "w-full bg-lime-500/5 border-lime-500/20 overflow-hidden cursor-pointer hover:border-lime-500/40 transition-all duration-200 group",
        className
      )}
      onClick={handleClick}
    >
      {imageUrl && (
        <div className="relative aspect-video bg-black/20 overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-black/60 text-white hover:bg-black/80">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <div className="w-6 h-6 bg-lime-500/20 rounded-md flex items-center justify-center flex-shrink-0">
                <Globe className="h-3 w-3 text-lime-500" />
              </div>
              <span className="text-xs text-lime-500/60 font-medium truncate">
                {siteName}
              </span>
            </div>
            {!imageUrl && (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                <ExternalLink className="h-4 w-4 text-lime-500" />
              </Button>
            )}
          </div>
          
          <h3 className="text-sm font-semibold text-lime-100 line-clamp-2 leading-tight">
            {title}
          </h3>
          
          {description && (
            <p className="text-xs text-lime-500/80 line-clamp-3 leading-relaxed">
              {description}
            </p>
          )}
          
          <p className="text-xs text-lime-500/50 truncate pt-1 border-t border-lime-500/10">
            {media.url}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function extractDomainName(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'Website';
  }
}