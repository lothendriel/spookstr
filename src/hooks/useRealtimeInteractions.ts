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

interface UseRealtimeInteractionsReturn {
  data: InteractionCounts | undefined;
  isLoading: boolean;
  error: any;
  optimisticUpdate: (kind: number, increment: number) => void;
  refetch: () => void;
}

/**
 * Enhanced hook for fetching post interaction counts with fallback query.
 *
 * This hook:
 * 1. Primarily reads from cache populated by batch queries and real-time updates
 * 2. Has a fallback query to fetch data if cache is empty
 * 3. Provides optimistic updates for instant UI feedback
 * 4. Includes detailed logging for debugging
 * 5. Supports manual refetch for recovery
 */
export function useRealtimeInteractions(eventId: string): UseRealtimeInteractionsReturn {
  const { nostr } = useNostr();
  const { config } = useAppContext();
  const queryClient = useQueryClient();

  // Optimistic update function with enhanced logging
  const optimisticUpdate = (kind: number, increment: number) => {
    const kindNames: Record<number, string> = {
      1: 'comment',
      6: 'repost',
      7: 'like',
      1111: 'comment',
      9735: 'zap'
    };

    const actionName = increment > 0 ? 'incremented' : 'decremented';
    const kindName = kindNames[kind] || `kind-${kind}`;

    console.log(`[Realtime Interactions] Optimistic update: ${kindName} ${actionName} by ${Math.abs(increment)} for ${eventId.slice(0, 8)}`);

    queryClient.setQueryData(['post-interactions', eventId], (oldData: InteractionCounts | undefined) => {
      if (!oldData) {
        // If no old data, create initial counts
        const newData = {
          likes: kind === 7 ? increment : 0,
          reposts: kind === 6 ? increment : 0,
          zaps: kind === 9735 ? increment : 0,
          comments: (kind === 1 || kind === 1111) ? increment : 0,
        };

        console.log(`[Realtime Interactions] Created new data:`, newData);
        return newData;
      }

      // Update counts based on event kind
      const newCounts = { ...oldData };
      switch (kind) {
        case 7: // Like
          newCounts.likes += increment;
          break;
        case 6: // Repost
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

      console.log(`[Realtime Interactions] Updated ${kindName} from ${oldData[kindName as keyof InteractionCounts]} to ${newCounts[kindName as keyof InteractionCounts]}`);

      return newCounts;
    });
  };

  // Base query for initial counts - primarily reads from cache populated by batch query
  // but includes fallback for when cache is empty
  const { data: initialCounts, isLoading, error, refetch } = useQuery({
    queryKey: ['post-interactions', eventId],
    queryFn: async (c) => {
      console.log(`[Realtime Interactions] Cache miss for ${eventId.slice(0, 8)}, fetching fallback data`);

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(8000)]);

      try {
        // Get configured relays
        const relays = config.relays?.filter((r: any) => r.mode === 'read' || r.mode === 'both').map((r: any) => r.url) || [config.relayUrl];

        // Always include Spookstr relay for better interaction discovery
        const spookstrRelay = 'wss://spookstr2.nostr1.com';
        if (!relays.includes(spookstrRelay)) {
          relays.unshift(spookstrRelay);
        }

        console.log(`[Realtime Interactions] Fallback query using relays:`, relays);

        let events: NostrEvent[] = [];

        // Try multiple relays for better coverage
        if (relays.length > 1) {
          try {
            const relayGroup = nostr.group(relays.slice(0, 3));
            events = await relayGroup.query([{
              kinds: [6, 7, 9735, 1, 1111], // reposts, likes, zaps, replies, comments
              '#e': [eventId],
              limit: 500,
            }], { signal });
          } catch (groupError) {
            console.warn(`[Realtime Interactions] Relay group query failed for ${eventId.slice(0, 8)}, trying single relay:`, groupError);
          }
        }

        // Fallback to single relay if group query failed
        if (events.length === 0) {
          events = await nostr.query([{
            kinds: [6, 7, 9735, 1, 1111], // reposts, likes, zaps, replies, comments
            '#e': [eventId],
            limit: 500,
          }], { signal });
        }

        console.log(`[Realtime Interactions] Fallback query found ${events.length} interactions for ${eventId.slice(0, 8)}`);

        // Count interactions
        const counts = {
          likes: 0,
          reposts: 0,
          zaps: 0,
          comments: 0,
        };

        for (const event of events) {
          switch (event.kind) {
            case 7: // Like
              counts.likes++;
              break;
            case 6: // Repost
              counts.reposts++;
              break;
            case 9735: // Zap
              counts.zaps++;
              break;
            case 1: // Text note reply
            case 1111: // Comment
              // Only count as reply if it's actually replying to target event
              const eTags = event.tags.filter(([tag]) => tag === 'e');
              const isReply = eTags.some(([_, id]) => id === eventId) &&
                             (eTags.length === 1 || eTags.some(([_, __, ___, marker]) => marker === 'reply'));

              if (isReply) {
                counts.comments++;
              }
              break;
          }
        }

        console.log(`[Realtime Interactions] Fallback counts for ${eventId.slice(0, 8)}:`, counts);
        return counts;

      } catch (queryError) {
        console.error(`[Realtime Interactions] Fallback query failed for ${eventId.slice(0, 8)}:`, queryError);

        // Return empty counts on error - the real-time updates will eventually populate this
        return {
          likes: 0,
          reposts: 0,
          zaps: 0,
          comments: 0,
        };
      }
    },
    enabled: !!eventId,
    staleTime: 30000, // 30 seconds - consider stale after this if no real-time updates
    gcTime: 300000, // 5 minutes - keep in cache
    refetchOnMount: false, // Don't refetch on mount - rely on batch queries
    refetchOnWindowFocus: false, // Rely on real-time updates
    retry: 2, // Retry failed fallback queries
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff capped at 5s
  });

  // Log state changes for debugging
  console.log(`[Realtime Interactions] State for ${eventId.slice(0, 8)}:`, {
    isLoading,
    hasData: !!initialCounts,
    data: initialCounts,
    error: error?.message
  });

  return {
    data: initialCounts,
    isLoading,
    error,
    optimisticUpdate,
    refetch,
  };
}