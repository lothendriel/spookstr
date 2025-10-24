import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { NoteContent } from '@/components/NoteContent';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useNostr } from '@/hooks/useNostr';
import { useState } from 'react';
import { useCommunity, useCommunityComments, CommunityPost } from '@/hooks/useCommunity';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function PostDetailPage() {
  const { communityId, postId } = useParams<{ communityId: string; postId: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const { nostr } = useNostr();
  const [commentContent, setCommentContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyTo, setReplyTo] = useState<CommunityPost | null>(null);

  // Fetch community definition
  const { data: community, isLoading: communityLoading } = useCommunity(communityId);

  // Fetch the main post
  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      if (!postId) throw new Error('No post ID provided');

      const signal = AbortSignal.timeout(5000);

      // Query for the specific post by ID (kind 1)
      const events = await nostr.query([{
        ids: [postId],
        kinds: [1],
        limit: 1
      }], { signal });

      if (events.length === 0) {
        throw new Error('Post not found');
      }

      const event = events[0];
      return {
        id: event.id,
        pubkey: event.pubkey,
        content: event.content,
        created_at: event.created_at,
        tags: event.tags
      } as CommunityPost;
    },
    enabled: !!postId
  });

  // Fetch comments for this post
  const { data: comments, isLoading: commentsLoading } = useCommunityComments(postId);

  const handleComment = async (content: string, parentPost?: CommunityPost) => {
    if (!user || !community || !content.trim() || !post) return;

    try {
      const tags = [
        // Community categorization
        ['t', 'community'],
        ['t', 'spookstr'],
        ['t', community.id],
        ['t', 'paranormal'],

        // NIP-10 threading: root post reference
        ['e', post.id, '', 'root', post.pubkey],
        ['p', post.pubkey],

        // NIP-10 threading: parent post reference (if replying to a comment)
        ...(parentPost ? [
          ['e', parentPost.id, '', 'reply', parentPost.pubkey],
          ['p', parentPost.pubkey]
        ] : [])
      ];

      await createEvent({
        event: {
          kind: 1, // Use kind 1 for replies to kind 1 posts (NIP-10)
          content: content.trim(),
          tags
        }
      });

      setCommentContent('');
      setReplyTo(null);
      setIsReplying(false);
    } catch (error) {
      console.error('Failed to create comment:', error);
    }
  };

  if (communityLoading || postLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-32 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!community || !post) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          <p className="text-muted-foreground">The post you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(`/community/${communityId}`)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {community.name}
        </Button>

        {/* Main Post */}
        <PostCard post={post} isMainPost={true} />

        {/* Comment Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5" />
              <span>Comments</span>
              <Badge variant="secondary">{comments?.length || 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Comment Input */}
            {user && (
              <div className="space-y-3">
                <Textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder={replyTo ? `Replying to @${replyTo.pubkey.slice(0, 8)}...` : 'Add a comment...'}
                  className="min-h-[80px]"
                />
                <div className="flex justify-end space-x-2">
                  {replyTo && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setReplyTo(null);
                        setCommentContent('');
                      }}
                    >
                      Cancel Reply
                    </Button>
                  )}
                  <Button
                    onClick={() => handleComment(commentContent, replyTo)}
                    disabled={!commentContent.trim()}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {replyTo ? 'Reply' : 'Comment'}
                  </Button>
                </div>
              </div>
            )}

            {/* Comments List */}
            {commentsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : comments && comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    onReply={(comment) => {
                      setReplyTo(comment);
                      setIsReplying(true);
                      setCommentContent(`@${comment.pubkey.slice(0, 8)} `);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No comments yet. Be the first to share your thoughts!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface PostCardProps {
  post: CommunityPost;
  isMainPost?: boolean;
}

function PostCard({ post, isMainPost = false }: PostCardProps) {
  const author = useAuthor(post.pubkey);
  const metadata = author.data?.metadata;

  const displayName = metadata?.name || genUserName(post.pubkey);
  const profileImage = metadata?.picture;

  return (
    <Card className={isMainPost ? 'border-lime-500/30' : ''}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profileImage} alt={displayName} />
            <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{displayName}</div>
            <div className="text-sm text-muted-foreground">
              {new Date(post.created_at * 1000).toLocaleDateString()} at{' '}
              {new Date(post.created_at * 1000).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="whitespace-pre-wrap break-words">
          <NoteContent
            event={{
              id: post.id,
              pubkey: post.pubkey,
              content: post.content,
              created_at: post.created_at,
              tags: post.tags,
              kind: 1111,
              sig: ''
            }}
            className="text-base"
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface CommentCardProps {
  comment: CommunityPost;
  onReply: (comment: CommunityPost) => void;
}

function CommentCard({ comment, onReply }: CommentCardProps) {
  const author = useAuthor(comment.pubkey);
  const metadata = author.data?.metadata;

  const displayName = metadata?.name || genUserName(comment.pubkey);
  const profileImage = metadata?.picture;

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={profileImage} alt={displayName} />
        <AvatarFallback className="text-xs">
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{displayName}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(comment.created_at * 1000).toLocaleString()}
          </span>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 mb-2">
          <div className="whitespace-pre-wrap break-words text-sm">
            <NoteContent
              event={{
                id: comment.id,
                pubkey: comment.pubkey,
                content: comment.content,
                created_at: comment.created_at,
                tags: comment.tags,
                kind: 1111,
                sig: ''
              }}
              className="text-sm"
            />
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onReply(comment)}
          className="text-xs h-6 px-2"
        >
          Reply
        </Button>
      </div>
    </div>
  );
}