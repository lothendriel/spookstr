import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePostComment } from '@/hooks/usePostComment';
import { LoginArea } from '@/components/auth/LoginArea';
import { NostrEvent } from '@nostrify/nostrify';
import { MessageSquare, Send, Reply } from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';
import { nip19 } from 'nostr-tools';
import { genUserName } from '@/lib/genUserName';

interface CommentFormProps {
  root: NostrEvent | URL;
  reply?: NostrEvent;
  onSuccess?: () => void;
  placeholder?: string;
  compact?: boolean;
}

export function CommentForm({
  root,
  reply,
  onSuccess,
  placeholder = "Write a comment...",
  compact = false
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useCurrentUser();
  const { mutate: postComment, isPending } = usePostComment();

  // Auto-add mention when replying
  useEffect(() => {
    if (reply) {
      const npub = nip19.npubEncode(reply.pubkey);
      const mention = `nostr:${npub}`;
      setContent(`${mention} `);
    } else {
      setContent('');
    }
  }, [reply]);

  // Get reply author info for display
  const replyAuthor = reply ? useAuthor(reply.pubkey) : null;
  const replyMetadata = replyAuthor?.data?.metadata;
  const replyDisplayName = replyMetadata?.name ?? (reply ? genUserName(reply.pubkey) : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (!content.trim() || !user || isSubmitting || isPending) return;

    setIsSubmitting(true);

    postComment(
      { content: content.trim(), root, reply },
      {
        onSuccess: () => {
          // Clear content but keep the mention if replying
          setContent(reply ? `nostr:${nip19.npubEncode(reply.pubkey)} ` : '');
          setIsSubmitting(false);
          onSuccess?.();
        },
        onError: () => {
          // Re-enable form on error
          setIsSubmitting(false);
        },
      }
    );
  };

  if (!user) {
    return (
      <Card className={compact ? "border-dashed" : ""}>
        <CardContent className={compact ? "p-4" : "p-6"}>
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <MessageSquare className="h-5 w-5" />
              <span>Sign in to {reply ? 'reply' : 'comment'}</span>
            </div>
            <LoginArea />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Combined disabled state
  const formDisabled = isPending || isSubmitting;

  return (
    <Card className={compact ? "border-dashed" : ""}>
      <CardContent className={compact ? "p-4" : "p-6"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reply context */}
          {reply && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <Reply className="h-4 w-4" />
              <span>Replying to </span>
              <Link
                to={`/${nip19.npubEncode(reply.pubkey)}`}
                className="font-medium hover:text-primary transition-colors"
              >
                {replyDisplayName}
              </Link>
            </div>
          )}

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={reply ? "Type your reply after the mention..." : placeholder}
            className={compact ? "min-h-[80px]" : "min-h-[100px]"}
            disabled={formDisabled}
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {reply ? 'Replying to comment' : 'Adding to the discussion'}
            </span>
            <Button
              type="submit"
              disabled={!content.trim() || formDisabled}
              size={compact ? "sm" : "default"}
            >
              <Send className="h-4 w-4 mr-2" />
              {formDisabled ? 'Posting...' : (reply ? 'Reply' : 'Comment')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}