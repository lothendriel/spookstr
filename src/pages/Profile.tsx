import { useSeoMeta } from '@unhead/react';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ParanormalPost } from '@/components/ParanormalPost';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { Ghost, ArrowLeft, ExternalLink, Zap as ZapIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { PostDetailView } from '@/components/PostDetailView';
import type { NostrEvent } from '@nostrify/nostrify';

interface ProfileProps {
  pubkey: string;
}

export default function Profile({ pubkey }: ProfileProps) {
  const navigate = useNavigate();
  const author = useAuthor(pubkey);
  const { nostr } = useNostr();
  const [selectedPost, setSelectedPost] = useState<NostrEvent | null>(null);

  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(pubkey);

  useSeoMeta({
    title: `${displayName} - Spookstr`,
    description: metadata?.about || `View ${displayName}'s profile on Spookstr`,
  });

  // Fetch user's posts
  const { data: posts, isLoading: isLoadingPosts } = useQuery({
    queryKey: ['user-posts', pubkey],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query(
        [{ kinds: [1], authors: [pubkey], limit: 50 }],
        { signal }
      );
      return events.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!pubkey,
  });

  if (selectedPost) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-green-950/20 to-black p-4">
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
    <div className="min-h-screen bg-gradient-to-br from-black via-green-950/20 to-black">
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

        {/* Profile Header */}
        {author.isLoading ? (
          <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm mb-6">
            <CardContent className="p-6">
              {/* Banner */}
              {metadata?.banner && (
                <div className="relative -mx-6 -mt-6 mb-6 h-48 overflow-hidden rounded-t-lg">
                  <img
                    src={metadata.banner}
                    alt="Profile banner"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
                </div>
              )}

              <div className="flex items-start gap-6">
                {/* Avatar */}
                <Avatar className="h-24 w-24 border-4 border-lime-500/30">
                  <AvatarImage src={metadata?.picture} alt={displayName} />
                  <AvatarFallback className="bg-lime-500/20 text-lime-400 text-2xl">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Profile Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-lime-400 truncate">
                      {displayName}
                    </h1>
                    {metadata?.nip05 && (
                      <span className="text-lime-500">✓</span>
                    )}
                  </div>

                  {metadata?.nip05 && (
                    <p className="text-sm text-lime-500/70 mb-2">{metadata.nip05}</p>
                  )}

                  {metadata?.about && (
                    <p className="text-lime-100 mb-4 whitespace-pre-wrap">{metadata.about}</p>
                  )}

                  {/* Links */}
                  <div className="flex flex-wrap gap-3">
                    {metadata?.website && (
                      <a
                        href={metadata.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-lime-400 hover:text-lime-300 flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Website
                      </a>
                    )}
                    {(metadata?.lud16 || metadata?.lud06) && (
                      <span className="text-sm text-lime-500/70 flex items-center gap-1">
                        <ZapIcon className="h-3 w-3" />
                        {metadata?.lud16 || metadata?.lud06}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Posts Section */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-lime-400 mb-4">Paranormal Posts</h2>

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
                  No Posts Yet
                </h3>
                <p className="text-lime-500/60">
                  This user hasn't shared any paranormal experiences yet
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
