/**
 * Reusable interaction buttons for Nostr events
 * Consolidates like, repost, comment, and zap functionality
 */

import { useState } from 'react';
import { NostrEvent } from '@nostrify/nostrify';
import { Button } from '@/components/ui/button';
import { Heart, Repeat, MessageCircle, Zap, Quote, RadioTower, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useWallet } from '@/hooks/useWallet';
import { useZaps } from '@/hooks/useZaps';
import { ZapButton } from '@/components/ZapButton';
import { ZapDialog } from '@/components/ZapDialog';
import { Loading } from '@/components/ui/LoadingComponents';
import { 
  InteractionProps, 
  LikeButtonProps, 
  RepostButtonProps, 
  CommentButtonProps, 
  ZapButtonProps 
} from '@/types/components';

interface InteractionButtonsProps extends InteractionProps {
  isLiked?: boolean;
  isReposted?: boolean;
  likeCount?: number;
  repostCount?: number;
  commentCount?: number;
  zapCount?: number;
  totalSats?: number;
  hasLightningAddress?: boolean;
  onComment?: () => void;
  onQuote?: () => void;
  showLabels?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'minimal';
}

export function InteractionButtons({
  eventId,
  targetPubkey,
  currentUserPubkey,
  isLiked = false,
  isReposted = false,
  likeCount = 0,
  repostCount = 0,
  commentCount = 0,
  zapCount = 0,
  totalSats = 0,
  hasLightningAddress = false,
  onComment,
  onQuote,
  onInteraction,
  showLabels = false,
  disabled = false,
  size = 'md',
  variant = 'default',
  className
}: InteractionButtonsProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const { toast } = useToast();
  const { webln, activeNWC } = useWallet();
  
  const { isLoading: isZapLoading } = useZaps(
    { id: eventId } as NostrEvent, // Create minimal event for zaps
    webln,
    activeNWC
  );

  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);

  const handleLike = () => {
    if (!user || isLiking || isLiked) return;

    setIsLiking(true);
    onInteraction?.('like', { eventId, isLiking });

    createEvent({
      event: {
        kind: 7,
        content: '+',
        tags: [['e', eventId], ['p', targetPubkey]],
        created_at: Math.floor(Date.now() / 1000),
      }
    }, {
      onSuccess: () => {
        setIsLiking(false);
        toast({
          title: "Liked!",
          description: "Your like was published successfully.",
        });
        onInteraction?.('like', { eventId, liked: true });
      },
      onError: () => {
        setIsLiking(false);
        onInteraction?.('like', { eventId, liked: false });
        toast({
          title: "Like failed",
          description: "Failed to publish like",
          variant: "destructive",
        });
      }
    });
  };

  const handleRepost = (spookstrOnly: boolean = false) => {
    if (!user || isReposting || isReposted) return;

    setIsReposting(true);
    onInteraction?.('repost', { eventId, spookstrOnly, isReposting });

    const options = spookstrOnly ? { relayUrl: 'wss://spookstr2.nostr1.com' } : undefined;

    createEvent({
      event: {
        kind: 6,
        content: '', // Content will be filled by calling component
        tags: [['e', eventId], ['p', targetPubkey]],
        created_at: Math.floor(Date.now() / 1000),
      },
      options
    }, {
      onSuccess: () => {
        setIsReposting(false);
        if (spookstrOnly) {
          toast({
            title: "Reposted to Spookstr",
            description: "Your repost was published to Spookstr relay only.",
          });
        } else {
          toast({
            title: "Reposted!",
            description: "Your repost was published successfully.",
          });
        }
        onInteraction?.('repost', { eventId, reposted: true, spookstrOnly });
      },
      onError: () => {
        setIsReposting(false);
        onInteraction?.('repost', { eventId, reposted: false });
        toast({
          title: "Repost failed",
          description: "Failed to publish repost",
          variant: "destructive",
        });
      }
    });
  };

  const handleQuote = () => {
    if (!user || isQuoting) return;
    setIsQuoting(true);
    onInteraction?.('quote', { eventId, isQuoting });
    onQuote?.();
    setIsQuoting(false);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'h-8 px-2 text-xs';
      case 'lg': return 'h-12 px-4 text-base';
      default: return 'h-8 px-3 text-sm';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'h-3 w-3';
      case 'lg': return 'h-5 w-5';
      default: return 'h-4 w-4';
    }
  };

  const renderLikeButton = () => (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLike}
      disabled={!user || disabled || isLiking || isLiked}
      className={`text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1 ${getSizeClasses()} ${isLiked ? 'text-lime-500' : ''}`}
    >
      {isLiking ? <Loading variant="spinner" size="sm" /> : <Heart className={`${getIconSize()} ${isLiked ? 'fill-current' : ''}`} />}
      {showLabels && <span className="text-xs">{likeCount}</span>}
    </Button>
  );

  const renderRepostButton = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={!user || disabled || isReposting || isReposted}
          className={`text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1 ${getSizeClasses()} ${isReposted ? 'text-lime-500' : ''}`}
        >
          {isReposting ? <Loading variant="spinner" size="sm" /> : <Repeat className={`${getIconSize()} ${isReposted ? 'fill-current' : ''}`} />}
          {showLabels && <span className="text-xs">{repostCount}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={() => handleRepost(false)}
          disabled={isReposted}
          className="flex items-center space-x-2"
        >
          <Repeat className="h-4 w-4" />
          <span>{isReposted ? 'Already Reposted' : 'Repost'}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleRepost(true)}
          disabled={isReposted}
          className="flex items-center space-x-2"
        >
          <RadioTower className="h-4 w-4 text-purple-500" />
          <span>{isReposted ? 'Already Reposted' : 'Repost to Spookstr'}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleQuote}
          className="flex items-center space-x-2"
        >
          <Quote className="h-4 w-4" />
          <span>Quote Repost</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderCommentButton = () => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        onInteraction?.('comment', { eventId });
        onComment?.();
      }}
      disabled={disabled}
      className={`text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1 ${getSizeClasses()}`}
    >
      <MessageCircle className={getIconSize()} />
      {showLabels && <span className="text-xs">{commentCount}</span>}
    </Button>
  );

  const renderZapButton = () => {
    if (hasLightningAddress) {
      return (
        <ZapButton
          target={{ id: eventId, pubkey: targetPubkey } as NostrEvent}
          className={`text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1 ${getSizeClasses()}`}
          zapData={{ count: zapCount, totalSats, isLoading: isZapLoading }}
        >
          <Zap className={getIconSize()} />
          {showLabels && <span className="text-xs">{isZapLoading ? '...' : totalSats > 0 ? totalSats.toLocaleString() : 'Zap'}</span>}
        </ZapButton>
      );
    }

    return (
      <ZapDialog target={{ id: eventId, pubkey: targetPubkey } as NostrEvent}>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={`text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1 ${getSizeClasses()}`}
        >
          <Zap className={getIconSize()} />
          {showLabels && <span className="text-xs">{isZapLoading ? '...' : totalSats > 0 ? totalSats.toLocaleString() : 'Zap'}</span>}
        </Button>
      </ZapDialog>
    );
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        {renderLikeButton()}
        {renderCommentButton()}
        {renderZapButton()}
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Heart className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MessageCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Zap className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Repeat className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {renderLikeButton()}
      {renderRepostButton()}
      {renderCommentButton()}
      {renderZapButton()}
    </div>
  );
}

// Individual button components for more granular usage
export function LikeButton({ 
  eventId, 
  targetPubkey, 
  isLiked, 
  likeCount, 
  onInteraction,
  disabled = false,
  size = 'md',
  className 
}: LikeButtonProps) {
  return (
    <InteractionButtons
      eventId={eventId}
      targetPubkey={targetPubkey}
      isLiked={isLiked}
      likeCount={likeCount}
      onInteraction={onInteraction}
      disabled={disabled}
      size={size}
      variant="minimal"
      className={className}
    />
  );
}

export function RepostButton({ 
  eventId, 
  targetPubkey, 
  isReposted, 
  repostCount, 
  onRepost, 
  onQuote,
  onInteraction,
  disabled = false,
  size = 'md',
  className 
}: RepostButtonProps) {
  return (
    <InteractionButtons
      eventId={eventId}
      targetPubkey={targetPubkey}
      isReposted={isReposted}
      repostCount={repostCount}
      onInteraction={onInteraction}
      disabled={disabled}
      size={size}
      variant="minimal"
      className={className}
    />
  );
}

export function CommentButton({ 
  eventId, 
  commentCount, 
  onComment,
  onInteraction,
  disabled = false,
  size = 'md',
  className 
}: CommentButtonProps) {
  return (
    <InteractionButtons
      eventId={eventId}
      targetPubkey="" // Not needed for comment
      commentCount={commentCount}
      onComment={onComment}
      onInteraction={onInteraction}
      disabled={disabled}
      size={size}
      variant="minimal"
      className={className}
    />
  );
}

export function ZapButtonComponent({ 
  eventId, 
  targetPubkey, 
  zapCount, 
  totalSats, 
  hasLightningAddress,
  onInteraction,
  disabled = false,
  size = 'md',
  className 
}: ZapButtonProps) {
  return (
    <InteractionButtons
      eventId={eventId}
      targetPubkey={targetPubkey}
      zapCount={zapCount}
      totalSats={totalSats}
      hasLightningAddress={hasLightningAddress}
      onInteraction={onInteraction}
      disabled={disabled}
      size={size}
      variant="minimal"
      className={className}
    />
  );
}

export default InteractionButtons;