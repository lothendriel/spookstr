import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMultiRelayQuery } from './useMultiRelayQuery';
import { useMemo } from 'react';

interface InteractionCounts {
  likes: number;
  reposts: number;
  zaps: number;
  comments: number;
}

interface UseRealtimeInteractionsReturn {
  data: InteractionCounts | undefined;
  isLoading: boolean;
  optimisticUpdate: (kind: number, increment: number) => void;
}

/**
 * Enhanced hook for fetching post interaction counts with fallback querying.
 * Primarily reads from cache populated by batch query, but can fallback to individual query.
 */
export function useRealtimeInteractions(eventId: string): UseRealtimeInteractionsReturn {
  const queryClient = useQueryClient();

  // Check if we have cached data from batch query
  const cachedData = queryClient.getQueryData(['post-interactions', eventId]) as InteractionCounts | undefined;

  // Fallback query using multi-relay approach if no cached data
  const { data: fallbackEvents } = useMultiRelayQuery({
    filters: eventId && !cachedData ? [{
      kinds: [6, 7, 9735, 1, 1111, 16], // reposts, likes, zaps, replies, comments, generic reposts
      '#e': [eventId],
      limit: 200,
    }] : [],
    enabled: !!eventId && !cachedData,
    staleTime: 30000,
    retry: 1,
  });

  // Process fallback events into counts
  const fallbackCounts = useMemo(() => {
    if (!fallbackEvents || cachedData) return null;

    const counts: InteractionCounts = {
      likes: 0,
      reposts: 0,
      zaps: 0,
      comments: 0,
    };

    // Deduplicate events by ID
    const uniqueEvents = Array.from(
      new Map(fallbackEvents.map(event => [event.id, event])).values()
    );

    console.log(`[Realtime Interactions] Fallback query found ${uniqueEvents.length} interactions for event ${eventId.slice(0, 8)}`);

    // Count interactions
    for (const event of uniqueEvents) {
      const referencedEventId = event.tags.find(([tag]) => tag === 'e')?.[1];
      if (referencedEventId !== eventId) continue;

      switch (event.kind) {
        case 7: // Like
          counts.likes++;
          break;
        case 6: // Repost
        case 16: // Generic repost
          counts.reposts++;
          break;
        case 9735: // Zap
          counts.zaps++;
          break;
        case 1: // Text note reply
        case 1111: // Comment
          counts.comments++;
          break;
      }
    }

    // Cache the results for consistency
    queryClient.setQueryData(['post-interactions', eventId], counts);

    return counts;
  }, [fallbackEvents, cachedData, eventId, queryClient]);

  // Optimistic update function
  const optimisticUpdate = (kind: number, increment: number) => {
    queryClient.setQueryData(['post-interactions', eventId], (oldData: InteractionCounts | undefined) => {
      if (!oldData) {
        // If no old data, create initial counts
        return {
          likes: kind === 7 ? increment : 0,
          reposts: (kind === 6 || kind === 16) ? increment : 0,
          zaps: kind === 9735 ? increment : 0,
          comments: (kind === 1 || kind === 1111) ? increment : 0,
        };
      }

      // Update counts based on event kind
      const newCounts = { ...oldData };
      switch (kind) {
        case 7: // Like
          newCounts.likes += increment;
          break;
        case 6: // Repost
        case 16: // Generic repost
          newCounts.reposts += increment;
          break;
        case 9735: // Zap
          newCounts.zaps += increment;
          break;
        case 1: // Text note reply
        case 1111: // Comment
          newCounts.comments += increment;
          break;
      }

      return newCounts;
    });
  };

  // Base query for initial counts - reads from cache or uses fallback
  const { data: initialCounts, isLoading } = useQuery({
    queryKey: ['post-interactions', eventId],
    queryFn: () => {
      // Return cached data or fallback counts
      return cachedData || fallbackCounts || {
        likes: 0,
        reposts: 0,
        zaps: 0,
        comments: 0,
      };
    },
    enabled: !!eventId,
    staleTime: 30000, // 30 seconds - allow some refetching for individual queries
    gcTime: 300000, // 5 minutes
  });

  return {
    data: initialCounts,
    isLoading: isLoading || (!cachedData && !fallbackCounts && !!eventId),
    optimisticUpdate,
  };
}