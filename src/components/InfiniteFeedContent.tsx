import { memo, useMemo } from 'react';
import { useInView } from 'react-intersection-observer';
import { NostrEvent } from '@nostrify/nostrify';
import { ParanormalPost } from './ParanormalPost';
import { Skeleton } from './ui/skeleton';

interface InfiniteFeedContentProps {
  data: {
    pages: NostrEvent[][];
  } | undefined;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  onPostClick: (post: NostrEvent) => void;
}

/**
 * Infinite scroll feed component that automatically loads more content when user scrolls to bottom.
 * Uses intersection observer for performance and removes duplicate events.
 */
export const InfiniteFeedContent = memo(({
  data,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onPostClick
}: InfiniteFeedContentProps) => {
  const { ref, inView } = useInView({
    threshold: 0.1,
    rootMargin: '200px', // Start loading 200px before element comes into view
  });

  // Trigger fetch when element comes into view
  if (inView && hasNextPage && !isFetchingNextPage) {
    console.log('[InfiniteFeedContent] Triggering fetchNextPage - inView:', inView, 'hasNextPage:', hasNextPage, 'isFetchingNextPage:', isFetchingNextPage);
    fetchNextPage();
  }

  // Remove duplicate events by ID and flatten pages
  const posts = useMemo(() => {
    if (!data?.pages) {
      console.log('[InfiniteFeedContent] No data pages available');
      return [];
    }

    console.log('[InfiniteFeedContent] Processing', data.pages.length, 'pages');
    const seen = new Set<string>();
    const flattened = data.pages.flat().filter(event => {
      if (!event.id || seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    });
    console.log('[InfiniteFeedContent] Flattened to', flattened.length, 'unique posts');
    return flattened;
  }, [data?.pages]);

  console.log('[InfiniteFeedContent] Rendering', posts.length, 'unique posts from', data?.pages.length || 0, 'pages');

  if (posts.length === 0) {
    console.log('[InfiniteFeedContent] No posts to render, returning null');
    return null;
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <ParanormalPost
          key={post.id}
          event={post}
          onClick={() => onPostClick(post)}
          showActions={true}
        />
      ))}

      {/* Infinite scroll trigger */}
      {hasNextPage && (
        <div
          ref={ref}
          className="py-8 flex justify-center"
        >
          {isFetchingNextPage && (
            <div className="space-y-4 w-full max-w-md">
              {[...Array(3)].map((_, i) => (
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
        </div>
      )}

      {/* End of feed indicator */}
      {!hasNextPage && posts.length > 0 && (
        <div className="text-center py-8">
          <div className="border border-lime-500/20 rounded-lg p-6 bg-black/20 backdrop-blur-sm">
            <p className="text-lime-400 mb-2">
              🎭 You've reached the end of the paranormal realm
            </p>
            <p className="text-sm text-lime-500/60">
              Showing all {posts.length} posts from the unknown
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

InfiniteFeedContent.displayName = 'InfiniteFeedContent';