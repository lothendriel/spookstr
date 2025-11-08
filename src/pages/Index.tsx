import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Skeleton } from '@/components/ui/skeleton';
import { useParanormalFeed } from '@/hooks/useParanormalFeed';
import { useParanormalFeedInfinite } from '@/hooks/useParanormalFeedInfinite';
import { useBatchInteractions } from '@/hooks/useBatchInteractions';
import { useRealtimeInteractionUpdates } from '@/hooks/useRealtimeInteractionUpdates';
import { useFeedDiscovery } from '@/hooks/useContextualRelayDiscovery';
import { SmartRelayDiscoveryIndicator } from '@/components/RelayDiscoveryIndicator';
import { ParanormalPost } from '@/components/ParanormalPost';
import { CreateParanormalPost } from '@/components/CreateParanormalPost';
import { CreatePostModal } from '@/components/CreatePostModal';
import { RedditParanormalFeed } from '@/components/RedditParanormalFeed';
import { DeveloperTip } from '@/components/DeveloperTip';
import { PostDetailView } from '@/components/PostDetailView';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import { FeedContent } from '@/components/FeedContent';
import { InfiniteFeedContent } from '@/components/InfiniteFeedContent';
import { NostrEvent } from '@nostrify/nostrify';
import { Button } from '@/components/ui/button';
import { RotateCcw, Ghost, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ParanormalPodcastsCarousel } from '@/components/ParanormalPodcastsCarousel';
import { useNavigate } from 'react-router-dom';

// Conditional hook component to avoid calling both hooks simultaneously
function useConditionalFeed(useInfiniteScroll: boolean) {
  const traditionalFeed = useParanormalFeed();
  const infiniteFeed = useParanormalFeedInfinite();

  return useInfiniteScroll ? infiniteFeed : traditionalFeed;
}

const Index = () => {
  useSeoMeta({
    title: 'Spookstr - Paranormal Nostr Network',
    description: 'Discover and share paranormal experiences, UFO sightings, cryptid encounters, and supernatural stories on the Nostr network.',
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<NostrEvent | null>(null);
  const [postsToShow, setPostsToShow] = useState(12); // Show 12 posts initially on all devices
  const [useInfiniteScroll, setUseInfiniteScroll] = useState(false); // Toggle between pagination modes
  const isMobile = useIsMobile();

  // Conditional hook calls - only one hook executes at a time
  const feedData = useConditionalFeed(useInfiniteScroll);

  // Extract data based on current mode
  const posts = useInfiniteScroll ? undefined : feedData.data as NostrEvent[];
  const infiniteData = useInfiniteScroll ? feedData.data : undefined;
  const isLoading = useInfiniteScroll ? false : feedData.isLoading;
  const isInfiniteInitialLoading = useInfiniteScroll ? feedData.isLoading : false;
  const isInfiniteLoading = useInfiniteScroll ? feedData.isFetchingNextPage : false;
  const error = useInfiniteScroll ? undefined : feedData.error;
  const infiniteError = useInfiniteScroll ? feedData.error : undefined;
  const refetch = useInfiniteScroll ? undefined : feedData.refetch;
  const refetchInfinite = useInfiniteScroll ? feedData.refetch : undefined;
  const fetchNextPage = useInfiniteScroll ? feedData.fetchNextPage : undefined;
  const hasNextPage = useInfiniteScroll ? feedData.hasNextPage : undefined;

  // Get feed discovery stats
  const {
    events: discoveredEvents,
    isLoading: isDiscovering,
    stats: discoveryStats
  } = useFeedDiscovery();

  // Memoize visible post IDs to prevent unnecessary re-renders
  const visiblePostIds = useMemo(() => {
    let currentPosts: NostrEvent[] = [];

    if (useInfiniteScroll && infiniteData?.pages) {
      // For infinite scroll, get all posts from all pages
      const seen = new Set<string>();
      currentPosts = infiniteData.pages.flat().filter(event => {
        if (!event.id || seen.has(event.id)) return false;
        seen.add(event.id);
        return true;
      });
    } else if (posts) {
      // For traditional pagination, use postsToShow
      currentPosts = posts.slice(0, postsToShow);
    }

    if (currentPosts.length === 0) {
      console.log('[Index] No posts available, returning empty visiblePostIds');
      return [];
    }

    const ids = currentPosts.map(post => {
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
  }, [posts, postsToShow, infiniteData?.pages, useInfiniteScroll, feedData]);

  // Batch fetch interactions for all visible posts
  console.log('[Index] ABOUT TO CALL BATCH HOOK with', visiblePostIds.length, 'post IDs');
  useBatchInteractions(visiblePostIds);

  // Enable real-time updates for visible posts (single shared subscription)
  useRealtimeInteractionUpdates(visiblePostIds);

  // Reset pagination when new posts are loaded
  useEffect(() => {
    if (posts && !useInfiniteScroll) {
      setPostsToShow(12);
    }
  }, [posts, useInfiniteScroll]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleRefresh = useCallback(() => {
    if (useInfiniteScroll && refetchInfinite) {
      refetchInfinite();
    } else if (refetch) {
      setPostsToShow(12);
      refetch();
    }
  }, [refetch, refetchInfinite, useInfiniteScroll]);

  const handleLoadMore = useCallback(() => {
    if (!useInfiniteScroll) {
      setPostsToShow(prev => prev + 12);
    }
  }, [useInfiniteScroll]);

  const handlePostClick = useCallback((post: NostrEvent) => {
    setSelectedPost(post);
  }, []);

  const togglePaginationMode = useCallback(() => {
    setUseInfiniteScroll(prev => !prev);
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
                    eventsFound={useInfiniteScroll ? (infiniteData?.pages?.[0]?.length || 0) : (posts?.length || 0)}
                    hintsUsed={discoveryStats?.hintsUsed || false}
                    isLoading={isDiscovering || (useInfiniteScroll ? isInfiniteInitialLoading : isLoading)}
                  />
                </div>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
                  disabled={useInfiniteScroll ? isInfiniteInitialLoading : isLoading}
                >
                  <RotateCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <p className="text-lime-500/60">
                Real-time experiences from the unknown
              </p>
            </div>

            {/* Loading states */}
            {(useInfiniteScroll ? isInfiniteInitialLoading : isLoading) && (
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

            {/* Error states */}
            {(useInfiniteScroll ? infiniteError : error) && (
              <div className="border border-lime-500/20 rounded-lg p-6 bg-black/40 text-center">
                <Ghost className="h-12 w-12 text-lime-500/60 mx-auto mb-4" />
                <p className="text-lime-400 mb-2">The spirits are restless...</p>
                <p className="text-lime-500/60 text-sm">
                  Unable to fetch paranormal content. Try refreshing or switching relays.
                </p>
              </div>
            )}

            {/* Empty states */}
            {!(useInfiniteScroll ? isInfiniteInitialLoading : isLoading) &&
             !(useInfiniteScroll ? infiniteError : error) && (
              <>
                {((!useInfiniteScroll && posts && posts.length === 0) ||
                  (useInfiniteScroll && infiniteData?.pages?.[0]?.length === 0)) && (
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

                {/* Feed content */}
                {((!useInfiniteScroll && posts && posts.length > 0) ||
                  (useInfiniteScroll && infiniteData?.pages?.[0]?.length > 0)) && (
                  <div className="space-y-4">
                    {/* Pagination mode toggle */}
                    <div className="flex justify-center mb-4">
                      <Button
                        onClick={togglePaginationMode}
                        variant="outline"
                        size="sm"
                        className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
                      >
                        {useInfiniteScroll ? 'Switch to Manual Loading' : 'Switch to Infinite Scroll'}
                      </Button>
                    </div>

                    {/* Traditional pagination */}
                    {!useInfiniteScroll && posts && posts.length > 0 && (
                      <>
                        <FeedContent
                          posts={posts}
                          postsToShow={postsToShow}
                          onPostClick={handlePostClick}
                        />

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
                      </>
                    )}

                    {/* Infinite scroll */}
                    {useInfiniteScroll && infiniteData && (
                      <InfiniteFeedContent
                        data={infiniteData}
                        hasNextPage={hasNextPage}
                        isFetchingNextPage={isInfiniteLoading}
                        fetchNextPage={fetchNextPage}
                        onPostClick={handlePostClick}
                      />
                    )}
                  </div>
                )}
              </>
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