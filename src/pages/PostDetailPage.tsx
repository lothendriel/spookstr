import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayName } from '@/lib/getDisplayName';
import { NoteContent } from '@/components/NoteContent';
import { useNostr } from '@/hooks/useNostr';
import { useCommunity } from '@/hooks/useCommunity';
import { ArrowLeft } from 'lucide-react';
import { CommentsSection } from '@/components/comments/CommentsSection';
import type { NostrEvent } from '@nostrify/nostrify';

export default function PostDetailPage() {
  const { communityId, postId } = useParams<{ communityId: string; postId: string }>();
  const navigate = useNavigate();
  const { nostr } = useNostr();

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

      return events[0];
    },
    enabled: !!postId
  });

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

        {/* Threaded Comments Section */}
        <CommentsSection
          root={post}
          title="Discussion"
          emptyStateMessage="No comments yet. Be the first to share your thoughts!"
          emptyStateSubtitle="Start the conversation..."
          className="mt-6 border-lime-500/20 bg-black/40 backdrop-blur-sm"
          limit={100}
        />
      </div>
    </div>
  );
}

interface PostCardProps {
  post: NostrEvent;
  isMainPost?: boolean;
}

function PostCard({ post, isMainPost = false }: PostCardProps) {
  const author = useAuthor(post.pubkey);
  const metadata = author.data?.metadata;

  const displayName = getDisplayName(metadata, post.pubkey);
  const profileImage = metadata?.picture;

  return (
    <Card className={isMainPost ? 'border-lime-500/30 bg-black/50 backdrop-blur-sm' : ''}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profileImage} alt={displayName} />
            <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-lime-400">{displayName}</div>
            <div className="text-sm text-lime-500/60">
              {new Date(post.created_at * 1000).toLocaleDateString()} at{' '}
              {new Date(post.created_at * 1000).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="whitespace-pre-wrap break-words text-lime-100">
          <NoteContent
            event={post}
            className="text-base"
          />
        </div>
      </CardContent>
    </Card>
  );
}