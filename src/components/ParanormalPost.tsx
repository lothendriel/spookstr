import { useState, memo, useEffect, useCallback, useMemo } from 'react';
import { NostrEvent } from '@nostrify/nostrify';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayName } from '@/lib/getDisplayName';
import { NoteContent } from '@/components/NoteContent';
import { ZapButton } from '@/components/ZapButton';
import { ZapDialog } from '@/components/ZapDialog';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useZaps } from '@/hooks/useZaps';
import { useWallet } from '@/hooks/useWallet';
import { Heart, Repeat, MessageCircle, Zap, Quote, RadioTower, MoreVertical, Copy, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimeInteractions } from '@/hooks/useRealtimeInteractions';
import { useInView } from 'react-intersection-observer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/useToast';

interface ParanormalPostProps {
  event: NostrEvent;
  onClick?: () => void;
  showActions?: boolean;
}

export function ParanormalPost({ event, onClick, showActions = true }: ParanormalPostProps) {
  // Query client for cache management
  const queryClient = useQueryClient();

  // Lazy loading with intersection observer
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px', // Start loading 200px before visible
  });

  // Check if this is a repost (kind 6 or 16)
  const isRepost = event.kind === 6 || event.kind === 16;

  // For reposts, try to parse the reposted event from content
  let repostedEvent: NostrEvent | null = null;
  let displayEvent = event;

  if (isRepost && event.content) {
    try {
      const parsed = JSON.parse(event.content);
      if (parsed.id && parsed.pubkey && parsed.created_at && parsed.kind !== undefined) {
        repostedEvent = parsed as NostrEvent;
        displayEvent = repostedEvent; // Show reposted content
      }
    } catch (e) {
      // If parsing fails, fall back to showing repost event itself
      console.warn('Failed to parse repost content:', e);
    }
  }

  const author = useAuthor(inView ? event.pubkey : undefined);
  const repostedAuthor = useAuthor(inView && repostedEvent ? repostedEvent.pubkey : undefined);
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const navigate = useNavigate();
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [quoteContent, setQuoteContent] = useState('');
  const [postToSpookstr2Only, setPostToSpookstr2Only] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();
  const { webln, activeNWC } = useWallet();

  // Get zap data for total sats amount
  const { totalSats, isLoading: isZapLoading } = useZaps(
    inView ? displayEvent : null,
    webln,
    activeNWC
  );

  // Use original event ID for interactions, not the reposted event
  const interactionEventId = useMemo(() => {
    return isRepost && repostedEvent ? repostedEvent.id : event.id;
  }, [isRepost, repostedEvent?.id, event.id]);

  // Fetch all interaction counts with real-time updates
  const {
    data: interactionCounts,
    isLoading: isLoadingCounts,
    error: interactionError,
    optimisticUpdate
  } = useRealtimeInteractions(interactionEventId);

  // Get interaction counts
  const likeCount = interactionCounts?.likes || 0;
  const repostCount = interactionCounts?.reposts || 0;
  const commentCount = interactionCounts?.comments || 0;
  const zapCount = interactionCounts?.zaps || 0;

  // Check if user has already interacted with this post
  const { data: userInteractions } = useQuery({
    queryKey: ['user-interactions', user?.pubkey, interactionEventId],
    queryFn: async () => {
      if (!user) return { liked: false, reposted: false, zapped: false };

      // Check cache for existing interactions first
      const cacheKey = `user-interaction-${user.pubkey}-${interactionEventId}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Query for existing interactions
      const { nostr } = await import('@nostrify/react');
      const { useNostr } = nostr;
      const nostrClient = useNostr();

      try {
        const signal = AbortSignal.timeout(3000);
        const events = await nostrClient.query([{
          kinds: [6, 7, 9735], // reposts, likes, zaps
          '#e': [interactionEventId],
          authors: [user.pubkey],
          limit: 10,
        }], { signal });

        const liked = events.some(e => e.kind === 7);
        const reposted = events.some(e => e.kind === 6);
        const zapped = events.some(e => e.kind === 9735);

        const result = { liked, reposted, zapped };

        // Cache the result for 5 minutes
        localStorage.setItem(cacheKey, JSON.stringify(result));
        return result;
      } catch (error) {
        console.warn('Failed to fetch user interactions:', error);
        return { liked: false, reposted: false, zapped: false };
      }
    },
    enabled: !!user && !!interactionEventId,
    staleTime: 60000, // 1 minute
  });

  const hasLiked = userInteractions?.liked || false;
  const hasReposted = userInteractions?.reposted || false;

  // Debug logging to see what's happening
  console.log(`[ParanormalPost] DEBUG - Post ${interactionEventId?.slice(0, 8)}:`, {
    isRepost,
    hasRepostedContent: !!repostedEvent,
    interactionEventId: interactionEventId?.slice(0, 8),
    isLoadingCounts,
    hasInteractionData: !!interactionCounts,
    interactionCounts,
    likeCount,
    repostCount,
    commentCount,
    zapCount,
    userPubkey: user?.pubkey?.slice(0, 8),
    eventPubkey: displayEvent.pubkey?.slice(0, 8),
    isOwnPost: user?.pubkey === displayEvent.pubkey,
    hasLiked,
    hasReposted
  });

  // Get metadata for reposter
  const reposterMetadata = author.data?.metadata;
  const reposterDisplayName = getDisplayName(reposterMetadata, event.pubkey);

  // Get metadata for original author (if this is a repost)
  const originalAuthorMetadata = repostedEvent ? repostedAuthor.data?.metadata : reposterMetadata;
  const displayName = repostedEvent
    ? getDisplayName(originalAuthorMetadata, repostedEvent.pubkey)
    : getDisplayName(reposterMetadata, event.pubkey);

  const timeAgo = formatDistanceToNow(new Date(displayEvent.created_at * 1000), { addSuffix: true });

  // Check if author has lightning address for zapping
  const hasLightningAddress = originalAuthorMetadata?.lud16 || originalAuthorMetadata?.lud06;

  // Always show zap button and count - disable button if no lightning address
  const shouldShowZapButton = true;
  const shouldShowZapCount = true;

  // Show skeleton if not yet in view
  if (!inView) {
    return (
      <div ref={ref}>
        <Card className="bg-black/60 border-lime-500/20 hover:border-lime-500/40 transition-all">
          <CardHeader className="pb-2">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAvatarClick = (e: React.MouseEvent, targetPubkey: string) => {
    e.stopPropagation();
    const npub = nip19.npubEncode(targetPubkey);
    navigate(`/${npub}`);
  };

  const handleLike = () => {
    if (!user || isLiking || hasLiked) return;

    setIsLiking(true);

    // Optimistic update - increment count immediately
    optimisticUpdate(7, 1);

    // Generate timestamp for better duplicate detection
    const created_at = Math.floor(Date.now() / 1000);

    // Like the original event, not the repost
    const targetEvent = repostedEvent || event;

    createEvent({
      event: {
        kind: 7,
        content: '+',
        tags: [['e', targetEvent.id], ['p', targetEvent.pubkey]],
        created_at,
      }
    }, {
      onSuccess: () => {
        setIsLiking(false);

        // Update local cache
        const cacheKey = `user-interaction-${user.pubkey}-${interactionEventId}`;
        const updatedInteractions = { ...userInteractions, liked: true };
        localStorage.setItem(cacheKey, JSON.stringify(updatedInteractions));

        // Update query cache
        queryClient.setQueryData(['user-interactions', user.pubkey, interactionEventId], updatedInteractions);

        toast({
          title: "Liked!",
          description: "Your like was published successfully.",
        });
      },
      onError: () => {
        setIsLiking(false);
        optimisticUpdate(7, -1); // Revert on error

        toast({
          title: "Like failed",
          description: "Failed to publish like",
          variant: "destructive",
        });
      }
    });
  };

  const handleRepost = (spookstrOnly: boolean = false) => {
    if (!user || isReposting || hasReposted) return;

    setIsReposting(true);

    console.log('handleRepost called with spookstrOnly:', spookstrOnly);

    // Optimistic update - increment count immediately
    optimisticUpdate(6, 1);

    // Generate timestamp for better duplicate detection
    const created_at = Math.floor(Date.now() / 1000);

    // Repost the original event, not a repost of a repost
    const targetEvent = repostedEvent || event;

    const options = spookstrOnly ? { relayUrl: 'wss://spookstr2.nostr1.com' } : undefined;
    console.log('Publishing repost with options:', options);

    createEvent({
      event: {
        kind: 6,
        content: JSON.stringify(targetEvent),
        tags: [['e', targetEvent.id], ['p', targetEvent.pubkey]],
        created_at,
      },
      options
    }, {
      onSuccess: () => {
        setIsReposting(false);

        // Update local cache
        const cacheKey = `user-interaction-${user.pubkey}-${interactionEventId}`;
        const updatedInteractions = { ...userInteractions, reposted: true };
        localStorage.setItem(cacheKey, JSON.stringify(updatedInteractions));

        // Update query cache
        queryClient.setQueryData(['user-interactions', user.pubkey, interactionEventId], updatedInteractions);

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
      },
      onError: () => {
        setIsReposting(false);
        optimisticUpdate(6, -1); // Revert on error

        toast({
          title: "Repost failed",
          description: "Failed to publish repost",
          variant: "destructive",
        });
      }
    });
  };

  const handleQuoteRepost = () => {
    if (!user) return;
    setIsQuoteDialogOpen(true);
  };

  const handleQuoteSubmit = () => {
    if (!user || !quoteContent.trim() || isQuoting) return;

    setIsQuoting(true);

    // Optimistic update - increment comment count immediately (since it's a kind 1 event)
    optimisticUpdate(1, 1);

    // Quote the original event, not a repost
    const targetEvent = repostedEvent || event;

    // Extract tags from original event, excluding 'e', 'p', 'q', 'imeta', and 'client' tags
    const originalTags = targetEvent.tags.filter(([tagName]) =>
      !['e', 'p', 'q', 'imeta', 'client'].includes(tagName)
    );

    console.log('Creating quote repost with original tags:', originalTags);

    // Generate timestamp for better duplicate detection
    const created_at = Math.floor(Date.now() / 1000);

    // Create quote repost with q tag and inherited tags
    createEvent({
      event: {
        kind: 1,
        content: `${quoteContent}\n\nnostr:${nip19.noteEncode(targetEvent.id)}`,
        tags: [
          ['q', targetEvent.id, '', targetEvent.pubkey],
          ['p', targetEvent.pubkey],
          ...originalTags
        ],
        created_at,
      },
      options: postToSpookstr2Only ? { relayUrl: 'wss://spookstr2.nostr1.com' } : undefined
    }, {
      onSuccess: () => {
        setIsQuoting(false);
        setQuoteContent('');
        setIsQuoteDialogOpen(false);
        setPostToSpookstr2Only(false); // Reset checkbox

        toast({
          title: "Quote posted!",
          description: "Your quote was published successfully.",
        });
      },
      onError: () => {
        setIsQuoting(false);
        optimisticUpdate(1, -1); // Revert on error

        toast({
          title: "Quote failed",
          description: "Failed to publish quote",
          variant: "destructive",
        });
      }
    });
  };

  const handleCopyNoteId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Copy note ID (note1... format)
      const noteId = nip19.noteEncode(displayEvent.id);
      await navigator.clipboard.writeText(noteId);
      setIsCopied(true);
      toast({
        title: "Copied!",
        description: "Note ID copied to clipboard",
      });
      // Reset copied state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy note ID",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card
        className="border-lime-500/20 hover:border-lime-500/40 transition-all duration-200 cursor-pointer bg-black/40 backdrop-blur-sm"
        onClick={onClick}
      >
      {/* Show repost indicator if this is a repost */}
      {isRepost && (
        <div className="px-4 pt-3 pb-0">
          <div className="flex items-center text-xs text-lime-500/60 mb-2">
            <Repeat className="h-3 w-3 mr-1" />
            <span
              className="cursor-pointer hover:text-lime-400 transition-colors"
              onClick={(e) => handleAvatarClick(e, event.pubkey)}
            >
              {reposterDisplayName} reposted
            </span>
          </div>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Avatar
            className="h-10 w-10 border-2 border-lime-500/30 cursor-pointer hover:border-lime-400/50 transition-colors"
            onClick={(e) => handleAvatarClick(e, displayEvent.pubkey)}
          >
            <AvatarImage src={originalAuthorMetadata?.picture} alt={displayName} />
            <AvatarFallback className="bg-lime-500/20 text-lime-400">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span
                className="font-semibold text-lime-400 cursor-pointer hover:text-lime-300 transition-colors"
                onClick={(e) => handleAvatarClick(e, displayEvent.pubkey)}
              >
                {displayName}
              </span>
              {originalAuthorMetadata?.nip05 && (
                <span className="text-xs text-lime-500/70">✓</span>
              )}
            </div>
            <span className="text-xs text-lime-500/60">{timeAgo}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
                className="h-8 w-8 p-0 text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={handleCopyNoteId}
                className="flex items-center space-x-2"
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4 text-lime-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Note ID</span>
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="whitespace-pre-wrap break-words text-lime-100">
          <NoteContent event={displayEvent} className="text-sm" />
        </div>

        {showActions && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-lime-500/20">
            <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
              {isLoadingCounts ? (
                // Loading skeletons for counts
                <div className="flex space-x-3">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ) : interactionError ? (
                // Error state - show buttons with zero counts and retry option
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
                    disabled={isLiking || hasLiked}
                    className={`text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1 ${hasLiked ? 'text-lime-500' : ''}`}
                  >
                    <Heart className={`h-4 w-4 ${hasLiked ? 'fill-current' : ''}`} />
                    <span className="text-xs">?</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => e.stopPropagation()}
                    disabled={isReposting || hasReposted}
                    className={`text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1 ${hasReposted ? 'text-lime-500' : ''}`}
                  >
                    <Repeat className={`h-4 w-4 ${hasReposted ? 'fill-current' : ''}`} />
                    <span className="text-xs">?</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onClick) onClick();
                    }}
                    className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-xs">?</span>
                  </Button>
                  {/* Always show zap button and count */}
                  {shouldShowZapCount && (
                    hasLightningAddress ? (
                      <ZapButton
                        target={event}
                        className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1"
                        zapData={{ count: zapCount, totalSats, isLoading: isZapLoading }}
                      />
                    ) : (
                      <ZapDialog target={event}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1"
                          disabled
                        >
                          <Zap className="h-4 w-4" />
                          <span className="text-xs">{zapCount}</span>
                        </Button>
                      </ZapDialog>
                    )
                  )}
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
                    disabled={isLiking || hasLiked}
                    className={`text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1 ${hasLiked ? 'text-lime-500' : ''}`}
                  >
                    <Heart className={`h-4 w-4 ${hasLiked ? 'fill-current' : ''}`} />
                    <span className="text-xs">{likeCount}</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        disabled={isReposting || hasReposted}
                        className={`text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1 ${hasReposted ? 'text-lime-500' : ''}`}
                      >
                        <Repeat className={`h-4 w-4 ${hasReposted ? 'fill-current' : ''}`} />
                        <span className="text-xs">{repostCount}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRepost(false);
                        }}
                        disabled={hasReposted}
                        className="flex items-center space-x-2"
                      >
                        <Repeat className="h-4 w-4" />
                        <span>{hasReposted ? 'Already Reposted' : 'Repost'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRepost(true);
                        }}
                        disabled={hasReposted}
                        className="flex items-center space-x-2"
                      >
                        <RadioTower className="h-4 w-4 text-purple-500" />
                        <span>{hasReposted ? 'Already Reposted' : 'Repost to Spookstr'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuoteRepost();
                        }}
                        className="flex items-center space-x-2"
                      >
                        <Quote className="h-4 w-4" />
                        <span>Quote Repost</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onClick) onClick();
                    }}
                    className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-xs">{commentCount}</span>
                  </Button>

                  {/* Show zap button and count */}
                  {hasLightningAddress ? (
                    <ZapButton
                      target={event}
                      className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1"
                      zapData={{ count: zapCount, totalSats, isLoading: isZapLoading }}
                    />
                  ) : (
                    <ZapDialog target={event}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1"
                      >
                        <Zap className="h-4 w-4" />
                        <span className="text-xs">{zapCount}</span>
                      </Button>
                    </ZapDialog>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Quote Repost Dialog */}
    <Dialog open={isQuoteDialogOpen} onOpenChange={(open) => {
      if (!open) {
        setIsQuoteDialogOpen(false);
        setPostToSpookstr2Only(false); // Reset checkbox when dialog is closed
      }
    }}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle>Quote Repost</DialogTitle>
          <DialogDescription>
            Add your thoughts about this post. The original post will be quoted below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="What do you think about this post?"
            value={quoteContent}
            onChange={(e) => setQuoteContent(e.target.value)}
            className="min-h-[100px] resize-none"
            disabled={isQuoting}
          />
          <div className="p-3 bg-lime-500/10 rounded-lg border border-lime-500/20 overflow-hidden">
            <p className="text-xs text-lime-500/60 mb-1">Original post:</p>
            <p className="text-sm text-lime-100 line-clamp-3 break-all whitespace-normal overflow-hidden">
              {displayEvent.content.substring(0, 150)}
              {displayEvent.content.length > 150 && '...'}
            </p>
          </div>

          {/* Spookstr2 Relay Option */}
          <div className="flex items-start space-x-3 p-4 border border-lime-500/20 rounded-lg bg-black/10">
            <div className="flex items-center h-5">
              <Checkbox
                id="spookstr2-only-quote"
                checked={postToSpookstr2Only}
                onCheckedChange={(checked) => setPostToSpookstr2Only(checked as boolean)}
                className="border-lime-500/50 data-[state=checked]:bg-lime-500 data-[state=checked]:border-lime-500"
                disabled={isQuoting}
              />
            </div>
            <div className="flex-1 space-y-1">
              <label htmlFor="spookstr2-only-quote" className="text-sm font-medium text-lime-300 cursor-pointer flex items-center gap-2">
                <RadioTower className="h-4 w-4" />
                Post to Spookstr2 Relay Only
              </label>
              <p className="text-xs text-lime-500/60">
                When checked, your quote repost will only be published to Spookstr2 relay. Uncheck to publish to all relays.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsQuoteDialogOpen(false);
              setPostToSpookstr2Only(false); // Reset checkbox when canceled
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleQuoteSubmit}
            disabled={!quoteContent.trim() || isQuoting}
            className="bg-lime-500 hover:bg-lime-600 text-black"
          >
            {isQuoting ? 'Posting...' : 'Quote Repost'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
);
}

// Memoize component to prevent unnecessary re-renders
export default memo(ParanormalPost);