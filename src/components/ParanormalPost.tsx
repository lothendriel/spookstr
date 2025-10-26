import { useState } from 'react';
import { NostrEvent } from '@nostrify/nostrify';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { NoteContent } from '@/components/NoteContent';
import { ZapButton } from '@/components/ZapButton';
import { ZapDialog } from '@/components/ZapDialog';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { Heart, Repeat, MessageCircle, Zap, Quote, RadioTower } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useRealtimeInteractions } from '@/hooks/useRealtimeInteractions';
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

interface ParanormalPostProps {
  event: NostrEvent;
  showActions?: boolean;
}

export function ParanormalPost({ event, showActions = true }: ParanormalPostProps) {
  const author = useAuthor(event.pubkey);
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [quoteContent, setQuoteContent] = useState('');
  const [postToSpookstr2Only, setPostToSpookstr2Only] = useState(false);

  // Fetch all interaction counts with real-time updates
  const { data: interactionCounts, isLoading: isLoadingCounts, optimisticUpdate } = useRealtimeInteractions(event.id);

  const likeCount = interactionCounts?.likes || 0;
  const repostCount = interactionCounts?.reposts || 0;
  const commentCount = interactionCounts?.comments || 0;
  const zapCount = interactionCounts?.zaps || 0;

  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(event.pubkey);
  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), { addSuffix: true });

  // Check if author has lightning address for zapping
  const hasLightningAddress = metadata?.lud16 || metadata?.lud06;

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const npub = nip19.npubEncode(event.pubkey);
    navigate(`/${npub}`);
  };

  const handleLike = () => {
    if (!user) return;

    // Optimistic update - increment count immediately
    optimisticUpdate(7, 1);

    createEvent({
      event: {
        kind: 7,
        content: '+',
        tags: [['e', event.id], ['p', event.pubkey]]
      }
    });
    setLiked(true);
  };

  const handleRepost = () => {
    if (!user) return;

    // Optimistic update - increment count immediately
    optimisticUpdate(6, 1);

    createEvent({
      event: {
        kind: 6,
        content: JSON.stringify(event),
        tags: [['e', event.id], ['p', event.pubkey]]
      }
    });
    setReposted(true);
  };

  const handleQuoteRepost = () => {
    if (!user) return;
    setIsQuoteDialogOpen(true);
  };

  const handleCardClick = () => {
    const noteId = nip19.noteEncode(event.id);
    navigate(`/${noteId}`);
  };

  const handleQuoteSubmit = () => {
    if (!user || !quoteContent.trim()) return;

    // Optimistic update - increment comment count immediately (since it's a kind 1 event)
    optimisticUpdate(1, 1);

    // Create quote repost with q tag
    createEvent({
      event: {
        kind: 1,
        content: `${quoteContent}\n\nnostr:${nip19.noteEncode(event.id)}`,
        tags: [
          ['q', event.id, '', event.pubkey],
          ['p', event.pubkey]
        ]
      },
      options: postToSpookstr2Only ? { relayUrl: 'wss://spookstr2.nostr1.com' } : undefined
    });
    setQuoteContent('');
    setIsQuoteDialogOpen(false);
    setReposted(true);
    setPostToSpookstr2Only(false); // Reset the checkbox
  };

  return (
    <>
      <Card
        className="border-lime-500/20 hover:border-lime-500/40 transition-all duration-200 cursor-pointer bg-black/40 backdrop-blur-sm"
        onClick={handleCardClick}
      >
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Avatar
            className="h-10 w-10 border-2 border-lime-500/30 cursor-pointer hover:border-lime-400/50 transition-colors"
            onClick={handleAvatarClick}
          >
            <AvatarImage src={metadata?.picture} alt={displayName} />
            <AvatarFallback className="bg-lime-500/20 text-lime-400">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span
                className="font-semibold text-lime-400 cursor-pointer hover:text-lime-300 transition-colors"
                onClick={handleAvatarClick}
              >
                {displayName}
              </span>
              {metadata?.nip05 && (
                <span className="text-xs text-lime-500/70">✓</span>
              )}
            </div>
            <span className="text-xs text-lime-500/60">{timeAgo}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="whitespace-pre-wrap break-words text-lime-100">
          <NoteContent event={event} className="text-sm" />
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
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike();
                    }}
                    className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1"
                  >
                    <Heart className={`h-4 w-4 ${liked ? 'fill-lime-500 text-lime-500' : ''}`} />
                    <span className="text-xs">{likeCount}</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1"
                      >
                        <Repeat className={`h-4 w-4 ${reposted ? 'fill-lime-500 text-lime-500' : ''}`} />
                        <span className="text-xs">{repostCount}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRepost();
                        }}
                        className="flex items-center space-x-2"
                      >
                        <Repeat className="h-4 w-4" />
                        <span>Repost</span>
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
                      handleCardClick();
                    }}
                    className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-xs">{commentCount}</span>
                  </Button>

                  {hasLightningAddress ? (
                    <ZapButton
                      target={event}
                      className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1"
                    >
                      <Zap className="h-4 w-4" />
                      <span className="text-xs">{zapCount}</span>
                    </ZapButton>
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
          <div className="p-3 bg-lime-500/10 rounded-lg border border-lime-500/20">
            <p className="text-xs text-lime-500/60 mb-1">Original post:</p>
            <p className="text-sm text-lime-100 line-clamp-3">
              {event.content.substring(0, 150)}
              {event.content.length > 150 && '...'}
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
