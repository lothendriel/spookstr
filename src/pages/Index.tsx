import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Skeleton } from '@/components/ui/skeleton';
import { useParanormalFeed } from '@/hooks/useParanormalFeed';
import { useBatchInteractions } from '@/hooks/useBatchInteractions';
import { useRealtimeInteractionUpdates } from '@/hooks/useRealtimeInteractionUpdates';
import { useFeedDiscovery } from '@/hooks/useContextualRelayDiscovery';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { SmartRelayDiscoveryIndicator } from '@/components/RelayDiscoveryIndicator';
import { ParanormalPost } from '@/components/ParanormalPost';
import { CreateParanormalPost } from '@/components/CreateParanormalPost';
import { CreatePostModal } from '@/components/CreatePostModal';
import { RedditParanormalFeed } from '@/components/RedditParanormalFeed';
import { DeveloperTip } from '@/components/DeveloperTip';
import { PostDetailView } from '@/components/PostDetailView';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import { InfiniteScrollLoader, InfiniteScrollSkeleton } from '@/components/ui/InfiniteScrollLoader';
import { NostrEvent } from '@nostrify/nostrify';
import { Button } from '@/components/ui/button';
import { RotateCcw, Ghost, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ParanormalPodcastsCarousel } from '@/components/ParanormalPodcastsCarousel';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  useSeoMeta({
    title: 'Spookstr - Paranormal Nostr Network',
    description: 'Discover and share paranormal experiences, UFO sightings, cryptid encounters, and supernatural stories on the Nostr network.',
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch
  } = useParanormalFeed();
  const [selectedPost, setSelectedPost] = useState<NostrEvent | null>(null);
  const isMobile = useIsMobile();

  // Get feed discovery stats
  const {
    events: discoveredEvents,
    isLoading: isDiscovering,
    stats: discoveryStats
  } = useFeedDiscovery();

  // Flatten all pages and remove duplicates
  const allPosts = useMemo(() => {
    if (!data?.pages) return [];
    const seen = new Set();
    return data.pages.flat().filter(post => {
      if (!post.id || seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });
  }, [data?.pages]);

  // Batch fetch interactions for all visible posts (limit to first 50 for performance)
  const visiblePostIds = useMemo(() => {
    return allPosts.slice(0, 50).map(post => {
      // For reposts, use the original event ID for interaction queries
      if (post.kind === 6 || post.kind === 16) {
        try {
          const repostedEvent = JSON.parse(post.content);
          if (repostedEvent?.id) {
            return repostedEvent.id;
          }
        } catch (e) {
          return post.id;
        }
      }
      return post.id;
    });
  }, [allPosts]);

  // Batch fetch interactions for visible posts
  useBatchInteractions(visiblePostIds);

  // Enable real-time updates for visible posts
  useRealtimeInteractionUpdates(visiblePostIds);

  // Set up infinite scroll
  const { loadMoreRef } = useInfiniteScroll({
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    threshold: 0.8,
    rootMargin: '200px'
  });

  // Memoize event handlers
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handlePostClick = useCallback((post: NostrEvent) => {
    setSelectedPost(post);
  }, []);

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
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-lime-400">
                    Paranormal Activity Feed
                  </h2>
                  <SmartRelayDiscoveryIndicator
                    context="feed"
                    eventsFound={posts?.length || 0}
                    hintsUsed={discoveryStats?.hintsUsed || false}
                    isLoading={isDiscovering || isLoading}
                  />
                </div>
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

            {isLoading && !data && (
              <InfiniteScrollSkeleton count={5} />
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

            {!isLoading && !error && allPosts.length === 0 && (
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

            {!isLoading && !error && allPosts.length > 0 && (
              <div className="space-y-4">
                {/* Render all posts */}
                {allPosts.map((post) => (
                  <ParanormalPost
                    key={post.id}
                    event={post}
                    onClick={() => handlePostClick(post)}
                  />
                ))}

                {/* Infinite scroll loader */}
                <InfiniteScrollLoader
                  ref={loadMoreRef}
                  isLoading={isFetchingNextPage}
                  hasMore={!!hasNextPage}
                  loader={<InfiniteScrollSkeleton count={2} />}
                />
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