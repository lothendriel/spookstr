import { useState } from 'react';
import { NostrEvent } from '@nostrify/nostrify';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useParanormalReplies } from '@/hooks/useParanormalFeed';
import { ParanormalPost } from './ParanormalPost';
import { NoteContent } from '@/components/NoteContent';
import { ZapButton } from '@/components/ZapButton';
import { ZapDialog } from '@/components/ZapDialog';
import { ArrowLeft, Send, Heart, Repeat, MessageCircle, Zap } from 'lucide-react';
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
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { data: replies = [] } = useParanormalReplies(event.id);
  const navigate = useNavigate();
  const [replyContent, setReplyContent] = useState('');
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);

  // Fetch counts for likes, reposts, and zaps
  const { nostr } = useNostr();
  const { data: likeEvents } = useQuery({
    queryKey: ['likes', event.id],
    queryFn: async () => {
      const events = await nostr.query([{ kinds: [7], '#e': [event.id] }]);
      return events;
    }
  });
  const likeCount = likeEvents?.length || 0;

  const { data: repostEvents } = useQuery({
    queryKey: ['reposts', event.id],
    queryFn: async () => {
      const events = await nostr.query([{ kinds: [6], '#e': [event.id] }]);
      return events;
    }
  });
  const repostCount = repostEvents?.length || 0;

  const { data: zapEvents } = useQuery({
    queryKey: ['zaps', event.id],
    queryFn: async () => {
      const events = await nostr.query([{ kinds: [9734], '#e': [event.id] }]);
      return events;
    }
  });
  const zapCount = zapEvents?.length || 0;

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
      kind: 7,
      content: '+',
      tags: [['e', event.id], ['p', event.pubkey]]
    });
    setLiked(true);
  };

  const handleRepost = () => {
    if (!user) return;
    createEvent({
      kind: 6,
      content: '',
      tags: [['e', event.id], ['p', event.pubkey]]
    });
    setReposted(true);
  };

  const handleReply = () => {
    if (!user || !replyContent.trim()) return;

    createEvent({
      kind: 1,
      content: replyContent.trim(),
      tags: [['e', event.id], ['p', event.pubkey]]
    });

    setReplyContent('');
  };

  return (
    <div className="space-y-4">
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
              <span className="text-xs">{replies.length}</span>
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
          </div>
        </CardContent>
      </Card>

      {/* Reply Form */}
      {user && (
        <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="space-y-3">
              <Textarea
                placeholder="Share your thoughts on this paranormal experience..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="bg-black/20 border-lime-500/30 text-lime-100 placeholder:text-lime-500/50 resize-none"
                rows={3}
              />

              <div className="flex justify-end">
                <Button
                  onClick={handleReply}
                  disabled={!replyContent.trim() || isPending}
                  className="bg-lime-500 hover:bg-lime-400 text-black font-semibold"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isPending ? 'Posting...' : 'Reply'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Replies */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-lime-400">
          Replies ({replies.length})
        </h3>

        {replies.length === 0 ? (
          <Card className="border-dashed border-lime-500/20 bg-black/20">
            <CardContent className="p-6 text-center">
              <p className="text-lime-500/60">No replies yet. Be the first to share your thoughts!</p>
            </CardContent>
          </Card>
        ) : (
          replies.map((reply) => (
            <ParanormalPost
              key={reply.id}
              event={reply}
              showActions={true}
            />
          ))
        )}
      </div>
    </div>
  );
}
