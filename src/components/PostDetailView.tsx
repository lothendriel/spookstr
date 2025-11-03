import { useState } from 'react';
import { NostrEvent } from '@nostrify/nostrify';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { usePostDetailDiscovery } from '@/hooks/useContextualRelayDiscovery';
import { SmartRelayDiscoveryIndicator } from '@/components/RelayDiscoveryIndicator';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { NoteContent } from '@/components/NoteContent';
import { ZapButton } from '@/components/ZapButton';
import { ZapDialog } from '@/components/ZapDialog';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { useRealtimeInteractions } from '@/hooks/useRealtimeInteractions';
import { useZaps } from '@/hooks/useZaps';
import { useWallet } from '@/hooks/useWallet';
import { ArrowLeft, Heart, Repeat, MessageCircle, Zap, Quote, RadioTower, MoreVertical, Copy, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getDisplayName } from '@/lib/getDisplayName';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
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

interface PostDetailViewProps {
  event: NostrEvent;
  onBack: () => void;
}

export function PostDetailView({ event, onBack }: PostDetailViewProps) {
  // Check if this is a repost (kind 6 or 16)
  const isRepost = event.kind === 6 || event.kind === 16;

  // Get post detail discovery stats
  const {
    events: discoveredEvents,
    isLoading: isDiscovering,
    stats: discoveryStats
  } = usePostDetailDiscovery(event.id);

  // For reposts, try to parse the reposted event from content
  let repostedEvent: NostrEvent | null = null;
  let displayEvent = event;

  if (isRepost && event.content) {
    try {
      const parsed = JSON.parse(event.content);
      if (parsed.id && parsed.pubkey && parsed.created_at && parsed.kind !== undefined) {
        repostedEvent = parsed as NostrEvent;
        displayEvent = repostedEvent; // Show the reposted content
      }
    } catch (e) {
      // If parsing fails, fall back to showing the repost event itself
      console.warn('Failed to parse repost content:', e);
    }
  }

  const author = useAuthor(event.pubkey);
  const repostedAuthor = useAuthor(repostedEvent ? repostedEvent.pubkey : undefined);
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [quoteContent, setQuoteContent] = useState('');
  const [postToSpookstr2Only, setPostToSpookstr2Only] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();
  const { webln, activeNWC } = useWallet();

  // Get zap data for total sats amount
  const { totalSats, isLoading: isZapLoading } = useZaps(
    displayEvent,
    webln,
    activeNWC
  );

  // Use the original event ID for interactions, not the reposted event
  const interactionEventId = isRepost && repostedEvent ? repostedEvent.id : event.id;

  // Use real-time interactions for counts
  const { data: interactionCounts, isLoading: isLoadingCounts, optimisticUpdate } = useRealtimeInteractions(interactionEventId);

  const likeCount = interactionCounts?.likes || 0;
  const repostCount = interactionCounts?.reposts || 0;
  const zapCount = interactionCounts?.zaps || 0;
  const commentCount = interactionCounts?.comments || 0;

  const { nostr } = useNostr();

  // Get metadata for the reposter
  const reposterMetadata = author.data?.metadata;
  const reposterDisplayName = getDisplayName(reposterMetadata, event.pubkey);

  // Get metadata for the original author (if this is a repost)
  const originalAuthorMetadata = repostedEvent ? repostedAuthor.data?.metadata : reposterMetadata;
  const displayName = repostedEvent
    ? getDisplayName(originalAuthorMetadata, repostedEvent.pubkey)
    : getDisplayName(reposterMetadata, event.pubkey);

  const timeAgo = formatDistanceToNow(new Date(displayEvent.created_at * 1000), { addSuffix: true });

  const hasLightningAddress = originalAuthorMetadata?.lud16 || originalAuthorMetadata?.lud06;

  const handleAvatarClick = (e: React.MouseEvent, targetPubkey: string = displayEvent.pubkey) => {
    e.stopPropagation();
    const npub = nip19.npubEncode(targetPubkey);
    navigate(`/${npub}`);
  };

  const handleLike = () => {
    if (!user) return;

    // Optimistic update
    optimisticUpdate(7, 1);
    setLiked(true);

    // Like the original event, not the repost
    const targetEvent = repostedEvent || event;

    createEvent(
      {
        event: {
          kind: 7,
          content: '+',
          tags: [['e', targetEvent.id], ['p', targetEvent.pubkey]]
        }
      },
      {
        onError: () => {
          // Revert on error
          optimisticUpdate(7, -1);
          setLiked(false);
        }
      }
    );
  };

  const handleRepost = (spookstrOnly: boolean = false) => {
    if (!user) return;

    // Optimistic update
    optimisticUpdate(6, 1);
    setReposted(true);

    // Repost the original event, not a repost of a repost
    const targetEvent = repostedEvent || event;

    createEvent(
      {
        event: {
          kind: 6,
          content: JSON.stringify(targetEvent),
          tags: [['e', targetEvent.id], ['p', targetEvent.pubkey]]
        },
        options: spookstrOnly ? { relayUrl: 'wss://spookstr2.nostr1.com' } : undefined
      },
      {
        onSuccess: () => {
          if (spookstrOnly) {
            toast({
              title: "Reposted to Spookstr",
              description: "Your repost was published to the Spookstr relay only.",
            });
          }
        },
        onError: () => {
          // Revert on error
          optimisticUpdate(6, -1);
          setReposted(false);
        }
      }
    );
  };

  const handleQuoteRepost = () => {
    if (!user) return;
    setIsQuoteDialogOpen(true);
  };

  const handleQuoteSubmit = () => {
    if (!user || !quoteContent.trim()) return;

    // Quote the original event, not a repost
    const targetEvent = repostedEvent || event;

    // Create quote repost with q tag
    createEvent({
      event: {
        kind: 1,
        content: `${quoteContent}\n\nnostr:${nip19.noteEncode(targetEvent.id)}`,
        tags: [
          ['q', targetEvent.id, '', targetEvent.pubkey],
          ['p', targetEvent.pubkey]
        ]
      },
      options: postToSpookstr2Only ? { relayUrl: 'wss://spookstr2.nostr1.com' } : undefined
    });
    setQuoteContent('');
    setIsQuoteDialogOpen(false);
    setReposted(true);
    setPostToSpookstr2Only(false); // Reset the checkbox
  };

  const handleCopyNoteId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Copy the note ID (note1... format) of the displayed event
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-lime-400 hover:text-lime-300 hover:bg-lime-500/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h2 className="text-xl font-bold text-lime-400">Post Details</h2>
          </div>
          <SmartRelayDiscoveryIndicator
            context="post-detail"
            eventsFound={discoveredEvents?.length || 0}
            hintsUsed={discoveryStats?.hintsUsed || false}
            isLoading={isDiscovering}
          />
        </div>

      {/* Main Post */}
      <Card className="border-lime-500/30 bg-black/50 backdrop-blur-sm">
        {/* Show repost indicator if this is a repost */}
        {isRepost && (
          <div className="px-6 pt-4 pb-0">
            <div className="flex items-center text-sm text-lime-500/60 mb-2">
              <Repeat className="h-4 w-4 mr-2" />
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
              className="h-12 w-12 border-2 border-lime-500/30 cursor-pointer hover:border-lime-400/50 transition-colors"
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
                  className="font-semibold text-lime-400 text-lg cursor-pointer hover:text-lime-300 transition-colors"
                  onClick={(e) => handleAvatarClick(e, displayEvent.pubkey)}
                >
                  {displayName}
                </span>
                {originalAuthorMetadata?.nip05 && (
                  <span className="text-xs text-lime-500/70">✓</span>
                )}
              </div>
              <span className="text-sm text-lime-500/60">{timeAgo}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
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
          <div className="whitespace-pre-wrap break-words text-lime-100 mb-4">
            <NoteContent event={displayEvent} />
          </div>

          <div className="flex items-center space-x-1 pt-3 border-t border-lime-500/20">
            {isLoadingCounts ? (
              // Loading skeletons for counts
              <div className="flex space-x-3">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  disabled={!user}
                  className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1 pr-1"
                >
                  <Heart className={`h-4 w-4 ${liked ? 'fill-lime-500 text-lime-500' : ''}`} />
                  <span className="text-xs">{likeCount}</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!user}
                      className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1 pr-1"
                    >
                      <Repeat className={`h-4 w-4 ${reposted ? 'fill-lime-500 text-lime-500' : ''}`} />
                      <span className="text-xs">{repostCount}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onClick={() => handleRepost(false)}
                      className="flex items-center space-x-2"
                    >
                      <Repeat className="h-4 w-4" />
                      <span>Repost</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleRepost(true)}
                      className="flex items-center space-x-2"
                    >
                      <RadioTower className="h-4 w-4 text-purple-500" />
                      <span>Repost to Spookstr</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleQuoteRepost}
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
                  className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1 pr-1"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs">{interactionCounts?.comments || 0}</span>
                </Button>

                {hasLightningAddress ? (
                  <ZapButton
                    target={event}
                    className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1 pr-1"
                    zapData={{ count: zapCount, totalSats, isLoading: isZapLoading }}
                  >
                    <Zap className="h-4 w-4" />
                    <span className="text-xs">{isZapLoading ? '...' : totalSats > 0 ? totalSats.toLocaleString() : 'Zap'}</span>
                  </ZapButton>
                ) : (
                  <ZapDialog target={event}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1 pr-1"
                    >
                      <Zap className="h-4 w-4" />
                      <span className="text-xs">{isZapLoading ? '...' : totalSats > 0 ? totalSats.toLocaleString() : 'Zap'}</span>
                    </Button>
                  </ZapDialog>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

        {/* Threaded Comments Section */}
        <CommentsSection
          root={event}
          title="Discussion"
          emptyStateMessage="No replies yet. Be the first to share your thoughts on this paranormal experience!"
          emptyStateSubtitle="Start the conversation..."
          className="border-lime-500/20 bg-black/40 backdrop-blur-sm"
          limit={100}
        />
      </div>

      {/* Quote Repost Dialog */}
      <Dialog open={isQuoteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsQuoteDialogOpen(false);
          setPostToSpookstr2Only(false); // Reset checkbox when dialog is closed
        }
      }}>
        <DialogContent className="sm:max-w-md">
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
            />
            <div className="p-3 bg-lime-500/10 rounded-lg border border-lime-500/20 overflow-hidden">
              <p className="text-xs text-lime-500/60 mb-1">Original post:</p>
              <div className="text-sm text-lime-100 line-clamp-3 break-words overflow-hidden">
                {displayEvent.content.substring(0, 150)}
                {displayEvent.content.length > 150 && '...'}
              </div>
            </div>

            {/* Spookstr2 Relay Option */}
            <div className="flex items-start space-x-3 p-4 border border-lime-500/20 rounded-lg bg-black/10">
              <div className="flex items-center h-5">
                <Checkbox
                  id="spookstr2-only-quote"
                  checked={postToSpookstr2Only}
                  onCheckedChange={(checked) => setPostToSpookstr2Only(checked as boolean)}
                  className="border-lime-500/50 data-[state=checked]:bg-lime-500 data-[state=checked]:border-lime-500"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label htmlFor="spookstr2-only-quote" className="text-sm font-medium text-lime-300 cursor-pointer flex items-center gap-2">
                  <RadioTower className="h-4 w-4" />
                  Post to Spookstr2 Relay Only
                </label>
                <p className="text-xs text-lime-500/60">
                  When checked, your quote repost will only be published to the Spookstr2 relay. Uncheck to publish to all relays.
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
              disabled={!quoteContent.trim()}
              className="bg-lime-500 hover:bg-lime-600 text-black"
            >
              Quote Repost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
