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
import { Heart, Repeat, MessageCircle, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

interface ParanormalPostProps {
  event: NostrEvent;
  onClick?: () => void;
  showActions?: boolean;
}

export function ParanormalPost({ event, onClick, showActions = true }: ParanormalPostProps) {
  const author = useAuthor(event.pubkey);
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);

  // Fetch all interaction counts in a single query
  const { nostr } = useNostr();

  const { data: interactionCounts, isLoading: isLoadingCounts } = useQuery({
    queryKey: ['post-interactions', event.id],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      // Single query with all interaction kinds
      const events = await nostr.query([{
        kinds: [6, 7, 9734, 1111], // reposts, likes, zaps, comments
        '#e': [event.id],
        limit: 200,
      }], { signal });

      // Process counts in JavaScript
      return {
        likes: events.filter(e => e.kind === 7).length,
        reposts: events.filter(e => e.kind === 6).length,
        zaps: events.filter(e => e.kind === 9734).length,
        comments: events.filter(e => e.kind === 1111).length,
      };
    },
  });

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
    createEvent({
      event: {
        kind: 6,
        content: '',
        tags: [['e', event.id], ['p', event.pubkey]]
      }
    });
    setReposted(true);
  };

  return (
    <Card
      className="border-lime-500/20 hover:border-lime-500/40 transition-all duration-200 cursor-pointer bg-black/40 backdrop-blur-sm"
      onClick={onClick}
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

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRepost();
                    }}
                    className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1"
                  >
                    <Repeat className={`h-4 w-4 ${reposted ? 'fill-lime-500 text-lime-500' : ''}`} />
                    <span className="text-xs">{repostCount}</span>
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
  );
}
