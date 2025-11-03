import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayName } from '@/lib/getDisplayName';
import { NoteContent } from '@/components/NoteContent';
import { useNostr } from '@/hooks/useNostr';
import { useCommunity } from '@/hooks/useCommunity';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ArrowLeft, Home, Shield } from 'lucide-react';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { useBatchInteractions } from '@/hooks/useBatchInteractions';
import { useRealtimeInteractionUpdates } from '@/hooks/useRealtimeInteractionUpdates';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import type { NostrEvent } from '@nostrify/nostrify';

export default function CommunityPostDetailPage() {
  const { communityId, postId } = useParams<{ communityId: string; postId: string }>();
  const navigate = useNavigate();
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  // Fetch batch interactions for this post
  useBatchInteractions(postId ? [postId] : []);

  // Enable real-time updates for this post
  useRealtimeInteractionUpdates(postId ? [postId] : []);

  // Fetch community definition
  const { data: community, isLoading: communityLoading } = useCommunity(communityId);

  // Fetch the main community post
  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ['community-post', communityId, postId],
    queryFn: async () => {
      if (!postId || !communityId) throw new Error('Missing post ID or community ID');

      const signal = AbortSignal.timeout(5000);

      // Query for the specific community post by ID (kind 1111 for community posts)
      const events = await nostr.query([{
        ids: [postId],
        kinds: [1111], // Community posts are kind 1111
        limit: 1
      }], { signal });

      if (events.length === 0) {
        throw new Error('Community post not found');
      }

      const event = events[0];

      // Verify this is actually a community post for the correct community
      const communityTag = event.tags.find(tag => 
        tag[0] === 'A' && tag[1]?.startsWith('34550:')
      );

      if (!communityTag || !communityTag[1]?.includes(`:${communityId}`)) {
        throw new Error('Post does not belong to this community');
      }

      return event;
    },
    enabled: !!postId && !!communityId
  });

  // Check if user is a moderator
  const isModerator = user && community && (
    user.pubkey === community.author || 
    community.moderators.includes(user.pubkey)
  );

  if (communityLoading || postLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950/20 via-black to-green-950/20">
        <SpookstrHeader />
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
      </div>
    );
  }

  if (!community || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950/20 via-black to-green-950/20">
        <SpookstrHeader />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto text-center">
            <Card className="border-purple-500/20 bg-black/40 backdrop-blur-sm">
              <CardContent className="py-12">
                <h1 className="text-2xl font-bold mb-4 text-purple-400">
                  {!community ? 'Community not found' : 'Post not found'}
                </h1>
                <p className="text-purple-300 mb-6">
                  {!community 
                    ? "The community you're looking for doesn't exist."
                    : "The post you're looking for doesn't exist or doesn't belong to this community."
                  }
                </p>
                <div className="space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/communities')}
                    className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Browse Communities
                  </Button>
                  {community && (
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/community/${communityId}`)}
                      className="border-lime-500/50 text-lime-300 hover:bg-lime-500/20"
                    >
                      Back to {community.name}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950/20 via-black to-green-950/20">
      <SpookstrHeader />
      
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          
          {/* Community Navigation Bar */}
          <Card className="mb-6 border-purple-500/30 bg-black/60 backdrop-blur-sm">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    onClick={() => navigate(`/community/${communityId}`)}
                    className="text-purple-300 hover:text-purple-100 hover:bg-purple-500/20"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Community
                  </Button>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="secondary" 
                      className="bg-purple-500/20 text-purple-300 border-purple-500/30"
                    >
                      {community.name}
                    </Badge>
                    {isModerator && (
                      <Badge 
                        variant="outline" 
                        className="border-lime-500/50 text-lime-300 bg-lime-500/10"
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        Moderator
                      </Badge>
                    )}
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => navigate('/communities')}
                  className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
                >
                  <Home className="h-4 w-4 mr-2" />
                  All Communities
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Community Post */}
          <CommunityPostCard post={post} community={community} isMainPost={true} />

          {/* Threaded Comments Section */}
          <CommentsSection
            root={post}
            title="Discussion"
            emptyStateMessage="No comments yet on this community post."
            emptyStateSubtitle="Be the first to contribute to the discussion!"
            className="mt-6 border-lime-500/20 bg-black/40 backdrop-blur-sm"
            limit={150}
          />
          
        </div>
      </div>
    </div>
  );
}

interface CommunityPostCardProps {
  post: NostrEvent;
  community: {
    id: string;
    name: string;
    description?: string;
    image?: string;
    author: string;
    moderators: string[];
  };
  isMainPost?: boolean;
}

function CommunityPostCard({ post, community, isMainPost = false }: CommunityPostCardProps) {
  const author = useAuthor(post.pubkey);
  const metadata = author.data?.metadata;

  const displayName = getDisplayName(metadata, post.pubkey);
  const profileImage = metadata?.picture;

  return (
    <Card className={`${isMainPost ? 'border-lime-500/30 bg-black/50 backdrop-blur-sm' : ''} overflow-hidden`}>
      
      {/* Community Context Header - Only for main post */}
      {isMainPost && (
        <div className="bg-gradient-to-r from-purple-900/40 to-lime-900/40 px-6 py-3 border-b border-lime-500/20">
          <div className="flex items-center space-x-3">
            {community.image && (
              <img 
                src={community.image} 
                alt={community.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            )}
            <div>
              <p className="text-sm text-lime-300 font-medium">Posted in</p>
              <p className="text-lg text-lime-100 font-bold">{community.name}</p>
            </div>
          </div>
        </div>
      )}
      
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border border-lime-500/30">
            <AvatarImage src={profileImage} alt={displayName} />
            <AvatarFallback className="bg-lime-500/20 text-lime-300">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-lime-400 text-lg">{displayName}</div>
            <div className="text-sm text-lime-500/70">
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
            className={`${isMainPost ? 'text-lg leading-relaxed' : 'text-base'}`}
          />
        </div>
        
        {/* Post metadata footer */}
        {isMainPost && (
          <div className="mt-6 pt-4 border-t border-lime-500/20 text-xs text-lime-500/60">
            <p>Community Post • Kind {post.kind} • ID: {post.id.substring(0, 8)}...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}