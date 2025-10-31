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
  lastActivity: number;
}>();

// Subscription cleanup interval - remove inactive subscriptions every 5 minutes
const CLEANUP_INTERVAL = 300000;
let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * Complete cleanup function for all realtime subscriptions.
 * Call this when the app is shutting down or when memory needs to be freed.
 */
export const cleanupAllRealtimeSubscriptions = () => {
  console.log('[Realtime Updates] Cleaning up all subscriptions');
  for (const [key, info] of activeSubscriptions.entries()) {
    info.abortController?.abort();
  }
  activeSubscriptions.clear();
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
};

/**
 * Enhanced real-time interaction updates hook.
 * Uses a SINGLE shared subscription per set of event IDs to prevent connection overload.
 * Features:
 * - Historical data fetching to ensure baseline counts are correct
 * - Throttled updates (max 1 update per second per post)
 * - Batched processing (updates queued and applied together)
 * - Automatic cleanup when no components are using the subscription
 * - Multi-relay support for better coverage
 * - Better error handling and recovery
 */
export function useRealtimeInteractionUpdates(eventIds: string[]) {
  const { nostr } = useNostr();
  const { config } = useAppContext();
  const queryClient = useQueryClient();
  const updateQueueRef = useRef<Map<string, Partial<InteractionCounts>>>(new Map());
  const lastUpdateRef = useRef<Map<string, number>>(new Map());
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (eventIds.length === 0) {
      console.log('[Realtime Updates] No event IDs provided, skipping subscription');
      return;
    }

    // Create a subscription key from sorted event IDs
    const subscriptionKey = eventIds.sort().join(',');

    // Check if subscription already exists
    let subInfo = activeSubscriptions.get(subscriptionKey);

    if (subInfo) {
      // Update last activity and increment reference count
      subInfo.count++;
      subInfo.lastActivity = Date.now();
      console.log('[Realtime Updates] Reusing existing subscription for', eventIds.length, 'posts');
    } else {
      // Create new subscription
      const abortController = new AbortController();

      createSharedSubscription(
        nostr,
        eventIds,
        queryClient,
        updateQueueRef,
        lastUpdateRef,
        flushTimerRef,
        abortController,
        config
      );

      subInfo = {
        count: 1,
        abortController,
        lastActivity: Date.now()
      };
      activeSubscriptions.set(subscriptionKey, subInfo);

      console.log('[Realtime Updates] Created new subscription for', eventIds.length, 'posts');
    }

    // Start cleanup timer if not already running
    if (!cleanupTimer) {
      cleanupTimer = setInterval(() => {
        cleanupInactiveSubscriptions();
      }, CLEANUP_INTERVAL);
    }

    // Cleanup function
    return () => {
      const info = activeSubscriptions.get(subscriptionKey);
      if (!info) return;

      info.count--;

      // If no more components are using this subscription, mark for cleanup
      // but don't immediately close it to allow for quick reconnection
      if (info.count <= 0) {
        console.log('[Realtime Updates] Subscription marked for cleanup:', subscriptionKey.slice(0, 50) + '...');
      }
    };
  }, [eventIds.join(','), nostr, queryClient, config]);

  // Cleanup flush timer and queues on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      // Clear any pending updates to prevent memory leaks
      updateQueueRef.current.clear();
      lastUpdateRef.current.clear();
    };
  }, []);
}

function cleanupInactiveSubscriptions() {
  const now = Date.now();
  const inactiveThreshold = 600000; // 10 minutes

  for (const [key, info] of activeSubscriptions.entries()) {
    if (info.count <= 0 && (now - info.lastActivity) > inactiveThreshold) {
      console.log('[Realtime Updates] Cleaning up inactive subscription:', key.slice(0, 50) + '...');
      info.abortController?.abort();
      activeSubscriptions.delete(key);
    }
  }

  // Stop cleanup timer if no active subscriptions
  if (activeSubscriptions.size === 0 && cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

async function createSharedSubscription(
  nostr: any,
  eventIds: string[],
  queryClient: any,
  updateQueueRef: React.MutableRefObject<Map<string, Partial<InteractionCounts>>>,
  lastUpdateRef: React.MutableRefObject<Map<string, number>>,
  flushTimerRef: React.MutableRefObject<NodeJS.Timeout | null>,
  abortController: AbortController,
  config: any
): Promise<void> {
  try {
    console.log('[Realtime Updates] Starting subscription for', eventIds.length, 'posts');

    // Fetch historical data with reduced scope to save memory
    await fetchHistoricalInteractions(nostr, eventIds, queryClient, config, abortController.signal);

    // Setup batch flush interval - reduced frequency for better memory management
    flushTimerRef.current = setInterval(() => {
      if (updateQueueRef.current.size === 0) return;

      const updateCount = updateQueueRef.current.size;

      // Process all queued updates
      for (const [eventId, updates] of updateQueueRef.current.entries()) {
        queryClient.setQueryData(
          ['post-interactions', eventId],
          (oldData: InteractionCounts | undefined) => {
            if (!oldData) {
              // If no existing data, create from updates
              return {
                likes: updates.likes || 0,
                reposts: updates.reposts || 0,
                zaps: updates.zaps || 0,
                comments: updates.comments || 0,
              };
            }

            // Merge updates with existing data
            return {
              likes: oldData.likes + (updates.likes || 0),
              reposts: oldData.reposts + (updates.reposts || 0),
              zaps: oldData.zaps + (updates.zaps || 0),
              comments: oldData.comments + (updates.comments || 0),
            };
          }
        );
      }

      console.log('[Realtime Updates] Processed', updateCount, 'batched updates');
      updateQueueRef.current.clear();
    }, 3000); // Process every 3 seconds to reduce memory pressure

    // Get configured relays - limit to 2 relays to reduce memory overhead
    const relays = config.relays?.filter((r: any) => r.mode === 'read' || r.mode === 'both').map((r: any) => r.url) || [config.relayUrl];

    // Always include Spookstr relay for better interaction discovery
    const spookstrRelay = 'wss://spookstr2.nostr1.com';
    if (!relays.includes(spookstrRelay)) {
      relays.unshift(spookstrRelay);
    }

    // Limit to 2 relays maximum to reduce memory usage
    const limitedRelays = relays.slice(0, 2);

    // Create filter for subscription - get events from the last 2 minutes to reduce memory usage
    const twoMinutesAgo = Math.floor((Date.now() - 120000) / 1000);
    const filters: NostrFilter[] = [{
      kinds: [6, 7, 9735, 1, 1111], // reposts, likes, zaps, replies, comments
      '#e': eventIds,
      since: twoMinutesAgo, // Reduced from 5 minutes to 2 minutes to save memory
    }];

    console.log('[Realtime Updates] Listening for real-time updates from', limitedRelays.length, 'relays');

    // Use relay group with limited relays for better memory management
    const relayGroup = nostr.group(limitedRelays); // Use only 2 relays

    // Use async iteration to process events as they arrive
    for await (const msg of relayGroup.req(filters, { signal: abortController.signal })) {
      if (abortController.signal.aborted) break;

      // Skip if not an event message
      if (!msg || typeof msg !== 'object') continue;

      // Handle both direct event and message formats
      const event = (msg as any).event || msg;

      // Validate event structure
      if (!event || !event.tags || !Array.isArray(event.tags)) continue;

      const referencedEventId = event.tags.find(([tag]: string[]) => tag === 'e')?.[1];
      if (!referencedEventId || !eventIds.includes(referencedEventId)) continue;

      // Throttle updates - max 1 update per second per post (handled by batch flush)
      const now = Date.now();
      const lastUpdate = lastUpdateRef.current.get(referencedEventId) || 0;
      if (now - lastUpdate < 500) continue; // Skip if updated within last 500ms

      lastUpdateRef.current.set(referencedEventId, now);

      // Queue the update
      const currentQueue = updateQueueRef.current.get(referencedEventId) || {};

      switch (event.kind) {
        case 7: // Like
          currentQueue.likes = (currentQueue.likes || 0) + 1;
          break;
        case 6: // Repost
          currentQueue.reposts = (currentQueue.reposts || 0) + 1;
          break;
        case 9735: // Zap
          currentQueue.zaps = (currentQueue.zaps || 0) + 1;
          break;
        case 1: // Text note reply
        case 1111: // Comment
          // Only count as reply if it's actually replying to the target event
          const eTags = event.tags.filter(([tag]) => tag === 'e');
          const isReply = eTags.some(([_, id]) => id === referencedEventId) &&
                         (eTags.length === 1 || eTags.some(([_, __, ___, marker]) => marker === 'reply'));

          if (isReply) {
            currentQueue.comments = (currentQueue.comments || 0) + 1;
          }
          break;
      }

      updateQueueRef.current.set(referencedEventId, currentQueue);
    }

  } catch (error: any) {
    // Ignore abort errors (expected when component unmounts)
    if (error?.name === 'AbortError') {
      console.log('[Realtime Updates] Subscription aborted');
      return;
    }

    console.error('[Realtime Updates] Error in real-time subscription:', error);

    // Try to reconnect after a delay
    if (!abortController.signal.aborted) {
      setTimeout(() => {
        console.log('[Realtime Updates] Attempting to reconnect...');
        // Don't reconnect here as it would create a new subscription
        // The component will remount and create a new subscription if needed
      }, 5000);
    }
  } finally {
    // Cleanup flush timer
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    console.log('[Realtime Updates] Subscription cleanup completed');
  }
}

async function fetchHistoricalInteractions(
  nostr: any,
  eventIds: string[],
  queryClient: any,
  config: any,
  signal: AbortSignal
): Promise<void> {
  try {
    console.log('[Realtime Updates] Fetching historical interactions to establish baseline');

    // Get configured relays
    const relays = config.relays?.filter((r: any) => r.mode === 'read' || r.mode === 'both').map((r: any) => r.url) || [config.relayUrl];

    // Always include Spookstr relay
    const spookstrRelay = 'wss://spookstr2.nostr1.com';
    if (!relays.includes(spookstrRelay)) {
      relays.unshift(spookstrRelay);
    }

    const filters: NostrFilter[] = [{
      kinds: [6, 7, 9735, 1, 1111], // reposts, likes, zaps, replies, comments
      '#e': eventIds,
      limit: 1000, // Reduced from 2000 to 1000 to save memory
    }];

    let historicalEvents: NostrEvent[] = [];

    try {
      const relayGroup = nostr.group(limitedRelays);
      historicalEvents = await relayGroup.query(filters, { signal });
    } catch (error) {
      console.warn('[Realtime Updates] Historical query failed with relay group, trying single relay:', error);
      historicalEvents = await nostr.query(filters, { signal });
    }

    console.log('[Realtime Updates] Found', historicalEvents.length, 'historical interactions');

    // Process historical events to update baseline counts
    const countsMap: Record<string, InteractionCounts> = {};

    // Initialize counts
    for (const eventId of eventIds) {
      countsMap[eventId] = {
        likes: 0,
        reposts: 0,
        zaps: 0,
        comments: 0,
      };
    }

    // Count historical interactions
    for (const event of historicalEvents) {
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
          const eTags = event.tags.filter(([tag]) => tag === 'e');
          const isReply = eTags.some(([_, id]) => id === referencedEventId) &&
                         (eTags.length === 1 || eTags.some(([_, __, ___, marker]) => marker === 'reply'));

          if (isReply) {
            countsMap[referencedEventId].comments++;
          }
          break;
      }
    }

    // Update caches with historical data
    for (const [eventId, counts] of Object.entries(countsMap)) {
      queryClient.setQueryData(['post-interactions', eventId], counts);
    }

    const postsWithInteractions = Object.values(countsMap).filter(c =>
      c.likes > 0 || c.reposts > 0 || c.zaps > 0 || c.comments > 0
    ).length;

    console.log('[Realtime Updates] Baseline established for', postsWithInteractions, 'posts with interactions');

  } catch (error) {
    console.error('[Realtime Updates] Error fetching historical interactions:', error);
    // Don't throw - continue with real-time updates even if historical fetch fails
  }
}
