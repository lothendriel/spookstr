import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

interface InteractionCounts {
  likes: number;
  reposts: number;
  zaps: number;
  comments: number;
}

export function useRealtimeInteractions(eventId: string) {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<AbortController | null>(null);

  // Base query for initial counts
  const { data: initialCounts, isLoading } = useQuery({
    queryKey: ['post-interactions', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      // Single query with all interaction kinds
      const events = await nostr.query([{
        kinds: [6, 7, 9734, 1, 1111], // reposts, likes, zaps, text note replies, comments
        '#e': [eventId],
        limit: 200,
      }], { signal });

      // Process counts in JavaScript
      return {
        likes: events.filter(e => e.kind === 7).length,
        reposts: events.filter(e => e.kind === 6).length,
        zaps: events.filter(e => e.kind === 9734).length,
        comments: events.filter(e => e.kind === 1 || e.kind === 1111).length,
      };
    },
    enabled: !!eventId,
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!eventId || !nostr) return;

    // Clean up previous subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.abort();
    }

    const abortController = new AbortController();
    subscriptionRef.current = abortController;

    // Subscribe to new interaction events
    const subscription = nostr.req([{
      kinds: [6, 7, 9734, 1, 1111],
      '#e': [eventId],
      limit: 0, // No limit for subscription
    }], { signal: abortController.signal });

    (async () => {
      try {
        for await (const event of subscription) {
          // Update the query cache with new counts
          queryClient.setQueryData(['post-interactions', eventId], (oldData: InteractionCounts | undefined) => {
            if (!oldData) {
              // If no old data, calculate from scratch
              return {
                likes: event.kind === 7 ? 1 : 0,
                reposts: event.kind === 6 ? 1 : 0,
                zaps: event.kind === 9734 ? 1 : 0,
                comments: (event.kind === 1 || event.kind === 1111) ? 1 : 0,
              };
            }

            // Update counts based on event kind
            const newCounts = { ...oldData };
            switch (event.kind) {
              case 7: // Like
                newCounts.likes += 1;
                break;
              case 6: // Repost
                newCounts.reposts += 1;
                break;
              case 9734: // Zap
                newCounts.zaps += 1;
                break;
              case 1: // Text note reply
              case 1111: // Comment
                newCounts.comments += 1;
                break;
            }

            return newCounts;
          });
        }
      } catch (error) {
        // Subscription was aborted or error occurred
        if (error !== 'AbortError') {
          console.error('Real-time subscription error:', error);
        }
      }
    })();

    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.abort();
        subscriptionRef.current = null;
      }
    };
  }, [eventId, nostr, queryClient]);

  return {
    data: initialCounts,
    isLoading,
  };
}