import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, ExternalLink } from 'lucide-react';
import { useState } from 'react';

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
}: NostrBadgeProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Size configurations
  const sizeConfig = {
    xs: { width: 16, height: 16, className: 'h-4 w-4' },
    sm: { width: 32, height: 32, className: 'h-8 w-8' },
    md: { width: 48, height: 48, className: 'h-12 w-12' },
    lg: { width: 64, height: 64, className: 'h-16 w-16' },
  };

  const config = sizeConfig[size];
  const displayUrl = thumbnailUrl || imageUrl;
  const fallbackName = name || 'Badge';

  const BadgeImage = () => {
    if (!displayUrl || imageError) {
      return (
        <div className={`${config.className} flex items-center justify-center bg-gradient-to-br from-lime-500/20 to-lime-600/20 rounded-full border border-lime-500/30`}>
          <Award className="h-1/2 w-1/2 text-lime-400" />
        </div>
      );
    }

    return (
      <>
        {!imageLoaded && (
          <Skeleton className={`${config.className} rounded-full`} />
        )}
        <img
          src={displayUrl}
          alt={fallbackName}
          className={`${config.className} rounded-full border-2 border-lime-500/30 transition-all duration-200 hover:border-lime-500/50 hover:scale-105 ${imageLoaded ? '' : 'hidden'}`}
          style={{ width: config.width, height: config.height }}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            console.log('❌ Failed to load badge image:', displayUrl);
            setImageError(true);
            setImageLoaded(true);
          }}
          loading="lazy"
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
    <div className={`grid grid-cols-auto-fit gap-1 ${className}`}>
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