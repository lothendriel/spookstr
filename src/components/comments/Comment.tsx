import { useState } from 'react';
import { Link } from 'react-router-dom';
import { NostrEvent } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { useComments } from '@/hooks/useComments';
import { CommentForm } from './CommentForm';
import { NoteContent } from '@/components/NoteContent';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Heart, Zap, MessageSquare, ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { genUserName } from '@/lib/genUserName';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { ZapDialog } from '@/components/ZapDialog';

interface CommentProps {
  root: NostrEvent | URL;
  comment: NostrEvent;
  depth?: number;
  maxDepth?: number;
  limit?: number;
  isLastInBranch?: boolean;
}

export function Comment({ root, comment, depth = 0, maxDepth = 6, limit, isLastInBranch = false }: CommentProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(depth < 2); // Auto-expand first 2 levels
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();

  const author = useAuthor(comment.pubkey);
  const { data: commentsData } = useComments(root, limit);

  // Fetch counts for likes and zaps
  const { nostr } = useNostr();
  const { data: likeEvents } = useQuery({
    queryKey: ['likes', comment.id],
    queryFn: async () => {
      const events = await nostr.query([{ kinds: [7], '#e': [comment.id] }]);
      return events;
    }
  });
  const likeCount = likeEvents?.length || 0;

  const { data: zapEvents } = useQuery({
    queryKey: ['zaps', comment.id],
    queryFn: async () => {
      const events = await nostr.query([{ kinds: [9734], '#e': [comment.id] }]);
      return events;
    }
  });
  const zapCount = zapEvents?.length || 0;

  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(comment.pubkey);
  const timeAgo = formatDistanceToNow(new Date(comment.created_at * 1000), { addSuffix: true });

  // Get direct replies to this comment
  const replies = commentsData?.getDirectReplies(comment.id) || [];
  const hasReplies = replies.length > 0;
  const canExpand = depth < maxDepth;

  const handleLike = () => {
    if (!user) return;
    publishEvent({
      event: {
        kind: 7,
        content: '+',
        tags: [['e', comment.id], ['p', comment.pubkey]]
      }
    });
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const npub = nip19.npubEncode(comment.pubkey);
    window.location.href = `/${npub}`;
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      {/* Connecting line for nested comments */}
      {depth > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 w-px bg-border"
          style={{
            left: '-12px',
            height: depth > 0 ? 'calc(100% - 24px)' : '100%'
          }}
        />
      )}

      <div className={`space-y-3 ${depth > 0 ? 'ml-6 pl-4' : ''}`}>
        <Card className={`bg-card/50 transition-all hover:bg-card/70 ${depth > 0 ? 'shadow-sm' : ''}`}>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Comment Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Link to={`/${nip19.npubEncode(comment.pubkey)}`}
                    onClick={handleAvatarClick}
                  >
                    <Avatar className="h-8 w-8 hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer">
                      <AvatarImage src={metadata?.picture} />
                      <AvatarFallback className="text-xs">
                        {displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <Link
                      to={`/${nip19.npubEncode(comment.pubkey)}`}
                      className="font-medium text-sm hover:text-primary transition-colors"
                    >
                      {displayName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{timeAgo}</p>
                  </div>
                </div>
              </div>

              {/* Comment Content */}
              <div className="text-sm leading-relaxed">
                <NoteContent event={comment} className="text-sm" />
              </div>

              {/* Comment Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
                    disabled={!user}
                    className="h-8 px-2 text-xs flex items-center space-x-1 hover:text-red-500"
                  >
                    <Heart className="h-3 w-3" />
                    <span className="text-xs">{likeCount > 0 ? likeCount : ''}</span>
                  </Button>

                  <ZapDialog target={comment}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs flex items-center space-x-1 hover:text-yellow-500"
                    >
                      <Zap className="h-3 w-3" />
                      <span className="text-xs">{zapCount > 0 ? zapCount : ''}</span>
                    </Button>
                  </ZapDialog>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReplyForm(!showReplyForm)}
                    className="h-8 px-2 text-xs flex items-center space-x-1 hover:text-primary"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Reply
                  </Button>

                  {hasReplies && canExpand && (
                    <Collapsible open={showReplies} onOpenChange={setShowReplies}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs flex items-center space-x-1 hover:text-primary"
                        >
                          {showReplies ? (
                            <ChevronDown className="h-3 w-3 mr-1" />
                          ) : (
                            <ChevronRight className="h-3 w-3 mr-1" />
                          )}
                          <span className="text-xs">
                            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                          </span>
                        </Button>
                      </CollapsibleTrigger>
                    </Collapsible>
                  )}
                </div>

                {/* Comment menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      aria-label="Comment options"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reply Form */}
        {showReplyForm && (
          <div className="ml-6">
            <CommentForm
              root={root}
              reply={comment}
              onSuccess={() => setShowReplyForm(false)}
              placeholder="Write a reply..."
              compact
            />
          </div>
        )}

        {/* Nested Replies */}
        {hasReplies && canExpand && (
          <Collapsible open={showReplies} onOpenChange={setShowReplies}>
            <CollapsibleContent className="space-y-3">
              {replies.map((reply, index) => (
                <Comment
                  key={reply.id}
                  root={root}
                  comment={reply}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  limit={limit}
                  isLastInBranch={index === replies.length - 1}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Deep thread indicator */}
        {hasReplies && !canExpand && (
          <div className="ml-6">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-primary"
              onClick={() => {
                // In a real implementation, this would navigate to a dedicated thread view
                console.log('Navigate to deep thread view for comment:', comment.id);
              }}
            >
              View {replies.length} more {replies.length === 1 ? 'reply' : 'replies'} in this thread →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
