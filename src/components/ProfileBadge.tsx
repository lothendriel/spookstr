import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Award } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

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

// Advanced CORS proxy that mimics badges.page approach
const getProxiedUrl = (originalUrl: string): string => {
  // Don't proxy URLs that are already working
  const workingDomains = [
    'assets-global.website-files.com',
    'image.nostr.build',
    'i.nostr.build'
  ];

  try {
    const urlObj = new URL(originalUrl);

    // Don't proxy domains that are already working
    if (workingDomains.some(domain => urlObj.hostname.includes(domain))) {
      return originalUrl;
    }

    // Domains that need proxy - same as badges.page likely handles
    const corsProblemDomains = [
      'nostr.build',
      'satellite.earth',
      'primal.net',
      'storage.googleapis.com',
      'pngtree.com',
      'happytavern.co'
    ];

    if (corsProblemDomains.some(domain => urlObj.hostname.includes(domain))) {
      // Multiple proxy strategies like badges.page might use
      const proxyStrategies = [
        // Weserv proxy - very reliable, used by many image services
        `https://images.weserv.nl/?url=${encodeURIComponent(originalUrl)}&w=64&h=64&fit=cover&output=webp`,
        // AllOrigins proxy - good fallback
        `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`,
        // Try different image transformation services
        `https://images.weserv.nl/?url=${encodeURIComponent(originalUrl)}&w=32&h=32&fit=cover&output=png`,
        // Last resort - different proxy service
        `https://cors-anywhere.herokuapp.com/${originalUrl}`,
      ];

      // Return first proxy strategy (most reliable)
      return proxyStrategies[0];
    }
  } catch {
    // If URL parsing fails, return original
  }

  return originalUrl;
};

// Test if a URL loads successfully (for debugging)
const testImageUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    return true;
  } catch {
    return false;
  }
};

// Image loading utility with retry and fallback
const loadImageWithFallback = async (
  urls: string[],
  retries = 3,
  timeout = 8000
): Promise<{ success: boolean; url?: string; error?: string }> => {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    for (const originalUrl of urls) {
      if (!isValidImageUrl(originalUrl)) {
        console.log('❌ Invalid image URL:', originalUrl);
        continue;
      }

      // Try multiple strategies for each URL, similar to how badges.page works
      const urlStrategies = [
        originalUrl,                                    // 1. Try original URL first
        getProxiedUrl(originalUrl),                     // 2. Try Weserv proxy (like badges.page)
        originalUrl.replace('https://', 'http://'),      // 3. Try HTTP instead of HTTPS
        // Additional proxy strategies for problematic domains
        ...(originalUrl.includes('nostr.build') || originalUrl.includes('satellite.earth')) ? [
          `https://images.weserv.nl/?url=${encodeURIComponent(originalUrl)}&w=64&h=64&fit=cover&output=webp`,
          `https://api.allorigins.win/raw?url=${encodeURIComponent(originalUrl)}`,
        ] : [],
      ].filter((url, index, array) => array.indexOf(url) === index); // Remove duplicates

      for (const url of urlStrategies) {
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

            // Smart crossOrigin strategy - match badges.page behavior
            if (url.includes('weserv.nl') || url.includes('allorigins.win')) {
              // Proxy services need crossOrigin
              img.crossOrigin = 'anonymous';
            } else if (url.includes('nostr.build') || url.includes('satellite.earth')) {
              // Try without crossOrigin first for these problematic domains
              img.crossOrigin = '';
            } else {
              // For other URLs, try without crossOrigin
              img.crossOrigin = '';
            }

            img.src = url;
          });

          // If we get here, the image loaded successfully
          return { success: true, url };
        } catch (error) {
          console.log(`⚠️ ${url} failed, trying next strategy...`);
        }
      }
    }

    // Wait before retry (exponential backoff)
    if (attempt < retries + 1) {
      await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
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
        console.log('🔄 Loading badge image with enhanced strategies:', {
          originalUrls: urls,
          badgeDefinition,
          willTryProxies: urls.some(url => {
            try {
              const urlObj = new URL(url);
              return ['nostr.build', 'satellite.earth', 'primal.net', 'storage.googleapis.com', 'pngtree.com', 'happytavern.co']
                .some(domain => urlObj.hostname.includes(domain));
            } catch {
              return false;
            }
          })
        });

        const result = await loadImageWithFallback(urls);

        if (result.success && result.url) {
          console.log('✅ Badge image loading succeeded:', {
            url: result.url,
            isProxied: result.url !== urls[0] && result.url !== urls[1],
            badgeDefinition,
            proxyUsed: result.url.includes('weserv.nl') || result.url.includes('allorigins.win')
          });
          setCurrentImageUrl(result.url);
          setImageLoaded(true);
          setImageError(false);
        } else {
          console.log('❌ All image URLs failed for badge:', {
            badgeDefinition,
            attemptedUrls: urls,
            error: result.error,
            willShowFallback: true,
            proxyAttempted: urls.some(url => url.includes('weserv.nl') || url.includes('allorigins.win'))
          });
          setImageError(true);
          setImageLoaded(false);
        }
      } catch (error) {
        console.log('❌ Error loading badge images:', {
          badgeDefinition,
          error: error instanceof Error ? error.message : error,
          willShowFallback: true
        });
        setImageError(true);
        setImageLoaded(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [imageUrl, thumbnailUrl, badgeDefinition]);

  const BadgeImage = () => {
    // Debug: Log current rendering state
    console.log('🖼️ BadgeImage rendering:', {
      hasValidUrls: getAllValidUrls().length > 0,
      imageError,
      isLoading,
      imageLoaded,
      currentImageUrl: currentImageUrl?.substring(0, 50) + '...',
      shouldShowFallback: getAllValidUrls().length === 0 || imageError,
      shouldShowSkeleton: isLoading || !imageLoaded,
      shouldShowImage: !isLoading && imageLoaded && !imageError
    });

    // Show fallback if no valid URLs or all failed
    if (getAllValidUrls().length === 0 || imageError) {
      console.log('🎨 Showing fallback badge');

      // Try to generate a badge from name or use a default
      const badgeName = name || fallbackName;
      const badgeInitial = badgeName.charAt(0).toUpperCase();

      return (
        <div
          className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-lime-500/20 to-lime-600/20 rounded-full border border-lime-500/30 flex-shrink-0 cursor-help group"
          onClick={() => {
            // Allow users to retry loading by clicking the fallback
            console.log('🔄 User requested retry for badge:', badgeDefinition);
            setImageError(false);
            setImageLoaded(false);
            setIsLoading(true);

            // Trigger a retry after a short delay
            setTimeout(() => {
              const urls = getAllValidUrls();
              if (urls.length > 0) {
                loadImageWithFallback(urls).then(result => {
                  if (result.success && result.url) {
                    setCurrentImageUrl(result.url);
                    setImageLoaded(true);
                    setImageError(false);
                  } else {
                    setImageError(true);
                    setImageLoaded(false);
                  }
                }).catch(() => {
                  setImageError(true);
                  setImageLoaded(false);
                }).finally(() => {
                  setIsLoading(false);
                });
              } else {
                setIsLoading(false);
                setImageError(true);
              }
            }, 100);
          }}
          title={`Badge: ${badgeName}\nClick to retry loading image\nCORS issue detected`}
        >
          {badgeInitial && (
            <span className="text-lime-400 font-bold text-xs group-hover:scale-110 transition-transform">
              {badgeInitial}
            </span>
          )}
          {!badgeInitial && (
            <Award className="w-4 h-4 text-lime-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
          )}
          {imageError && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-white rounded-full"></div>
            </div>
          )}
        </div>
      );
    }

    // Show skeleton while loading
    if (isLoading || !imageLoaded) {
      console.log('⏳ Showing skeleton');
      return <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />;
    }

    // Show actual image - simplified CSS to avoid conflicts
    console.log('✅ Showing image:', currentImageUrl?.substring(0, 50) + '...');

    // Create a ref to inspect the image element
    const imgRef = useRef<HTMLImageElement>(null);

    // Log image element properties after render
    useEffect(() => {
      if (imgRef.current) {
        const img = imgRef.current;
        console.log('🔍 Image element inspection:', {
          src: img.src?.substring(0, 50) + '...',
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          offsetWidth: img.offsetWidth,
          offsetHeight: img.offsetHeight,
          clientWidth: img.clientWidth,
          clientHeight: img.clientHeight,
          computedStyle: window.getComputedStyle(img),
          parentStyle: window.getComputedStyle(img.parentElement!),
          isVisible: img.offsetParent !== null,
          hasVisibility: window.getComputedStyle(img).visibility !== 'hidden',
          hasDisplay: window.getComputedStyle(img).display !== 'none',
          hasOpacity: parseFloat(window.getComputedStyle(img).opacity) > 0,
        });
      }
    });

    return (
      <img
        ref={imgRef}
        src={currentImageUrl || ''}
        alt={fallbackName}
        // Enhanced CSS classes for better display
        className="w-8 h-8 rounded-full border-2 border-lime-500/30 hover:border-lime-500/50 object-cover"
        style={{
          // Force display with inline styles to override any CSS conflicts - like badges.page
          display: 'block',
          visibility: 'visible',
          objectFit: 'cover',
          width: '32px',
          height: '32px',
          minWidth: '32px',
          minHeight: '32px',
          // Add some additional styles that might help with CORS issues
          imageRendering: 'auto',
          backgroundColor: 'transparent',
        }}
        onLoad={() => {
          console.log('✅ Image onLoad fired for:', currentImageUrl?.substring(0, 50) + '...');
          setImageLoaded(true);
          setImageError(false);
        }}
        onError={(e) => {
          console.log('❌ Final image onError fired for:', currentImageUrl, e);
          // Try to reload with different strategy if error occurs
          setImageError(true);
          setImageLoaded(false);
        }}
        loading="eager"
        crossOrigin=""  // Try without crossOrigin first for better compatibility
        fetchPriority="high"
        // Add additional attributes that might help with loading
        decoding="async"
        importance="high"
      />
    );
  };

  const BadgeContent = () => (
    <div className={`flex items-center justify-center ${className}`}>
      <BadgeImage />
    </div>
  );

  // Test: Temporarily disable tooltip to see if it's causing display issues
  const showTooltipForDebug = false; // Set to true to re-enable tooltip

  if (!showTooltip || !showTooltipForDebug) {
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