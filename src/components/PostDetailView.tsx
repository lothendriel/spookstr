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
import { ArrowLeft, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { genUserName } from '@/lib/genUserName';

interface PostDetailViewProps {
  event: NostrEvent;
  onBack: () => void;
}

export function PostDetailView({ event, onBack }: PostDetailViewProps) {
  const author = useAuthor(event.pubkey);
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { data: replies = [] } = useParanormalReplies(event.id);
  const [replyContent, setReplyContent] = useState('');

  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(event.pubkey);
  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), { addSuffix: true });

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
            <Avatar className="h-12 w-12 border-2 border-lime-500/30">
              <AvatarImage src={metadata?.picture} alt={displayName} />
              <AvatarFallback className="bg-lime-500/20 text-lime-400">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-lime-400 text-lg">{displayName}</span>
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
          
          <div className="flex items-center justify-between pt-3 border-t border-lime-500/20">
            <ZapButton
              event={event}
              className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10"
            />
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
              showActions={false}
            />
          ))
        )}
      </div>
    </div>
  );
}