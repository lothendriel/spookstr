import { useState } from 'react';
import { NostrEvent } from '@nostrify/nostrify';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { ArrowLeft, Heart, Repeat, MessageCircle, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { genUserName } from '@/lib/genUserName';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

interface PostDetailViewProps {
  event: NostrEvent;
  onBack: () => void;
}

export function PostDetailView({ event, onBack }: PostDetailViewProps) {
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
  const zapCount = interactionCounts?.zaps || 0;

  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(event.pubkey);
  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), { addSuffix: true });

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
    <div className="space-y-6">
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

      {/* Main Post */}
      <Card className="border-lime-500/30 bg-black/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-3">
            <Avatar
              className="h-12 w-12 border-2 border-lime-500/30 cursor-pointer hover:border-lime-400/50 transition-colors"
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
                  className="font-semibold text-lime-400 text-lg cursor-pointer hover:text-lime-300 transition-colors"
                  onClick={handleAvatarClick}
                >
                  {displayName}
                </span>
                {metadata?.nip05 && (
                  <span className="text-xs text-lime-500/70">✓</span>
                )}
              </div>
              <span className="text-sm text-lime-500/60">{timeAgo}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="whitespace-pre-wrap break-words text-lime-100 mb-4">
            <NoteContent event={event} />
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

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRepost}
                  disabled={!user}
                  className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1 pr-1"
                >
                  <Repeat className={`h-4 w-4 ${reposted ? 'fill-lime-500 text-lime-500' : ''}`} />
                  <span className="text-xs">{repostCount}</span>
                </Button>

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
                  >
                    <Zap className="h-4 w-4" />
                    <span className="text-xs">{zapCount}</span>
                  </ZapButton>
                ) : (
                  <ZapDialog target={event}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1 pr-1"
                    >
                      <Zap className="h-4 w-4" />
                      <span className="text-xs">{zapCount}</span>
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
  );
}
