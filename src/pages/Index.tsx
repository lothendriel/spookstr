import { useState, useEffect, useMemo } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Skeleton } from '@/components/ui/skeleton';
import { useParanormalFeed } from '@/hooks/useParanormalFeed';
import { useBatchInteractions } from '@/hooks/useBatchInteractions';
import { useRealtimeInteractionUpdates } from '@/hooks/useRealtimeInteractionUpdates';
import { ParanormalPost } from '@/components/ParanormalPost';
import { CreateParanormalPost } from '@/components/CreateParanormalPost';
import { CreatePostModal } from '@/components/CreatePostModal';
import { RedditParanormalFeed } from '@/components/RedditParanormalFeed';
import { DeveloperTip } from '@/components/DeveloperTip';
import { PostDetailView } from '@/components/PostDetailView';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import { NostrEvent } from '@nostrify/nostrify';
import { Button } from '@/components/ui/button';
import { RotateCcw, Ghost, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ParanormalPodcastsCarousel } from '@/components/ParanormalPodcastsCarousel';

const Index = () => {
  useSeoMeta({
    title: 'Spookstr - Paranormal Nostr Network',
    description: 'Discover and share paranormal experiences, UFO sightings, cryptid encounters, and supernatural stories on the Nostr network.',
  });

  const queryClient = useQueryClient();
  const { data: posts, isLoading, error, refetch } = useParanormalFeed();
  const [selectedPost, setSelectedPost] = useState<NostrEvent | null>(null);
  const [postsToShow, setPostsToShow] = useState(12); // Show 12 posts initially on all devices
  const isMobile = useIsMobile();

  // Memoize visible post IDs to prevent unnecessary re-renders
  const visiblePostIds = useMemo(() => {
    if (!posts) {
      console.log('[Index] No posts available, returning empty visiblePostIds');
      return [];
    }
    const ids = posts.slice(0, postsToShow).map(post => {
      // For reposts, use the original event ID for interaction queries
      if (post.kind === 6 || post.kind === 16) {
        try {
          const repostedEvent = JSON.parse(post.content);
          if (repostedEvent?.id) {
            console.log('[Index] Repost detected, using original event ID:', repostedEvent.id.slice(0, 8), 'for repost event ID:', post.id.slice(0, 8));
            return repostedEvent.id;
          }
        } catch (e) {
          console.warn('[Index] Failed to parse repost content, using repost event ID:', post.id.slice(0, 8), e);
          return post.id;
        }
      }
      return post.id;
    });

    console.log('[Index] Visible post IDs:', ids.map(id => id.slice(0, 8)), '(total:', ids.length, ')');
    console.log('[Index] BATCH DEBUG: Should be calling useBatchInteractions with:', ids.length, 'IDs');
    return ids;
  }, [posts, postsToShow]);

  // Batch fetch interactions for all visible posts
  console.log('[Index] ABOUT TO CALL BATCH HOOK with', visiblePostIds.length, 'post IDs');
  useBatchInteractions(visiblePostIds);

  // Enable real-time updates for visible posts (single shared subscription)
  useRealtimeInteractionUpdates(visiblePostIds);

  // Reset pagination when new posts are loaded
  useEffect(() => {
    if (posts) {
      setPostsToShow(12);
    }
  }, [posts]);

  const handleRefresh = () => {
    // Refetch paranormal feed and reset pagination
    setPostsToShow(12);
    refetch();
  };

  const handleLoadMore = () => {
    // Load 12 more posts
    setPostsToShow(prev => prev + 12);
  };

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

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="hidden lg:block">
              <RedditParanormalFeed />
            </div>
            <div className="hidden lg:block">
              <DeveloperTip />
            </div>
          </div>

          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="text-center mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-lime-400">
                  Paranormal Activity Feed
                </h2>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
                  disabled={isLoading}
                >
                  <RotateCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <p className="text-lime-500/60">
                Real-time experiences from the unknown
              </p>
            </div>

            {isLoading && (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="border border-lime-500/20 rounded-lg p-4 bg-black/40">
                    <div className="flex items-center space-x-3 mb-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="border border-lime-500/20 rounded-lg p-6 bg-black/40 text-center">
                <Ghost className="h-12 w-12 text-lime-500/60 mx-auto mb-4" />
                <p className="text-lime-400 mb-2">The spirits are restless...</p>
                <p className="text-lime-500/60 text-sm">
                  Unable to fetch paranormal content. Try refreshing or switching relays.
                </p>
              </div>
            )}

            {!isLoading && !error && posts && posts.length === 0 && (
              <div className="border border-dashed border-lime-500/20 rounded-lg p-12 bg-black/20 text-center">
                <Ghost className="h-16 w-16 text-lime-500/40 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-lime-400 mb-2">
                  No Paranormal Activity Yet
                </h3>
                <p className="text-lime-500/60 mb-4">
                  Be the first to share your encounter with the unknown!
                </p>
              </div>
            )}

            {!isLoading && !error && posts && posts.length > 0 && (
              <div className="space-y-4">
                {/* Show limited number of posts with "Load More" functionality */}
                {posts.slice(0, postsToShow).map((post) => (
                  <ParanormalPost
                    key={post.id}
                    event={post}
                    onClick={() => setSelectedPost(post)}
                    showActions={true}
                  />
                ))}

                {/* Load More Button - Shown on all devices when more posts available */}
                {postsToShow < posts.length && (
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={handleLoadMore}
                      variant="outline"
                      className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10 w-full max-w-xs"
                    >
                      Load More Posts ({posts.length - postsToShow} remaining)
                    </Button>
                  </div>
                )}

                {/* Show total posts count when all are loaded */}
                {postsToShow >= posts.length && (
                  <div className="text-center pt-4">
                    <p className="text-sm text-lime-500/60">
                      Showing all {posts.length} posts
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* DeveloperTip - Now shown on mobile too */}
            <div className="lg:hidden">
              <DeveloperTip />
            </div>

            {/* Paranormal Podcasts Carousel - Hidden on mobile */}
            <div className="hidden lg:block">
              <ParanormalPodcastsCarousel />
            </div>

            <div className="border border-lime-500/20 rounded-lg p-6 bg-black/40 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-lime-400 mb-4">
                Paranormal Categories
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-lime-100">👽 UFOs & Aliens</span>
                  <span className="text-lime-500/60">#ufo #aliens</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lime-100">🦸 Cryptids</span>
                  <span className="text-lime-500/60">#bigfoot #cryptids</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lime-100">👻 Ghosts & Spirits</span>
                  <span className="text-lime-500/60">#ghosts #haunted</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lime-100">🔮 Supernatural</span>
                  <span className="text-lime-500/60">#supernatural #occult</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lime-100">🕵️ Unexplained</span>
                  <span className="text-lime-500/60">#unexplained #mysterious</span>
                </div>
              </div>
            </div>

            <div className="border border-lime-500/20 rounded-lg p-4 bg-black/40 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-xs text-lime-500/60 mb-2">
                  Vibed with
                </p>
                <a
                  href="https://soapbox.pub/mkstack"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-lime-400 hover:text-lime-300 transition-colors"
                >
                  MKStack
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;