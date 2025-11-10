import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Award } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

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
  const displayUrl = thumbnailUrl || imageUrl;
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  const fallbackName = name || 'Badge';

  // Handle image load success
  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  // Handle image load error
  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  // Attempt to load image when URL is available
  useEffect(() => {
    if (displayUrl && !hasAttemptedLoad) {
      setHasAttemptedLoad(true);
      // Preload image to check if it loads successfully
      const img = new Image();
      img.onload = handleImageLoad;
      img.onerror = handleImageError;
      img.src = displayUrl;
    }
  }, [displayUrl, hasAttemptedLoad]);

  // Reset load attempt when URL changes
  useEffect(() => {
    setHasAttemptedLoad(false);
    setImageLoaded(false);
    setImageError(false);
  }, [displayUrl]);

  const BadgeImage = () => {
    // Show fallback if no URL or image failed to load
    if (!displayUrl || imageError) {
      return (
        <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-lime-500/20 to-lime-600/20 rounded-full border border-lime-500/30 flex-shrink-0">
          <Award className="w-4 h-4 text-lime-400 flex-shrink-0" />
        </div>
      );
    }

    // Show skeleton while loading
    if (!imageLoaded) {
      return <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />;
    }

    // Show the actual image
    return (
      <img
        src={displayUrl}
        alt={fallbackName}
        className="w-8 h-8 rounded-full border-2 border-lime-500/30 transition-all duration-200 hover:border-lime-500/50 hover:scale-105 object-cover flex-shrink-0"
        onLoad={handleImageLoad}
        onError={handleImageError}
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