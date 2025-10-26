import { useState, useEffect, useRef } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Skeleton } from '@/components/ui/skeleton';
import { useParanormalFeed } from '@/hooks/useParanormalFeed';
import { ParanormalPost } from '@/components/ParanormalPost';
import { CreateParanormalPost } from '@/components/CreateParanormalPost';
import { CreatePostModal } from '@/components/CreatePostModal';
import { RedditParanormalFeed } from '@/components/RedditParanormalFeed';
import { DeveloperTip } from '@/components/DeveloperTip';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import { NostrEvent } from '@nostrify/nostrify';
import { Button } from '@/components/ui/button';
import { RotateCcw, Ghost, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ParanormalPodcastsCarousel } from '@/components/ParanormalPodcastsCarousel';
import { useLocation } from 'react-router-dom';

const Index = () => {
  useSeoMeta({
    title: 'Spookstr - Paranormal Nostr Network',
    description: 'Discover and share paranormal experiences, UFO sightings, cryptid encounters, and supernatural stories on the Nostr network.',
  });

  const queryClient = useQueryClient();
  const { data: posts, isLoading, error, refetch } = useParanormalFeed();
  const [postsToShow, setPostsToShow] = useState(12); // Show 12 posts initially on all devices
  const isMobile = useIsMobile();
  const location = useLocation();
  const postsContainerRef = useRef<HTMLDivElement>(null);
  const [isRestoringScroll, setIsRestoringScroll] = useState(false);

  // State to track pending scroll restoration
  const [pendingScrollRestore, setPendingScrollRestore] = useState<{
    scrollPosition: number;
    postId: string;
  } | null>(null);

  // Handle scroll restoration when navigating back from post detail
  useEffect(() => {
    const navigationState = location.state as {
      restoreScroll?: boolean;
      scrollPosition?: number;
      postId?: string;
    } | null;

    if (navigationState?.restoreScroll && navigationState.scrollPosition !== undefined && navigationState.postId && posts) {
      setIsRestoringScroll(true);

      // Check if the target post is beyond the currently loaded posts
      const targetPostIndex = posts.findIndex(post => post.id === navigationState.postId);
      const needsMorePosts = targetPostIndex >= postsToShow && targetPostIndex !== -1;

      if (needsMorePosts) {
        // Load all posts up to and including the target post
        const requiredPostsToShow = Math.min(targetPostIndex + 1, posts.length);
        setPostsToShow(requiredPostsToShow);

        // Set pending restoration - this will be triggered after DOM updates
        setPendingScrollRestore({
          scrollPosition: navigationState.scrollPosition,
          postId: navigationState.postId
        });
      } else {
        // Posts are already loaded, restore immediately
        restoreScrollAndCenterPost(navigationState.scrollPosition, navigationState.postId);
      }
    }
  }, [location.state, posts, postsToShow]);

  // Effect to handle pending scroll restoration after DOM has updated
  useEffect(() => {
    if (pendingScrollRestore && postsContainerRef.current) {
      // Check if the target post is actually in the DOM
      const postElement = document.querySelector(`[data-post-id="${pendingScrollRestore.postId}"]`);

      if (postElement) {
        // Post is found in DOM, perform the scroll restoration
        restoreScrollAndCenterPost(pendingScrollRestore.scrollPosition, pendingScrollRestore.postId);
      } else {
        // Post not found yet, wait a bit and check again
        const checkInterval = setInterval(() => {
          const element = document.querySelector(`[data-post-id="${pendingScrollRestore.postId}"]`);
          if (element) {
            clearInterval(checkInterval);
            restoreScrollAndCenterPost(pendingScrollRestore.scrollPosition, pendingScrollRestore.postId);
          }
        }, 50);

        // Safety timeout - don't wait forever
        setTimeout(() => {
          clearInterval(checkInterval);
          // If still not found, try anyway
          restoreScrollAndCenterPost(pendingScrollRestore.scrollPosition, pendingScrollRestore.postId);
        }, 1000);
      }
    }
  }, [pendingScrollRestore]);

  // Centralized scroll restoration function
  const restoreScrollAndCenterPost = (scrollPosition: number, postId: string) => {
    // First restore the scroll position
    window.scrollTo(0, scrollPosition);

    // Then try to scroll to the specific post if we have the post ID
    if (postsContainerRef.current) {
      const postElement = document.querySelector(`[data-post-id="${postId}"]`);
      if (postElement) {
        postElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }

    // Reset the restoring state after a short delay
    setTimeout(() => {
      setIsRestoringScroll(false);
      setPendingScrollRestore(null);
    }, 500);
  };

  // Clear scroll restoration state when user manually scrolls
  useEffect(() => {
    const handleManualScroll = () => {
      if (isRestoringScroll) {
        setIsRestoringScroll(false);
        setPendingScrollRestore(null);
      }
    };

    window.addEventListener('scroll', handleManualScroll);
    return () => window.removeEventListener('scroll', handleManualScroll);
  }, [isRestoringScroll]);

  // Reset pagination when new posts are loaded
  useEffect(() => {
    if (posts) {
      setIsRestoringScroll(false);
      setPendingScrollRestore(null);
      setPostsToShow(12);
    }
  }, [posts]);

  const handleRefresh = () => {
    // Refetch paranormal feed and reset pagination, clear scroll restoration state
    setIsRestoringScroll(false);
    setPendingScrollRestore(null);
    setPostsToShow(12);
    refetch();
  };

  const handleLoadMore = () => {
    // Load 12 more posts and clear any scroll restoration state
    setIsRestoringScroll(false);
    setPendingScrollRestore(null);
    setPostsToShow(prev => prev + 12);
  };



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
              <div className="space-y-4" ref={postsContainerRef}>
                {/* Show limited number of posts with "Load More" functionality */}
                {posts.slice(0, postsToShow).map((post) => (
                  <div key={post.id} data-post-id={post.id}>
                    <ParanormalPost
                      event={post}
                      showActions={true}
                    />
                  </div>
                ))}

                {/* Loading indicator when restoring scroll and loading more posts */}
                {isRestoringScroll && postsToShow < posts.length && (
                  <div className="flex justify-center pt-4">
                    <div className="flex items-center space-x-2 text-lime-500/60">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-lime-500"></div>
                      <span className="text-sm">Loading posts to restore position...</span>
                    </div>
                  </div>
                )}

                {/* Load More Button - Only shown when not restoring scroll and no pending restore */}
                {postsToShow < posts.length && !isRestoringScroll && !pendingScrollRestore && (
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