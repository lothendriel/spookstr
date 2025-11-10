import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Award } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

// URL validation utility
const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    // Check if it's a valid HTTP/HTTPS URL
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

// Image loading utility with retry and fallback
const loadImageWithFallback = async (
  urls: string[], 
  retries = 2,
  timeout = 5000
): Promise<{ success: boolean; url?: string; error?: string }> => {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    for (const url of urls) {
      if (!isValidImageUrl(url)) {
        console.log('❌ Invalid image URL:', url);
        continue;
      }

      try {
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          let timeoutId: NodeJS.Timeout;

          const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            img.onload = null;
            img.onerror = null;
          };

          const onSuccess = () => {
            cleanup();
            console.log('✅ Badge image loaded successfully:', url);
            resolve();
          };

          const onError = (error: any) => {
            cleanup();
            console.log(`❌ Attempt ${attempt}/${retries + 1} failed for ${url}:`, error?.message || 'Unknown error');
            reject(new Error(`Failed to load ${url}`));
          };

          const onTimeout = () => {
            cleanup();
            console.log(`⏰ Attempt ${attempt}/${retries + 1} timeout for ${url}`);
            reject(new Error(`Timeout loading ${url}`));
          };

          img.onload = onSuccess;
          img.onerror = onError;
          timeoutId = setTimeout(onTimeout, timeout);

          // Try with and without crossOrigin
          img.crossOrigin = 'anonymous';
          img.src = url;
        });

        // If we get here, the image loaded successfully
        return { success: true, url };
      } catch (error) {
        // Continue to next URL or retry
        console.log(`⚠️ ${url} failed, trying next option...`);
      }
    }

    // Wait before retry (exponential backoff)
    if (attempt < retries + 1) {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  return { 
    success: false, 
    error: `All URLs failed after ${retries + 1} attempts` 
  };
};

interface ProfileBadgeProps {
  name?: string;
  description?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  badgeDefinition: string;
  badgeAwardId: string;
  showTooltip?: boolean;
  className?: string;
}

export function ProfileBadge({
  name,
  description,
  imageUrl,
  thumbnailUrl,
  badgeDefinition,
  badgeAwardId,
  showTooltip = true,
  className = '',
}: ProfileBadgeProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fallbackName = name || 'Badge';

  // Collect all valid URLs in order of preference
  const getAllValidUrls = () => {
    const urls: string[] = [];
    
    if (thumbnailUrl && isValidImageUrl(thumbnailUrl)) {
      urls.push(thumbnailUrl);
    }
    
    if (imageUrl && isValidImageUrl(imageUrl)) {
      urls.push(imageUrl);
    }

    return urls;
  };

  // Load image with fallback logic
  useEffect(() => {
    const urls = getAllValidUrls();
    
    if (urls.length === 0) {
      console.log('❌ No valid image URLs for badge:', badgeDefinition);
      setImageError(true);
      setImageLoaded(false);
      return;
    }

    const loadImage = async () => {
      setIsLoading(true);
      
      try {
        const result = await loadImageWithFallback(urls);
        
        if (result.success && result.url) {
          setCurrentImageUrl(result.url);
          setImageLoaded(true);
          setImageError(false);
        } else {
          console.log('❌ All image URLs failed for badge:', badgeDefinition, result.error);
          setImageError(true);
          setImageLoaded(false);
        }
      } catch (error) {
        console.log('❌ Error loading badge images:', error);
        setImageError(true);
        setImageLoaded(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [imageUrl, thumbnailUrl, badgeDefinition]);

  const BadgeImage = () => {
    // Show fallback if no valid URLs or all failed
    if (getAllValidUrls().length === 0 || imageError) {
      return (
        <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-lime-500/20 to-lime-600/20 rounded-full border border-lime-500/30 flex-shrink-0">
          <Award className="w-4 h-4 text-lime-400 flex-shrink-0" />
        </div>
      );
    }

    // Show skeleton while loading
    if (isLoading || !imageLoaded) {
      return <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />;
    }

    // Show the actual image
    return (
      <img
        src={currentImageUrl || ''}
        alt={fallbackName}
        className="w-8 h-8 rounded-full border-2 border-lime-500/30 transition-all duration-200 hover:border-lime-500/50 hover:scale-105 object-cover flex-shrink-0"
        onLoad={() => {
          setImageLoaded(true);
          setImageError(false);
        }}
        onError={(e) => {
          console.log('❌ Final image load failed:', currentImageUrl);
          setImageError(true);
          setImageLoaded(false);
        }}
        loading="eager"
        crossOrigin="anonymous"
        fetchPriority="high"
      />
    );
  };

  const BadgeContent = () => (
    <div className={`flex items-center justify-center ${className}`}>
      <BadgeImage />
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
            {imageError && (
              <div className="text-xs text-red-400">
                Image failed to load
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Loading skeleton for badges
export function ProfileBadgeSkeleton() {
  return (
    <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
  );
}

// Component for displaying multiple badges in a compact grid
interface ProfileBadgeGridProps {
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
  className?: string;
}

export function ProfileBadgeGrid({
  badges,
  maxBadges = 12,
  className = ''
}: ProfileBadgeGridProps) {
  const displayBadges = badges.slice(0, maxBadges);

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-0 ${className}`}>
      {displayBadges.map((badge, index) => (
        <div key={`${badge.profileBadge.badgeDefinition}-${index}`} className="flex-shrink-0">
          <ProfileBadge
            name={badge.definition?.name}
            description={badge.definition?.description}
            imageUrl={badge.definition?.image}
            thumbnailUrl={badge.definition?.thumbs?.[0]}
            badgeDefinition={badge.profileBadge.badgeDefinition}
            badgeAwardId={badge.profileBadge.badgeAward}
            showTooltip={true}
          />
        </div>
      ))}
      {badges.length > maxBadges && (
        <div className="flex items-center justify-center w-8 h-8 flex-shrink-0">
          <div className="text-xs text-lime-400 font-medium bg-lime-500/10 rounded-full w-8 h-8 flex items-center justify-center border border-lime-500/30">
            +{badges.length - maxBadges}
          </div>
        </div>
      )}
    </div>
  );
}