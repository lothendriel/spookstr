import { useSeoMeta } from '@unhead/react';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ParanormalPost } from '@/components/ParanormalPost';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { Ghost, ArrowLeft, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { PostDetailView } from '@/components/PostDetailView';
import type { NostrEvent } from '@nostrify/nostrify';

interface HashtagProps {
  tag: string;
}

export default function Hashtag({ tag }: HashtagProps) {
  const navigate = useNavigate();
  const { nostr } = useNostr();
  const [selectedPost, setSelectedPost] = useState<NostrEvent | null>(null);

  useSeoMeta({
    title: `#${tag} - Spookstr`,
    description: `View posts tagged with #${tag} on Spookstr`,
  });

  // Fetch posts with this hashtag
  const { data: posts, isLoading: isLoadingPosts } = useQuery({
    queryKey: ['hashtag-posts', tag],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query(
        [{ kinds: [1], '#t': [tag], limit: 50 }],
        { signal }
      );
      return events.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!tag,
  });

  if (selectedPost) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <PostDetailView
            event={selectedPost}
            onBack={() => setSelectedPost(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SpookstrHeader />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="mb-6 text-lime-400 hover:text-lime-300 hover:bg-lime-500/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Hashtag Header */}
        <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-lime-500/20 flex items-center justify-center">
                <Hash className="h-6 w-6 text-lime-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-lime-400">#{tag}</h1>
                <p className="text-lime-500/70">
                  {posts ? `${posts.length} posts` : 'Loading posts...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts Section */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-lime-400 mb-4">Posts</h2>

          {isLoadingPosts && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="border-lime-500/20 bg-black/40">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoadingPosts && (!posts || posts.length === 0) && (
            <Card className="border-dashed border-lime-500/20 bg-black/20">
              <CardContent className="p-12 text-center">
                <Ghost className="h-16 w-16 text-lime-500/40 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-lime-400 mb-2">
                  No Posts Found
                </h3>
                <p className="text-lime-500/60">
                  No posts found with the hashtag #{tag}
                </p>
              </CardContent>
            </Card>
          )}

          {!isLoadingPosts && posts && posts.length > 0 && (
            <div className="space-y-4">
              {posts.map((post) => (
                <ParanormalPost
                  key={post.id}
                  event={post}
                  onClick={() => setSelectedPost(post)}
                  showActions={true}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}