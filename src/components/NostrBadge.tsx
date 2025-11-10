import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, ExternalLink } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

// Global image cache to prevent redundant loading
const globalImageCache = new Map<string, {
  loaded: boolean;
  error: boolean;
  timestamp: number;
  retryCount: number;
}>();

// Known problematic domains and their alternative URLs
const getAlternativeImageUrl = (src: string): string | null => {
  // Handle void.cat URLs - they often have CORS or availability issues
  if (src.includes('void.cat/d/')) {
    // Try to convert to different void.cat URL format or use mirror
    const fileId = src.match(/void\.cat\/d\/([a-zA-Z0-9]+)/)?.[1];
    if (fileId) {
      // Try different void.cat endpoints
      return [
        `https://void.cat/d/${fileId}.webp`,
        `https://void.cat/d/${fileId}`,
        `https://cdn.void.cat/d/${fileId}`,
        `https://mirror.void.cat/d/${fileId}`
      ].find(url => url !== src) || null;
    }
  }

  // Handle other problematic domains here as needed
  return null;
};

// Image preloader utility with better error handling, timeout, and fallback URLs
const preloadImage = (src: string, timeout = 8000, attempt = 1): Promise<void> => {
  return new Promise((resolve, reject) => {
    const now = Date.now();
    const cacheEntry = globalImageCache.get(src);

    // Check if we have a cached entry
    if (cacheEntry) {
      // If successfully loaded, resolve immediately
      if (cacheEntry.loaded) {
        resolve();
        return;
      }

      // If failed, check if we should retry
      if (cacheEntry.error) {
        const timeSinceFailure = now - cacheEntry.timestamp;
        const retryDelay = Math.min(30000, 5000 * cacheEntry.retryCount); // Max 30s delay

        if (timeSinceFailure < retryDelay) {
          reject(new Error(`Image failed to load (from cache) - retry in ${Math.ceil((retryDelay - timeSinceFailure) / 1000)}s`));
          return;
        } else {
          console.log(`🔄 Retrying failed image after ${Math.floor(timeSinceFailure / 1000)}s:`, src);
        }
      }
    }

    const img = new Image();
    let timeoutId: NodeJS.Timeout;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      img.onload = null;
      img.onerror = null;
    };

    const onSuccess = () => {
      cleanup();
      globalImageCache.set(src, {
        loaded: true,
        error: false,
        timestamp: Date.now(),
        retryCount: 0
      });
      console.log('✅ Badge image loaded:', src);
      resolve();
    };

    const onError = async (error: any) => {
      cleanup();

      // Try alternative URL if available and this is first attempt
      if (attempt === 1) {
        const alternativeUrl = getAlternativeImageUrl(src);
        if (alternativeUrl) {
          console.log('🔄 Trying alternative URL for:', src, '->', alternativeUrl);
          try {
            await preloadImage(alternativeUrl, timeout, attempt + 1);
            // If alternative works, cache original URL as working too
            globalImageCache.set(src, {
              loaded: true,
              error: false,
              timestamp: Date.now(),
              retryCount: 0
            });
            resolve();
            return;
          } catch (altError) {
            console.log('❌ Alternative URL also failed:', alternativeUrl);
          }
        }
      }

      // Cache as failed with retry count
      const currentRetryCount = cacheEntry?.retryCount || 0;
      globalImageCache.set(src, {
        loaded: false,
        error: true,
        timestamp: Date.now(),
        retryCount: currentRetryCount + 1
      });
      console.log('❌ Badge image failed to load:', src, error?.message || 'Unknown error');
      reject(new Error('Image failed to load'));
    };

    const onTimeout = async () => {
      cleanup();

      // Try alternative URL on timeout too
      if (attempt === 1) {
        const alternativeUrl = getAlternativeImageUrl(src);
        if (alternativeUrl) {
          console.log('⏰ Timeout, trying alternative URL for:', src, '->', alternativeUrl);
          try {
            await preloadImage(alternativeUrl, timeout, attempt + 1);
            globalImageCache.set(src, {
              loaded: true,
              error: false,
              timestamp: Date.now(),
              retryCount: 0
            });
            resolve();
            return;
          } catch (altError) {
            console.log('❌ Alternative URL also timed out:', alternativeUrl);
          }
        }
      }

      // Cache as failed with retry count
      const currentRetryCount = cacheEntry?.retryCount || 0;
      globalImageCache.set(src, {
        loaded: false,
        error: true,
        timestamp: Date.now(),
        retryCount: currentRetryCount + 1
      });
      console.log('⏰ Badge image timeout:', src);
      reject(new Error('Image loading timeout'));
    };

    img.onload = onSuccess;
    img.onerror = onError;
    timeoutId = setTimeout(onTimeout, timeout);

    // Set crossOrigin for proper caching
    img.crossOrigin = 'anonymous';
    img.src = src;
  });
};

// Cleanup old cache entries (older than 1 hour, or failed entries older than 5 minutes)
const cleanupImageCache = () => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

  for (const [key, value] of globalImageCache.entries()) {
    // Remove successful entries older than 1 hour
    if (value.loaded && value.timestamp < oneHourAgo) {
      globalImageCache.delete(key);
    }
    // Remove failed entries older than 5 minutes to allow retries
    if (value.error && value.timestamp < fiveMinutesAgo) {
      globalImageCache.delete(key);
      console.log('🗑️ Cleared failed image cache entry for retry:', key);
    }
  }
};

// Run cleanup every 30 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupImageCache, 30 * 60 * 1000);
}

interface NostrBadgeProps {
  name?: string;
  description?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  badgeDefinition: string; // '30009:pubkey:identifier'
  badgeAwardId: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
  preloadImages?: boolean; // New prop to control preloading
}

export function NostrBadge({
  name,
  description,
  imageUrl,
  thumbnailUrl,
  badgeDefinition,
  badgeAwardId,
  size = 'md',
  showTooltip = true,
  className = '',
  preloadImages = true, // Default to true for immediate loading
}: NostrBadgeProps) {
  const displayUrl = thumbnailUrl || imageUrl;

  // Use ref to persist image loading state across component remounts
  const imageStateRef = useRef<{
    loaded: boolean;
    error: boolean;
  }>({
    loaded: false,
    error: false,
  });

  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);

  // Size configurations
  const sizeConfig = {
    xs: { width: 16, height: 16, className: 'h-4 w-4' },
    sm: { width: 32, height: 32, className: 'h-8 w-8' },
    md: { width: 48, height: 48, className: 'h-12 w-12' },
    lg: { width: 64, height: 64, className: 'h-16 w-16' },
  };

  const config = sizeConfig[size];
  const fallbackName = name || 'Badge';

  // Check global cache on mount
  useEffect(() => {
    if (displayUrl && globalImageCache.has(displayUrl)) {
      const cached = globalImageCache.get(displayUrl)!;
      setImageLoaded(cached.loaded);
      setImageError(cached.error);

      // Update ref with cached state
      imageStateRef.current = {
        loaded: cached.loaded,
        error: cached.error,
      };
    }
  }, [displayUrl]);

  // Update ref when image state changes
  useEffect(() => {
    imageStateRef.current = {
      loaded: imageLoaded,
      error: imageError,
    };
  }, [imageLoaded, imageError]);

  // Initialize state from ref on mount (for when component is remounted)
  useEffect(() => {
    setImageLoaded(imageStateRef.current.loaded);
    setImageError(imageStateRef.current.error);
  }, []);

  // Preload image immediately if enabled with retry logic
  useEffect(() => {
    if (!displayUrl || !preloadImages) return;

    // Check if already cached
    if (globalImageCache.has(displayUrl)) {
      const cached = globalImageCache.get(displayUrl)!;
      setImageLoaded(cached.loaded);
      setImageError(cached.error);
      console.log('📋 Using cached state for badge image:', displayUrl, { loaded: cached.loaded, error: cached.error });
      return;
    }

    const preloadImageWithRetry = async (retries = 2) => {
      setIsPreloading(true);

      for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
          console.log(`🎨 Attempt ${attempt}/${retries + 1} to preload badge image:`, displayUrl);
          await preloadImage(displayUrl);
          setImageLoaded(true);
          setImageError(false);
          console.log('✅ Badge image preloaded successfully:', displayUrl);
          return; // Success - exit the retry loop
        } catch (error) {
          console.log(`❌ Attempt ${attempt} failed for badge image:`, displayUrl, error?.message || 'Unknown error');

          if (attempt === retries + 1) {
            // Last attempt failed
            setImageError(true);
            setImageLoaded(true); // Mark as "loaded" even with error to show fallback
            console.log('💀 All retry attempts failed for badge image:', displayUrl);
          } else {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          }
        }
      }

      setIsPreloading(false);
    };

    preloadImageWithRetry();
  }, [displayUrl, preloadImages]);

  const BadgeImage = () => {
    // Try to use thumbnail if main image failed
    const [currentImageUrl, setCurrentImageUrl] = useState(displayUrl);
    const [hasTriedFallback, setHasTriedFallback] = useState(false);

    // Reset when displayUrl changes
    useEffect(() => {
      setCurrentImageUrl(displayUrl);
      setHasTriedFallback(false);
    }, [displayUrl]);

    const handleImageError = () => {
      console.log('❌ Failed to load badge image:', currentImageUrl);

      // Try thumbnail if main image failed and we haven't tried fallback yet
      if (!hasTriedFallback && imageUrl && thumbnailUrl && currentImageUrl === imageUrl) {
        console.log('🔄 Trying thumbnail fallback for:', imageUrl);
        setCurrentImageUrl(thumbnailUrl);
        setHasTriedFallback(true);
        return;
      }

      // If thumbnail also fails or no thumbnail available, show fallback
      setImageError(true);
      setImageLoaded(true);

      // Update global cache on error
      if (currentImageUrl) {
        const cacheEntry = globalImageCache.get(currentImageUrl);
        const retryCount = cacheEntry?.retryCount || 0;
        globalImageCache.set(currentImageUrl, {
          loaded: false,
          error: true,
          timestamp: Date.now(),
          retryCount: retryCount + 1
        });
      }
    };

    const handleImageLoad = () => {
      setImageLoaded(true);
      // Update global cache on successful load
      if (currentImageUrl) {
        globalImageCache.set(currentImageUrl, {
          loaded: true,
          error: false,
          timestamp: Date.now(),
          retryCount: 0
        });
        console.log('✅ Badge image loaded successfully:', currentImageUrl);
      }
    };

    if (!currentImageUrl || imageError) {
      return (
        <div className={`${config.className} flex items-center justify-center bg-gradient-to-br from-lime-500/20 to-lime-600/20 rounded-full border border-lime-500/30`}>
          <Award className="h-1/2 w-1/2 text-lime-400" />
        </div>
      );
    }

    // Show skeleton while preloading or loading
    if (!imageLoaded && (isPreloading || preloadImages)) {
      return <Skeleton className={`${config.className} rounded-full`} />;
    }

    return (
      <>
        {!imageLoaded && !preloadImages && (
          <Skeleton className={`${config.className} rounded-full`} />
        )}
        <img
          src={currentImageUrl}
          alt={fallbackName}
          className={`${config.className} rounded-full border-2 border-lime-500/30 transition-all duration-200 hover:border-lime-500/50 hover:scale-105 ${imageLoaded ? '' : 'hidden'}`}
          style={{ width: config.width, height: config.height }}
          onLoad={handleImageLoad}
          onError={handleImageError}
          // Remove lazy loading - load immediately
          loading="eager"
          // Add cache busting prevention for consistent caching
          crossOrigin="anonymous"
          // Add fetch priority for better loading
          fetchPriority="high"
        />
      </>
    );
  };

  const BadgeContent = () => (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <BadgeImage />
      {size === 'lg' && name && (
        <span className="text-xs text-lime-300 text-center max-w-[80px] truncate">
          {name}
        </span>
      )}
    </div>
  );

  if (!showTooltip) {
    return <BadgeContent />;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">
            <BadgeContent />
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs bg-black/90 border-lime-500/30 backdrop-blur-sm"
        >
          <div className="space-y-2">
            {name && (
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-lime-300">{name}</h4>
              </div>
            )}
            {description && (
              <p className="text-sm text-lime-100 leading-relaxed">
                {description}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-lime-500/70">
              <Award className="h-3 w-3" />
              <span>NIP-58 Badge</span>
            </div>
            {badgeDefinition && (
              <div className="text-xs text-lime-500/60 font-mono">
                {badgeDefinition}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Loading skeleton for badges
export function NostrBadgeSkeleton({ size = 'md' }: { size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const sizeConfig = {
    xs: { className: 'h-4 w-4' },
    sm: { className: 'h-8 w-8' },
    md: { className: 'h-12 w-12' },
    lg: { className: 'h-16 w-16' },
  };

  const config = sizeConfig[size];

  return (
    <div className="flex flex-col items-center gap-1">
      <Skeleton className={`${config.className} rounded-full`} />
      {size === 'lg' && <Skeleton className="h-3 w-16" />}
    </div>
  );
}

// Component for displaying multiple badges in a grid
interface NostrBadgeGridProps {
  badges: Array<{
    definition?: {
      name?: string;
      description?: string;
      image?: string;
      thumbs?: string[];
    };
    award?: {
      id: string;
    };
    profileBadge: {
      badgeDefinition: string;
      badgeAward: string;
    };
  }>;
  maxBadges?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function NostrBadgeGrid({
  badges,
  maxBadges = 12,
  size = 'sm',
  className = ''
}: NostrBadgeGridProps) {
  const displayBadges = badges.slice(0, maxBadges);

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className={`grid grid-cols-auto-fit gap-[1px] ${className}`}>
      {displayBadges.map((badge, index) => (
        <NostrBadge
          key={`${badge.profileBadge.badgeDefinition}-${index}`}
          name={badge.definition?.name}
          description={badge.definition?.description}
          imageUrl={badge.definition?.image}
          thumbnailUrl={badge.definition?.thumbs?.[0]} // Use smallest thumbnail
          badgeDefinition={badge.profileBadge.badgeDefinition}
          badgeAwardId={badge.profileBadge.badgeAward}
          size={size}
          showTooltip={true}
          preloadImages={true} // Enable immediate image loading
        />
      ))}
      {badges.length > maxBadges && (
        <div className="flex items-center justify-center">
          <Badge variant="outline" className="border-lime-500/30 text-lime-400">
            +{badges.length - maxBadges} more
          </Badge>
        </div>
      )}
    </div>
  );
}