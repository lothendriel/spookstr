/**
 * Standardized author display component for Nostr profiles
 * Consolidates author information display logic across the application
 */

import { memo } from 'react';
import { nip19 } from 'nostr-tools';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/LoadingComponents';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayName } from '@/lib/getDisplayName';
import { formatDistanceToNow } from 'date-fns';
import { AuthorDisplayProps } from '@/types/components';
import { cn } from '@/lib/utils';

export const AuthorDisplay = memo(({
  pubkey,
  metadata,
  showAvatar = true,
  showName = true,
  showNip05 = true,
  showTime = false,
  timestamp,
  onAvatarClick,
  onNameClick,
  className,
  size = 'md',
  variant = 'default'
}: AuthorDisplayProps) => {
  const navigate = useNavigate();
  const author = useAuthor(pubkey);
  const authorMetadata = metadata || author.data?.metadata;
  
  const displayName = getDisplayName(authorMetadata, pubkey);
  const timeAgo = timestamp ? formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true }) : '';
  
  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAvatarClick) {
      onAvatarClick(pubkey);
    } else {
      const npub = nip19.npubEncode(pubkey);
      navigate(`/${npub}`);
    }
  };

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNameClick) {
      onNameClick(pubkey);
    } else {
      const npub = nip19.npubEncode(pubkey);
      navigate(`/${npub}`);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          avatar: 'h-8 w-8',
          avatarFallback: 'text-xs',
          name: 'text-sm',
          time: 'text-xs',
          nip05: 'text-xs'
        };
      case 'lg':
        return {
          avatar: 'h-12 w-12',
          avatarFallback: 'text-sm',
          name: 'text-base',
          time: 'text-sm',
          nip05: 'text-sm'
        };
      default: // md
        return {
          avatar: 'h-10 w-10',
          avatarFallback: 'text-xs',
          name: 'text-sm',
          time: 'text-xs',
          nip05: 'text-xs'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return {
          container: 'flex items-center space-x-2',
          nameContainer: 'flex items-center space-x-1'
        };
      case 'minimal':
        return {
          container: 'flex items-center space-x-1',
          nameContainer: 'flex items-center space-x-1'
        };
      default: // default
        return {
          container: 'flex items-center space-x-3',
          nameContainer: 'flex items-center space-x-2'
        };
    }
  };

  const variantClasses = getVariantClasses();

  if (!author.data && !metadata) {
    return (
      <div className={cn(variantClasses.container, className)}>
        {showAvatar && <Skeleton variant="avatar" size={size} />}
        <div className="space-y-1">
          <Skeleton width="20" height="4" />
          {showTime && <Skeleton width="16" height="3" />}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(variantClasses.container, className)}>
      {showAvatar && (
        <Avatar
          className={cn(
            'border-2 border-lime-500/30 cursor-pointer hover:border-lime-400/50 transition-colors',
            sizeClasses.avatar
          )}
          onClick={handleAvatarClick}
        >
          <AvatarImage src={authorMetadata?.picture} alt={displayName} />
          <AvatarFallback className={cn('bg-lime-500/20 text-lime-400', sizeClasses.avatarFallback)}>
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className="flex-1 min-w-0">
        {showName && (
          <div className={cn(variantClasses.nameContainer, 'items-center')}>
            <span
              className={cn(
                'font-semibold text-lime-400 cursor-pointer hover:text-lime-300 transition-colors truncate',
                sizeClasses.name
              )}
              onClick={handleNameClick}
            >
              {displayName}
            </span>
            {showNip05 && authorMetadata?.nip05 && (
              <span className={cn('text-lime-500/70', sizeClasses.nip05)}>✓</span>
            )}
          </div>
        )}
        
        {showTime && timeAgo && (
          <span className={cn('text-lime-500/60 block', sizeClasses.time)}>
            {timeAgo}
          </span>
        )}
      </div>
    </div>
  );
});

AuthorDisplay.displayName = 'AuthorDisplay';

/**
 * Compact version of AuthorDisplay for tight spaces
 */
export const CompactAuthorDisplay = memo((props: Omit<AuthorDisplayProps, 'variant'>) => (
  <AuthorDisplay {...props} variant="compact" />
));

CompactAuthorDisplay.displayName = 'CompactAuthorDisplay';

/**
 * Minimal version of AuthorDisplay for very tight spaces
 */
export const MinimalAuthorDisplay = memo((props: Omit<AuthorDisplayProps, 'variant'>) => (
  <AuthorDisplay {...props} variant="minimal" />
));

MinimalAuthorDisplay.displayName = 'MinimalAuthorDisplay';

/**
 * Author display with repost information
 */
interface RepostAuthorDisplayProps extends AuthorDisplayProps {
  reposterPubkey: string;
  reposterMetadata?: AuthorDisplayProps['metadata'];
  showRepostLabel?: boolean;
}

export const RepostAuthorDisplay = memo(({
  reposterPubkey,
  reposterMetadata,
  showRepostLabel = true,
  ...props
}: RepostAuthorDisplayProps) => {
  return (
    <div className="space-y-2">
      {/* Reposter information */}
      {showRepostLabel && (
        <div className="flex items-center text-xs text-lime-500/60">
          <span className="mr-1">↻</span>
          <CompactAuthorDisplay
            pubkey={reposterPubkey}
            metadata={reposterMetadata}
            showAvatar={false}
            showNip05={false}
            showTime={false}
          />
          <span className="ml-1">reposted</span>
        </div>
      )}
      
      {/* Original author */}
      <AuthorDisplay {...props} />
    </div>
  );
});

RepostAuthorDisplay.displayName = 'RepostAuthorDisplay';

/**
 * Author display for comments
 */
export const CommentAuthorDisplay = memo((props: Omit<AuthorDisplayProps, 'size'>) => (
  <AuthorDisplay {...props} size="sm" />
));

CommentAuthorDisplay.displayName = 'CommentAuthorDisplay';

/**
 * Loading skeleton for author display
 */
interface AuthorDisplaySkeletonProps {
  showAvatar?: boolean;
  showTime?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AuthorDisplaySkeleton = memo(({
  showAvatar = true,
  showTime = false,
  size = 'md',
  className
}: AuthorDisplaySkeletonProps) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          avatar: 'h-8 w-8',
          name: 'h-3 w-20',
          time: 'h-3 w-16'
        };
      case 'lg':
        return {
          avatar: 'h-12 w-12',
          name: 'h-5 w-32',
          time: 'h-4 w-24'
        };
      default: // md
        return {
          avatar: 'h-10 w-10',
          name: 'h-4 w-24',
          time: 'h-3 w-16'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <div className={cn('flex items-center space-x-3', className)}>
      {showAvatar && <Skeleton variant="avatar" size={size} />}
      <div className="space-y-2">
        <Skeleton width={sizeClasses.name} height={sizeClasses.name} />
        {showTime && <Skeleton width={sizeClasses.time} height={sizeClasses.time} />}
      </div>
    </div>
  );
});

AuthorDisplaySkeleton.displayName = 'AuthorDisplaySkeleton';

/**
 * Author display with additional metadata
 */
interface EnhancedAuthorDisplayProps extends AuthorDisplayProps {
  showAbout?: boolean;
  showLightningAddress?: boolean;
  maxAboutLength?: number;
}

export const EnhancedAuthorDisplay = memo(({
  showAbout = false,
  showLightningAddress = false,
  maxAboutLength = 100,
  ...props
}: EnhancedAuthorDisplayProps) => {
  const author = useAuthor(props.pubkey);
  const authorMetadata = props.metadata || author.data?.metadata;
  
  const aboutText = authorMetadata?.about 
    ? (authorMetadata.about.length > maxAboutLength 
        ? `${authorMetadata.about.substring(0, maxAboutLength)}...` 
        : authorMetadata.about)
    : null;

  const lightningAddress = authorMetadata?.lud16 || authorMetadata?.lud06;

  return (
    <div className="space-y-2">
      <AuthorDisplay {...props} />
      
      {showAbout && aboutText && (
        <p className="text-sm text-lime-300/70 line-clamp-2">
          {aboutText}
        </p>
      )}
      
      {showLightningAddress && lightningAddress && (
        <p className="text-xs text-lime-500/60 font-mono">
          ⚡ {lightningAddress}
        </p>
      )}
    </div>
  );
});

EnhancedAuthorDisplay.displayName = 'EnhancedAuthorDisplay';

export default AuthorDisplay;