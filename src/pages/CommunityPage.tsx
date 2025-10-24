import { useParams } from 'react-router-dom';
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
import { useState } from 'react';
import { useCommunity, useCommunityPosts, CommunityDefinition, CommunityPost } from '@/hooks/useCommunity';

export default function CommunityPage() {
  const { communityId } = useParams<{ communityId: string }>();
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postContent, setPostContent] = useState('');

  // Fetch community definition
  const { data: community, isLoading: communityLoading } = useCommunity(communityId);

  // Fetch community posts
  const { data: posts, isLoading: postsLoading } = useCommunityPosts(
    community?.id,
    community?.author
  );

  const handleCreatePost = async () => {
    if (!user || !community || !postContent.trim()) return;

    try {
      await createEvent({
        kind: 1111,
        content: postContent,
        tags: [
          // Community references (uppercase for root scope)
          ['A', `34550:${community.author}:${community.id}`],
          ['P', community.author],
          ['K', '34550'],

          // Same community references (lowercase for parent scope)
          ['a', `34550:${community.author}:${community.id}`],
          ['p', community.author],
          ['k', '34550']
        ]
      });

      setPostContent('');
      setShowCreatePost(false);
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  if (communityLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-48 w-full mb-6" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Community not found</h1>
          <p className="text-muted-foreground">The community you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Community Header */}
        <Card className="mb-6 overflow-hidden">
          {community.image && (
            <div className="h-32 bg-gradient-to-r from-purple-900 to-indigo-900 relative">
              <img
                src={community.image}
                alt={community.name}
                className="w-full h-full object-cover opacity-50"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{community.name}</CardTitle>
                <p className="text-muted-foreground mb-4">{community.description}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Created by {community.author}</span>
                  <Badge variant="secondary">{community.moderators.length} moderators</Badge>
                </div>
              </div>
              <Button onClick={() => setShowCreatePost(!showCreatePost)}>
                {showCreatePost ? 'Cancel' : 'Create Post'}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Create Post Form */}
        {showCreatePost && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Share something with the community..."
                className="w-full min-h-[100px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreatePost(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePost}
                  disabled={!postContent.trim() || !user}
                >
                  Post
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Community Posts */}
        <div className="space-y-4">
          {postsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PostCard({ post }: { post: CommunityPost }) {
  const author = useAuthor(post.pubkey);
  const metadata = author.data?.metadata;

  const displayName = metadata?.name || genUserName(post.pubkey);
  const profileImage = metadata?.picture;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profileImage} alt={displayName} />
            <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{displayName}</div>
            <div className="text-sm text-muted-foreground">
              {new Date(post.created_at * 1000).toLocaleDateString()}
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
            className="text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}