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

export function useRealtimeInteractionCounts(eventId: string) {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<AbortController | null>(null);

  // Initial query to get current counts
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
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!eventId) return;

    // Clean up previous subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.abort();
    }

    const controller = new AbortController();
    subscriptionRef.current = controller;

    // Set up subscription for real-time updates
    const subscription = nostr.req([{
      kinds: [6, 7, 9734, 1, 1111], // reposts, likes, zaps, text note replies, comments
      '#e': [eventId],
    }], { signal: controller.signal });

    (async () => {
      try {
        for await (const event of subscription) {
          // Update the cached counts when new events are received
          queryClient.setQueryData(['post-interactions', eventId], (oldData: InteractionCounts | undefined) => {
            if (!oldData) {
              // If no old data, create initial counts
              return {
                likes: event.kind === 7 ? 1 : 0,
                reposts: event.kind === 6 ? 1 : 0,
                zaps: event.kind === 9734 ? 1 : 0,
                comments: (event.kind === 1 || event.kind === 1111) ? 1 : 0,
              };
            }

            // Increment the appropriate count based on event kind
            const newData = { ...oldData };
            switch (event.kind) {
              case 7: // Like
                newData.likes += 1;
                break;
              case 6: // Repost
                newData.reposts += 1;
                break;
              case 9734: // Zap
                newData.zaps += 1;
                break;
              case 1: // Text note reply
              case 1111: // Comment
                newData.comments += 1;
                break;
            }

            return newData;
          });
        }
      } catch (error) {
        // Ignore abort errors, they're expected when component unmounts
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error in real-time subscription:', error);
        }
      }
    })();

    // Cleanup function
    return () => {
      controller.abort();
    };
  }, [eventId, nostr, queryClient]);

  return {
    counts: initialCounts || { likes: 0, reposts: 0, zaps: 0, comments: 0 },
    isLoading,
  };
}