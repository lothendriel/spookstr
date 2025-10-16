import { useState } from 'react';
import { NostrEvent } from '@nostrify/nostrify';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { NoteContent } from '@/components/NoteContent';
import { ZapButton } from '@/components/ZapButton';
import { ZapDialog } from '@/components/ZapDialog';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { Heart, Repeat, MessageCircle, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ParanormalPostProps {
  event: NostrEvent;
  onClick?: () => void;
  showActions?: boolean;
}

export function ParanormalPost({ event, onClick, showActions = true }: ParanormalPostProps) {
  const author = useAuthor(event.pubkey);
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);

  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(event.pubkey);
  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), { addSuffix: true });

  // Check if author has lightning address for zapping
  const hasLightningAddress = metadata?.lud16 || metadata?.lud06;

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

  // Quote repost functionality removed as share button was deprecated

  return (
    <Card
      className="border-lime-500/20 hover:border-lime-500/40 transition-all duration-200 cursor-pointer bg-black/40 backdrop-blur-sm"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10 border-2 border-lime-500/30">
            <AvatarImage src={metadata?.picture} alt={displayName} />
            <AvatarFallback className="bg-lime-500/20 text-lime-400">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-lime-400">{displayName}</span>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike();
                }}
                className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10"
              >
                <Heart className={`h-4 w-4 ${liked ? 'fill-lime-500 text-lime-500' : ''}`} />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRepost();
                }}
                className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10"
              >
                <Repeat className={`h-4 w-4 ${reposted ? 'fill-lime-500 text-lime-500' : ''}`} />
              </Button>

              

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onClick) onClick();
                }}
                className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>

              {hasLightningAddress ? (
                <ZapButton
                  target={event}
                  className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10"
                />
              ) : (
                <ZapDialog target={event}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10"
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                </ZapDialog>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}