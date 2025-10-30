import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

interface InteractionCounts {
  likes: number;
  reposts: number;
  zaps: number;
  comments: number;
}

/**
 * Batch hook for fetching interactions for multiple posts at once.
 * This dramatically reduces network requests compared to individual queries per post.
 */
export function useBatchInteractions(eventIds: string[]) {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();

  const { data: batchData, isLoading } = useQuery({
    queryKey: ['batch-interactions', eventIds.sort().join(',')],
    queryFn: async (c) => {
      if (eventIds.length === 0) return {};

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Single query to fetch interactions for all posts
      const events = await nostr.query([{
        kinds: [6, 7, 9735, 1, 1111], // reposts, likes, zaps, replies, comments
        '#e': eventIds,
        limit: 500, // Reduced limit to prevent memory overload
      }], { signal });

      // Group interactions by event ID
      const countsMap: Record<string, InteractionCounts> = {};

      for (const eventId of eventIds) {
        countsMap[eventId] = {
          likes: 0,
          reposts: 0,
          zaps: 0,
          comments: 0,
        };
      }

      // Count interactions for each event
      for (const event of events) {
        const referencedEventId = event.tags.find(([tag]) => tag === 'e')?.[1];
        if (!referencedEventId || !countsMap[referencedEventId]) continue;

        switch (event.kind) {
          case 7: // Like
            countsMap[referencedEventId].likes++;
            break;
          case 6: // Repost
            countsMap[referencedEventId].reposts++;
            break;
          case 9735: // Zap
            countsMap[referencedEventId].zaps++;
            break;
          case 1: // Text note reply
          case 1111: // Comment
            countsMap[referencedEventId].comments++;
            break;
        }
      }

      return countsMap;
    },
    enabled: eventIds.length > 0,
    staleTime: 45000, // 45 seconds - balanced freshness with performance
    gcTime: 600000, // 10 minutes - keep interaction data cached longer
    refetchOnMount: false, // Don't refetch if data exists
    refetchOnWindowFocus: false, // Rely on real-time updates instead
    // Enhanced caching: Smart background refresh for active content
    refetchInterval: (data, query) => {
      // Only refetch if tab is visible and we have data and event IDs
      if (document.hidden || !data || eventIds.length === 0) return false;

      // Background refresh every 90 seconds for interaction counts
      // This ensures users see updated likes/zaps/comments without manual refresh
      return 90000; // 1.5 minutes
    },
  });

  // Update individual post interaction caches
  useEffect(() => {
    if (!batchData) return;

    // Log zap counts for debugging
    const zapCounts = Object.entries(batchData).filter(([_, counts]) => counts.zaps > 0);
    if (zapCounts.length > 0) {
      console.log('[Batch Interactions] Updating caches with zap counts:',
        zapCounts.map(([id, counts]) => ({ id: id.slice(0, 8), zaps: counts.zaps }))
      );
    }

    for (const [eventId, counts] of Object.entries(batchData)) {
      queryClient.setQueryData(['post-interactions', eventId], counts);
    }
  }, [batchData, queryClient]);

  return {
    data: batchData,
    isLoading,
  };
}
