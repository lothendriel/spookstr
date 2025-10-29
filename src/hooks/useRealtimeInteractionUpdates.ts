import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useAppContext } from './useAppContext';
import type { NostrEvent, NostrFilter } from '@nostrify/nostrify';

interface InteractionCounts {
  likes: number;
  reposts: number;
  zaps: number;
  comments: number;
}

// Shared subscription state to prevent multiple subscriptions
const activeSubscriptions = new Map<string, {
  count: number;
  abortController: AbortController | null;
}>();

/**
 * Enhanced real-time interaction updates hook using multi-relay approach.
 * Uses a SINGLE shared subscription per set of event IDs across ALL configured relays.
 * Features:
 * - Multi-relay coverage for comprehensive real-time updates
 * - Throttled updates (max 1 update per second per post)
 * - Batched processing (updates queued and applied together)
 * - Automatic cleanup when no components are using the subscription
 * - Deduplication across relays
 */
export function useRealtimeInteractionUpdates(eventIds: string[]) {
  const { nostr } = useNostr();
  const { presetRelays = [] } = useAppContext();
  const queryClient = useQueryClient();
  const updateQueueRef = useRef<Map<string, Partial<InteractionCounts>>>(new Map());
  const lastUpdateRef = useRef<Map<string, number>>(new Map());
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (eventIds.length === 0) return;

    // Create a subscription key from sorted event IDs
    const subscriptionKey = eventIds.sort().join(',');

    // Check if subscription already exists
    let subInfo = activeSubscriptions.get(subscriptionKey);

    if (subInfo) {
      // Increment reference count
      subInfo.count++;
    } else {
      // Create new subscription with multi-relay support
      const abortController = new AbortController();

      createSharedSubscription(
        nostr,
        eventIds,
        presetRelays,
        queryClient,
        updateQueueRef,
        lastUpdateRef,
        flushTimerRef,
        abortController
      );

      subInfo = { count: 1, abortController };
      activeSubscriptions.set(subscriptionKey, subInfo);
    }

    // Cleanup function
    return () => {
      const info = activeSubscriptions.get(subscriptionKey);
      if (!info) return;

      info.count--;

      // If no more components are using this subscription, close it
      if (info.count <= 0) {
        info.abortController?.abort();
        activeSubscriptions.delete(subscriptionKey);
      }
    };
  }, [eventIds.join(','), nostr, presetRelays, queryClient]);

  // Cleanup flush timer on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
      }
    };
  }, []);
}

async function createSharedSubscription(
  nostr: any,
  eventIds: string[],
  presetRelays: any[],
  queryClient: any,
  updateQueueRef: React.MutableRefObject<Map<string, Partial<InteractionCounts>>>,
  lastUpdateRef: React.MutableRefObject<Map<string, number>>,
  flushTimerRef: React.MutableRefObject<NodeJS.Timeout | null>,
  abortController: AbortController
): Promise<void> {
  const seenEventIds = new Set<string>(); // Track seen events for deduplication

  try {
    // Setup batch flush interval
    flushTimerRef.current = setInterval(() => {
      if (updateQueueRef.current.size === 0) return;

      // Process all queued updates
      for (const [eventId, updates] of updateQueueRef.current.entries()) {
        queryClient.setQueryData(
          ['post-interactions', eventId],
          (oldData: InteractionCounts | undefined) => {
            if (!oldData) {
              return {
                likes: updates.likes || 0,
                reposts: updates.reposts || 0,
                zaps: updates.zaps || 0,
                comments: updates.comments || 0,
              };
            }

            return {
              likes: oldData.likes + (updates.likes || 0),
              reposts: oldData.reposts + (updates.reposts || 0),
              zaps: oldData.zaps + (updates.zaps || 0),
              comments: oldData.comments + (updates.comments || 0),
            };
          }
        );
      }

      // Clear the queue
      updateQueueRef.current.clear();
    }, 2000);

    // Create filter for subscription
    const filters: NostrFilter[] = [{
      kinds: [6, 7, 9735, 1, 1111, 16], // reposts, likes, zaps, replies, comments, generic reposts
      '#e': eventIds,
      since: Math.floor(Date.now() / 1000), // Only new events from now
    }];

    // Get relay URLs for multi-relay subscription
    const relayUrls = presetRelays.map(r => r.url);

    console.log(`[Real-time Interactions] Starting multi-relay subscription on ${relayUrls.length} relays`);

    // Create subscription handler
    const handleEvent = (event: NostrEvent) => {
      // Deduplicate events across relays
      if (seenEventIds.has(event.id)) {
        return; // Skip if already processed
      }
      seenEventIds.add(event.id);

      // Validate event structure
      if (!event || !event.tags || !Array.isArray(event.tags)) return;

      const referencedEventId = event.tags.find(([tag]: string[]) => tag === 'e')?.[1];
      if (!referencedEventId || !eventIds.includes(referencedEventId)) return;

      // Throttle updates - max 1 update per second per post
      const now = Date.now();
      const lastUpdate = lastUpdateRef.current.get(referencedEventId) || 0;
      if (now - lastUpdate < 1000) return; // Skip if updated within last second

      lastUpdateRef.current.set(referencedEventId, now);

      // Queue the update
      const currentQueue = updateQueueRef.current.get(referencedEventId) || {};

      switch (event.kind) {
        case 7: // Like
          currentQueue.likes = (currentQueue.likes || 0) + 1;
          break;
        case 6: // Repost
        case 16: // Generic repost
          currentQueue.reposts = (currentQueue.reposts || 0) + 1;
          break;
        case 9735: // Zap
          currentQueue.zaps = (currentQueue.zaps || 0) + 1;
          break;
        case 1: // Text note reply
        case 1111: // Comment
          currentQueue.comments = (currentQueue.comments || 0) + 1;
          break;
      }

      updateQueueRef.current.set(referencedEventId, currentQueue);
    };

    // Subscribe to all relays or fallback to default
    if (relayUrls.length > 0) {
      try {
        const relayGroup = nostr.group(relayUrls);
        for await (const msg of relayGroup.req(filters, { signal: abortController.signal })) {
          const event = (msg as any).event || msg;
          if (event) handleEvent(event);
        }
      } catch (groupError) {
        console.log('[Real-time Interactions] Relay group failed, falling back to default:', groupError);
        // Fallback to default nostr instance
        for await (const msg of nostr.req(filters, { signal: abortController.signal })) {
          const event = (msg as any).event || msg;
          if (event) handleEvent(event);
        }
      }
    } else {
      // Fallback to default nostr instance
      for await (const msg of nostr.req(filters, { signal: abortController.signal })) {
        const event = (msg as any).event || msg;
        if (event) handleEvent(event);
      }
    }
  } catch (error: any) {
    // Ignore abort errors (expected when component unmounts)
    if (error?.name === 'AbortError') return;
    console.error('Error in real-time subscription:', error);
  } finally {
    // Cleanup flush timer
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }
}
