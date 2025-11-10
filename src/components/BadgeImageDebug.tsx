import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface BadgeImageDebugProps {
  badges: Array<{
    definition?: {
      name?: string;
      description?: string;
      image?: string;
      thumbs?: string[];
    };
    profileBadge: {
      badgeDefinition: string;
      badgeAward: string;
    };
  }>;
}

export function BadgeImageDebug({ badges }: BadgeImageDebugProps) {
  const [refreshing, setRefreshing] = useState(false);

  const checkImageStatus = (url: string) => {
    const img = new Image();
    return new Promise<'loaded' | 'error' | 'timeout'>((resolve) => {
      const timeout = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        resolve('timeout');
      }, 5000);

      img.onload = () => {
        clearTimeout(timeout);
        resolve('loaded');
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolve('error');
      };

      img.src = url;
    });
  };

  const clearCache = () => {
    // Clear the global image cache
    if (typeof window !== 'undefined') {
      const globalCache = (window as any).globalImageCache;
      if (globalCache) {
        globalCache.clear();
        console.log('🗑️ Cleared global badge image cache');
      }
    }
    // Force a re-render by triggering state update
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 100);
  };

  const refreshStatus = async () => {
    setRefreshing(true);

    // Check all image URLs
    const imageUrls = new Set<string>();
    badges.forEach(badge => {
      if (badge.definition?.image) imageUrls.add(badge.definition.image);
      if (badge.definition?.thumbs) {
        badge.definition.thumbs.forEach(thumb => imageUrls.add(thumb));
      }
    });

    console.log('🔍 Checking status of', imageUrls.size, 'badge images...');

    for (const url of imageUrls) {
      try {
        const status = await checkImageStatus(url);
        console.log(`📊 ${url}: ${status}`);
      } catch (error) {
        console.log(`❌ Error checking ${url}:`, error);
      }
    }

    setRefreshing(false);
  };

  return (
    <Card className="border-lime-500/20 bg-black/40">
      <CardHeader>
        <CardTitle className="text-lime-400 flex items-center gap-2">
          <span>Badge Image Debug</span>
          <div className="flex gap-2">
            <Button
              onClick={clearCache}
              disabled={refreshing}
              size="sm"
              variant="outline"
              className="border-red-500/50 text-red-400"
            >
              Clear Cache
            </Button>
            <Button
              onClick={refreshStatus}
              disabled={refreshing}
              size="sm"
              variant="outline"
              className="border-lime-500/50 text-lime-400"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Check Status
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {badges.map((badge, index) => {
            const imageUrl = badge.definition?.image;
            const thumbnailUrl = badge.definition?.thumbs?.[0];

            return (
              <div key={index} className="border border-lime-500/20 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-lime-300">
                    {badge.definition?.name || `Badge ${index + 1}`}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {badge.profileBadge.badgeDefinition}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  {imageUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-lime-500/70">Main Image:</span>
                      <code className="text-xs bg-black/20 p-1 rounded break-all max-w-xs">
                        {imageUrl}
                      </code>
                    </div>
                  )}

                  {thumbnailUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-lime-500/70">Thumbnail:</span>
                      <code className="text-xs bg-black/20 p-1 rounded break-all max-w-xs">
                        {thumbnailUrl}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}