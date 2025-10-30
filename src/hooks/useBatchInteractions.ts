import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useAppContext } from './useAppContext';
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
  const { nostr } = useNostr();
  const { config } = useAppContext();
  const queryClient = useQueryClient();

  console.log('[Batch Interactions] Hook called with eventIds:', eventIds.map(id => id.slice(0, 8)));

  const { data: batchData, isLoading, error } = useQuery({
    queryKey: ['batch-interactions', eventIds.sort().join(',')],
    queryFn: async (c) => {
      if (eventIds.length === 0) {
        console.log('[Batch Interactions] No event IDs provided');
        return {};
      }

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      console.log('[Batch Interactions] Fetching interactions for', eventIds.length, 'posts');

      // Get configured relays for better coverage
      const relays = config.relays?.filter(r => r.mode === 'read' || r.mode === 'both').map(r => r.url) || [config.relayUrl];

      // Always include Spookstr relay for better interaction discovery
      const spookstrRelay = 'wss://spookstr2.nostr1.com';
      if (!relays.includes(spookstrRelay)) {
        relays.unshift(spookstrRelay);
      }

      console.log('[Batch Interactions] Using relays:', relays);

      let allEvents: NostrEvent[] = [];

      // Try to query from multiple relays for better coverage
      if (relays.length > 1) {
        try {
          const relayGroup = nostr.group(relays.slice(0, 3)); // Use top 3 relays
          const events = await relayGroup.query([{
            kinds: [6, 7, 9735, 1, 1111], // reposts, likes, zaps, replies, comments
            '#e': eventIds,
            limit: 1000, // Increased limit to handle more interactions
          }], { signal });

          allEvents = events;
          console.log('[Batch Interactions] Found', events.length, 'interactions from relay group');
        } catch (error) {
          console.warn('[Batch Interactions] Relay group query failed, falling back to single relay:', error);
        }
      }

      // Fallback to single relay if group query failed or we have only one relay
      if (allEvents.length === 0) {
        try {
          const events = await nostr.query([{
            kinds: [6, 7, 9735, 1, 1111], // reposts, likes, zaps, replies, comments
            '#e': eventIds,
            limit: 1000, // Increased limit to handle more interactions
          }], { signal });

          allEvents = events;
          console.log('[Batch Interactions] Found', events.length, 'interactions from single relay');
        } catch (error) {
          console.error('[Batch Interactions] Single relay query failed:', error);
          allEvents = [];
        }
      }

      // Deduplicate events by ID
      const uniqueEvents = new Map<string, NostrEvent>();
      for (const event of allEvents) {
        if (!uniqueEvents.has(event.id)) {
          uniqueEvents.set(event.id, event);
        }
      }

      const deduplicatedEvents = Array.from(uniqueEvents.values());
      console.log('[Batch Interactions] After deduplication:', deduplicatedEvents.length, 'unique interactions');

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

      for (const event of deduplicatedEvents) {
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

      console.log('[Batch Interactions] Summary:', {
        totalEvents: deduplicatedEvents.length,
        likes: likeCount,
        reposts: repostCount,
        zaps: zapCount,
        comments: commentCount,
        postsWithInteractions: Object.values(countsMap).filter(c =>
          c.likes > 0 || c.reposts > 0 || c.zaps > 0 || c.comments > 0
        ).length
      });

      return countsMap;
    },
    enabled: eventIds.length > 0,
    staleTime: 30000, // 30 seconds - more frequent updates for better user experience
    gcTime: 600000, // 10 minutes - keep interaction data cached longer
    refetchOnMount: true, // Always refetch on mount to get fresh data
    refetchOnWindowFocus: true, // Refetch on window focus to get latest counts
    // Enhanced caching: Smart background refresh for active content
    refetchInterval: (data, query) => {
      // Only refetch if tab is visible and we have data and event IDs
      if (document.hidden || !data || eventIds.length === 0) return false;

      // Background refresh every 60 seconds for interaction counts
      // This ensures users see updated likes/zaps/comments without manual refresh
      return 60000; // 1 minute
    },
    retry: (failureCount, error) => {
      console.log('[Batch Interactions] Retry attempt:', failureCount, 'Error:', error);
      return failureCount < 3; // Retry up to 3 times
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff capped at 10s
  });

  // Update individual post interaction caches
  useEffect(() => {
    if (!batchData) return;

    console.log('[Batch Interactions] Updating individual caches for', Object.keys(batchData).length, 'posts');
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

    // Log detailed counts for debugging
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

    for (const [eventId, counts] of Object.entries(batchData)) {
      queryClient.setQueryData(['post-interactions', eventId], counts);
      console.log(`[Batch Interactions] Set cache for ${eventId.slice(0, 8)}:`, counts);
    }
  }, [batchData, queryClient]);

  // Log errors for debugging
  useEffect(() => {
    if (error) {
      console.error('[Batch Interactions] Error fetching interactions:', error);
    }
  }, [error]);

  return {
    data: batchData,
    isLoading,
    error,
  };
}
