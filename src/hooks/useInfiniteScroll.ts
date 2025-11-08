import { useCallback, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';

/**
 * Hook for implementing infinite scroll with intersection observer
 * Provides automatic loading when user scrolls near the bottom
 */
export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  threshold = 0.8,
  rootMargin = '200px',
  enabled = true
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}) {
  const { ref, inView, entry } = useInView({
    threshold,
    rootMargin,
    triggerOnce: false,
    skip: !enabled || !hasNextPage || isFetchingNextPage,
  });

  const lastFetchTimeRef = useRef(0);
  const minimumFetchInterval = 1000; // 1 second minimum between fetches

  const handleFetchNextPage = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchTimeRef.current >= minimumFetchInterval) {
      lastFetchTimeRef.current = now;
      fetchNextPage();
    }
  }, [fetchNextPage]);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && enabled) {
      handleFetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, enabled, handleFetchNextPage]);

  // Reset fetch time when enabled state changes
  useEffect(() => {
    if (!enabled) {
      lastFetchTimeRef.current = 0;
    }
  }, [enabled]);

  return {
    loadMoreRef: ref,
    isInView: inView,
    isLoading: isFetchingNextPage,
    canLoadMore: hasNextPage,
  };
}

/**
 * Hook for manual infinite scroll with scroll event listener
 * Useful for custom scroll containers or when intersection observer isn't suitable
 */
export function useManualInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  threshold = 0.8,
  scrollElement,
  enabled = true
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  threshold?: number;
  scrollElement?: HTMLElement | Window | null;
  enabled?: boolean;
}) {
  const lastFetchTimeRef = useRef(0);
  const minimumFetchInterval = 1000; // 1 second minimum between fetches

  const handleScroll = useCallback(() => {
    if (!enabled || !hasNextPage || isFetchingNextPage) return;

    const now = Date.now();
    if (now - lastFetchTimeRef.current < minimumFetchInterval) return;

    let element: HTMLElement | Window;
    if (scrollElement) {
      element = scrollElement;
    } else {
      element = window;
    }

    const scrollTop = element instanceof Window ? element.scrollY : element.scrollTop;
    const scrollHeight = element instanceof Window ? element.document.documentElement.scrollHeight : element.scrollHeight;
    const clientHeight = element instanceof Window ? element.innerHeight : element.clientHeight;

    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    if (scrollPercentage >= threshold) {
      lastFetchTimeRef.current = now;
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, threshold, scrollElement, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const element = scrollElement || window;
    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll, scrollElement, enabled]);

  return {
    isLoading: isFetchingNextPage,
    canLoadMore: hasNextPage,
  };
}