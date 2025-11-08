/**
 * Optimized Feed Component
 * High-performance feed implementation using virtual scrolling and advanced optimizations
 * Handles large datasets efficiently with minimal memory footprint
 */

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { NostrEvent } from '@nostrify/nostrify';
import { VirtualScroll, DynamicVirtualScroll } from '@/components/ui/VirtualScroll';
import { StandardizedPost } from '@/components/posts/StandardizedPost';
import { PostSkeleton } from '@/components/ui/LoadingComponents';
import { EmptyState } from '@/components/ui/ErrorBoundary';
import { useInView } from 'react-intersection-observer';
import { FileText, RefreshCw, Zap, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { useQuery } from '@tanstack/react-query';
import { useRelayQuery } from '@/hooks/useRelayQuery';
import { useNostr } from '@nostrify/react';
import { PerformanceUtils } from '@/components/performance/PerformanceMonitor';
import { cn } from '@/lib/utils';

interface OptimizedFeedProps {
  filters: Array<{ kinds: number[]; limit?: number; [key: string]: any }>;
  initialLoadSize?: number;
  batchSize?: number;
  virtualScrolling?: boolean;
  dynamicHeight?: boolean;
  estimatedItemHeight?: number;
  onPostClick?: (post: NostrEvent) => void;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  className?: string;
  enablePerformanceMonitoring?: boolean;
}

interface FeedState {
  posts: NostrEvent[];
  hasMore: boolean;
  isLoading: boolean;
  isError: boolean;
  lastFetchTime: number;
  totalCount: number;
}

export function OptimizedFeed({
  filters,
  initialLoadSize = 20,
  batchSize = 20,
  virtualScrolling = true,
  dynamicHeight = false,
  estimatedItemHeight = 200,
  onPostClick,
  emptyStateTitle = "No Posts Found",
  emptyStateDescription = "No posts match your current filters.",
  className,
  enablePerformanceMonitoring = false
}: OptimizedFeedProps) {
  const [feedState, setFeedState] = useState<FeedState>({
    posts: [],
    hasMore: true,
    isLoading: false,
    isError: false,
    lastFetchTime: 0,
    totalCount: 0
  });
  
  const [visiblePostIds, setVisiblePostIds] = useState<Set<string>>(new Set());
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { nostr } = useNostr();

  // Debounced fetch function to prevent excessive requests
  const fetchPosts = PerformanceUtils.debounce(async (isInitial = false, limit?: number) => {
    if (feedState.isLoading) return;

    setFeedState(prev => ({ ...prev, isLoading: true, isError: false }));

    try {
      const signal = AbortSignal.timeout(5000);
      const actualLimit = limit || (isInitial ? initialLoadSize : batchSize);
      
      // Get until time from last post if not initial load
      const until = isInitial ? undefined : feedState.posts[feedState.posts.length - 1]?.created_at;

      // Combine all filters with current state
      const enhancedFilters = filters.map(filter => ({
        ...filter,
        limit: actualLimit,
        ...(until && { until })
      }));

      const events = await nostr.query(enhancedFilters, { signal });
      
      // Remove duplicates and filter valid events
      const uniqueEvents = events.filter((event, index, self) => 
        self.findIndex(e => e.id === event.id) === index &&
        event.id &&
        event.pubkey &&
        event.created_at
      );

      setFeedState(prev => ({
        ...prev,
        posts: isInitial ? uniqueEvents : [...prev.posts, ...uniqueEvents],
        hasMore: uniqueEvents.length >= actualLimit,
        isLoading: false,
        lastFetchTime: Date.now(),
        totalCount: isInitial ? uniqueEvents.length : prev.totalCount + uniqueEvents.length
      }));

    } catch (error) {
      console.error('Failed to fetch posts:', error);
      setFeedState(prev => ({ ...prev, isLoading: false, isError: true }));
      
      toast({
        title: "Failed to load posts",
        description: "Unable to fetch posts from relays. Please try again.",
        variant: "destructive"
      });
    }
  }, 300);

  // Initial load
  useEffect(() => {
    fetchPosts(true, initialLoadSize);
  }, [filters, initialLoadSize]);

  // Load more posts
  const loadMore = useCallback(() => {
    if (feedState.hasMore && !feedState.isLoading) {
      fetchPosts(false, batchSize);
    }
  }, [feedState.hasMore, feedState.isLoading, fetchPosts, batchSize]);

  // Refresh feed
  const refresh = useCallback(() => {
    setFeedState({
      posts: [],
      hasMore: true,
      isLoading: false,
      isError: false,
      lastFetchTime: 0,
      totalCount: 0
    });
    fetchPosts(true, initialLoadSize);
  }, [fetchPosts, initialLoadSize]);

  // Track visible posts for performance monitoring
  const trackVisiblePost = useCallback((postId: string) => {
    setVisiblePostIds(prev => new Set([...prev, postId]));
  }, []);

  // Calculate post height for dynamic virtual scrolling
  const calculatePostHeight = useCallback((index: number, post: NostrEvent) => {
    // Base height calculation based on content
    let height = 100; // Minimum height
    
    // Add height for content (rough estimate)
    if (post.content) {
      const lines = Math.ceil(post.content.length / 80); // 80 chars per line
      height += lines * 20; // 20px per line
    }
    
    // Add height for media
    const hasImages = post.tags.some(tag => tag[0] === 'imeta' && tag[1]?.includes('image'));
    const hasVideos = post.tags.some(tag => tag[0] === 'imeta' && tag[1]?.includes('video'));
    
    if (hasImages) height += 200;
    if (hasVideos) height += 150;
    
    // Add height for interactions
    height += 60;
    
    return Math.min(height, 600); // Max height
  }, []);

  // Memoized post renderer
  const renderPost = useCallback((post: NostrEvent, index: number, style?: React.CSSProperties) => {
    const postElement = (
      <div style={style}>
        <StandardizedPost
          key={post.id}
          event={post}
          onClick={() => onPostClick?.(post)}
          className="mb-4"
        />
      </div>
    );

    // Track visibility for performance metrics
    if (enablePerformanceMonitoring) {
      return (
        <PostVisibilityTracker
          postId={post.id}
          onVisible={() => trackVisiblePost(post.id)}
        >
          {postElement}
        </PostVisibilityTracker>
      );
    }

    return postElement;
  }, [onPostClick, enablePerformanceMonitoring, trackVisiblePost]);

  // Empty state
  if (!feedState.isLoading && feedState.posts.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-8 w-8 text-lime-500" />}
        title={feedState.isError ? "Error Loading Posts" : emptyStateTitle}
        description={feedState.isError ? "Failed to load posts. Please try again." : emptyStateDescription}
        action={
          <div className="flex gap-2">
            <Button onClick={refresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            {feedState.isError && (
              <Button onClick={refresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>
        }
        className={className}
      />
    );
  }

  // Performance metrics
  const performanceMetrics = useMemo(() => ({
    totalPosts: feedState.totalCount,
    visiblePosts: visiblePostIds.size,
    loadTime: feedState.lastFetchTime,
    hasMore: feedState.hasMore,
    averageRenderTime: feedState.posts.length > 0 ? feedState.totalCount / feedState.posts.length : 0
  }), [feedState, visiblePostIds]);

  if (!virtualScrolling) {
    // Simple scroll implementation for smaller datasets
    return (
      <div ref={feedContainerRef} className={cn('space-y-4', className)}>
        {feedState.posts.map((post, index) => renderPost(post, index))}
        
        {/* Load more button */}
        {feedState.hasMore && (
          <div className="text-center py-4">
            <Button
              onClick={loadMore}
              disabled={feedState.isLoading}
              variant="outline"
            >
              {feedState.isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
        
        {/* Error state */}
        {feedState.isError && (
          <Card className="border-red-500/20 bg-red-500/10">
            <CardContent className="p-4 text-center">
              <p className="text-red-300 mb-4">Failed to load posts</p>
              <Button onClick={refresh} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Virtual scrolling implementation
  const VirtualScrollComponent = dynamicHeight ? DynamicVirtualScroll : VirtualScroll;

  return (
    <div className={cn('relative', className)}>
      {/* Performance metrics (development only) */}
      {enablePerformanceMonitoring && process.env.NODE_ENV === 'development' && (
        <div className="absolute top-0 right-0 z-10 bg-black/80 backdrop-blur-sm rounded-lg p-3 text-xs text-lime-300 space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3" />
            <span>Posts: {performanceMetrics.totalPosts}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3" />
            <span>Visible: {performanceMetrics.visiblePosts}</span>
          </div>
          <Badge variant={feedState.hasMore ? "default" : "secondary"}>
            {feedState.hasMore ? "More Available" : "All Loaded"}
          </Badge>
        </div>
      )}

      <VirtualScrollComponent
        items={feedState.posts}
        renderItem={renderPost}
        height={600}
        estimatedItemHeight={estimatedItemHeight}
        itemHeight={dynamicHeight ? calculatePostHeight : estimatedItemHeight}
        overscan={5}
        isLoading={feedState.isLoading}
        hasMore={feedState.hasMore}
        onLoadMore={loadMore}
        loadingState={
          <div className="py-4 flex justify-center">
            <Button disabled variant="outline">
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Loading more posts...
            </Button>
          </div>
        }
        emptyState={
          <EmptyState
            icon={<FileText className="h-8 w-8 text-lime-500" />}
            title={emptyStateTitle}
            description={emptyStateDescription}
          />
        }
      />
    </div>
  );
}

/**
 * Component to track post visibility for analytics
 */
interface PostVisibilityTrackerProps {
  postId: string;
  onVisible: () => void;
  children: React.ReactNode;
}

function PostVisibilityTracker({ postId, onVisible, children }: PostVisibilityTrackerProps) {
  const { ref, inView } = useInView({
    threshold: 0.5, // At least 50% visible
    triggerOnce: true,
  });

  useEffect(() => {
    if (inView) {
      onVisible();
    }
  }, [inView, onVisible]);

  return <div ref={ref}>{children}</div>;
}

/**
 * Hook for optimized feed state management
 */
export function useOptimizedFeed(initialFilters: OptimizedFeedProps['filters']) {
  const [filters, setFilters] = useState(initialFilters);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'most-liked' | 'most-zapped'>('newest');
  const [showOnlyMedia, setShowOnlyMedia] = useState(false);

  const updateFilters = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  const updateSortOrder = useCallback((newOrder: typeof sortOrder) => {
    setSortOrder(newOrder);
  }, []);

  const filteredEvents = useQuery({
    queryKey: ['feed', filters, sortOrder, showOnlyMedia],
    queryFn: () => {
      // This would typically fetch from cache or API
      return [];
    },
    staleTime: 60000, // 1 minute
  });

  return {
    filters,
    sortOrder,
    showOnlyMedia,
    updateFilters,
    updateSortOrder,
    setShowOnlyMedia,
    events: filteredEvents.data || [],
    isLoading: filteredEvents.isLoading,
    isError: filteredEvents.isError
  };
}

/**
 * Memoized version for better performance
 */
export const MemoizedOptimizedFeed = memo(OptimizedFeed);

MemoizedOptimizedFeed.displayName = 'MemoizedOptimizedFeed';

export default OptimizedFeed;