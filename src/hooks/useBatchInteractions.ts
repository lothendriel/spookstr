import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppContext } from './useAppContext';
import { useMultiRelayQuery } from './useMultiRelayQuery';
import type { NostrEvent } from '@nostrify/nostrify';

interface InteractionCounts {
  likes: number;
  reposts: number;
  zaps: number;
  comments: number;
}

/**
 * Enhanced batch hook for fetching interactions for multiple posts at once.
 * This dramatically reduces network requests compared to individual queries per post.
 *
 * Improvements:
 * - Increased limit to handle more interactions
 * - Multiple relay queries for better coverage
 * - Better error handling and fallbacks
 * - More aggressive refresh for active content
 * - Enhanced debugging
 */
export function useBatchInteractions(eventIds: string[]) {
  const { config } = useAppContext();
  const queryClient = useQueryClient();

  // Debug logging only in development
if (import.meta.env.DEV) {
  console.log('[Batch Interactions] Hook called with eventIds:', eventIds.map(id => id.slice(0, 8)));
}

  // Get raw interaction events from multiple relays
  const { data: rawInteractionEvents, isLoading: isRawLoading, error: rawError } = useMultiRelayQuery({
    filters: [{
      kinds: [6, 7, 9735, 1, 1111], // reposts, likes, zaps, replies, comments
      '#e': eventIds,
      limit: 500, // Reduced limit to save memory
    }],
    // Use high-performance relays for interaction fetching
    relayUrls: [
      'wss://spookstr2.nostr1.com',
      'wss://relay.nostr.band',
      'wss://relay.damus.io',
      'wss://relay.primal.net',
      'wss://relay.mostr.pub'
    ],
    enabled: eventIds.length > 0,
    staleTime: 180000, // 3 minutes - reduced frequency for better memory management
    gcTime: 240000, // 4 minutes - reduced cache time to save memory
    retry: 2,
  });

  // Process and count interactions
  const { data: batchData, isLoading, error } = useQuery({
    queryKey: ['batch-interactions', 'processed', eventIds.sort().join(',')],
    queryFn: () => {
      if (eventIds.length === 0) {
        console.log('[Batch Interactions] No event IDs provided');
        return {};
      }

      if (!rawInteractionEvents || rawInteractionEvents.length === 0) {
        console.log('[Batch Interactions] No raw interaction events found');
        // Initialize empty counts for all requested event IDs
        const countsMap: Record<string, InteractionCounts> = {};
        for (const eventId of eventIds) {
          countsMap[eventId] = { likes: 0, reposts: 0, zaps: 0, comments: 0 };
        }
        return countsMap;
      }

      console.log('[Batch Interactions] Processing', rawInteractionEvents.length, 'raw interaction events for', eventIds.length, 'posts');

      // Group interactions by event ID
      const countsMap: Record<string, InteractionCounts> = {};

      // Initialize counts for all requested event IDs
      for (const eventId of eventIds) {
        countsMap[eventId] = {
          likes: 0,
          reposts: 0,
          zaps: 0,
          comments: 0,
        };
      }

      // Count interactions for each event
      let likeCount = 0, repostCount = 0, zapCount = 0, commentCount = 0;

      for (const event of rawInteractionEvents) {
        const referencedEventId = event.tags.find(([tag]) => tag === 'e')?.[1];
        if (!referencedEventId || !countsMap[referencedEventId]) {
          continue;
        }

        switch (event.kind) {
          case 7: // Like
            countsMap[referencedEventId].likes++;
            likeCount++;
            break;
          case 6: // Repost
            countsMap[referencedEventId].reposts++;
            repostCount++;
            break;
          case 9735: // Zap
            countsMap[referencedEventId].zaps++;
            zapCount++;
            break;
          case 1: // Text note reply
          case 1111: // Comment
            // Only count as reply if it's actually replying to the target event
            const eTags = event.tags.filter(([tag]) => tag === 'e');
            const isReply = eTags.some(([_, id]) => id === referencedEventId) &&
                           (eTags.length === 1 || eTags.some(([_, __, ___, marker]) => marker === 'reply'));

            if (isReply) {
              countsMap[referencedEventId].comments++;
              commentCount++;
            }
            break;
        }
      }

      if (import.meta.env.DEV) {
        console.log('[Batch Interactions] Summary:', {
          totalEvents: rawInteractionEvents.length,
          likes: likeCount,
          reposts: repostCount,
          zaps: zapCount,
          comments: commentCount,
          postsWithInteractions: Object.values(countsMap).filter(c =>
            c.likes > 0 || c.reposts > 0 || c.zaps > 0 || c.comments > 0
          ).length
        });
      }

      return countsMap;
    },
    enabled: !!rawInteractionEvents && eventIds.length > 0,
    staleTime: 180000, // 3 minutes - reduced frequency for better memory management
    gcTime: 240000, // 4 minutes - reduced cache time to save memory
    refetchOnMount: true, // Always refetch on mount to get fresh data
    refetchOnWindowFocus: true, // Refetch on window focus to get latest counts
    // Enhanced caching: Smart background refresh for active content
    refetchInterval: (data, query) => {
      // Only refetch if tab is visible and we have data and event IDs
      if (document.hidden || !data || eventIds.length === 0) return false;

      // Background refresh every 3 minutes for interaction counts
      // Reduced frequency to save memory while keeping data reasonably fresh
      return 300000; // 5 minutes
    },
    retry: (failureCount, error) => {
      if (import.meta.env.DEV) {
      console.log('[Batch Interactions] Retry attempt:', failureCount, 'Error:', error);
    }
      return failureCount < 3; // Retry up to 3 times
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff capped at 10s
  });

  // Update individual post interaction caches
  useEffect(() => {
    if (!batchData) return;

    if (import.meta.env.DEV) {
      console.log('[Batch Interactions] Updating individual caches for', Object.keys(batchData).length, 'posts');
    }
    if (import.meta.env.DEV) {
      console.log('[Batch Interactions] All batch data:',
        Object.entries(batchData).map(([id, counts]) => ({
          id: id.slice(0, 8),
          likes: counts.likes,
          reposts: counts.reposts,
          zaps: counts.zaps,
          comments: counts.comments,
          total: counts.likes + counts.reposts + counts.zaps + counts.comments
        }))
      );
    }

    // Log detailed counts for debugging (development only)
    if (import.meta.env.DEV) {
      const postsWithInteractions = Object.entries(batchData).filter(([_, counts]) =>
        counts.likes > 0 || counts.reposts > 0 || counts.zaps > 0 || counts.comments > 0
      );

      if (postsWithInteractions.length > 0) {
        console.log('[Batch Interactions] Posts with interactions:',
          postsWithInteractions.map(([id, counts]) => ({
            id: id.slice(0, 8),
            likes: counts.likes,
            reposts: counts.reposts,
            zaps: counts.zaps,
            comments: counts.comments
          }))
        );
      }
    }

    for (const [eventId, counts] of Object.entries(batchData)) {
      queryClient.setQueryData(['post-interactions', eventId], counts);
      if (import.meta.env.DEV) {
        console.log(`[Batch Interactions] Set cache for ${eventId.slice(0, 8)}:`, counts);
      }
    }
  }, [batchData, queryClient]);

  // Log errors for debugging
  useEffect(() => {
    if (error) {
      if (import.meta.env.DEV) {
      console.error('[Batch Interactions] Error fetching interactions:', error);
    }
    }
  }, [error]);

  return {
    data: batchData,
    isLoading,
    error,
  };
}
