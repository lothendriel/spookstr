import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from './useCurrentUser';
import { useAppContext } from './useAppContext';
import { useUserRelays } from './useUserRelays';
import type { NostrEvent, NostrFilter } from '@nostrify/nostrify';
import { filterNSFWContent } from '@/lib/nsfwFilter';

// Shared subscription state to prevent multiple subscriptions
const activeNotificationSubscriptions = new Map<string, {
  count: number;
  abortController: AbortController | null;
}>();

/**
 * Real-time notifications hook using multi-relay approach.
 * Subscribes to interaction events across all configured relays to keep notifications up-to-date.
 * Features:
 * - Multi-relay coverage for comprehensive real-time updates
 * - Automatic deduplication across relays
 * - NSFW content filtering
 * - Shared subscriptions to prevent connection overload
 */
export function useRealtimeNotifications() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config, presetRelays = [] } = useAppContext();
  const { data: userRelayList } = useUserRelays(user?.pubkey);
  const queryClient = useQueryClient();
  const seenEventIds = useRef(new Set<string>());

  useEffect(() => {
    if (!user?.pubkey) return;

    // Get a reasonable relay list (limit excessive connections)
    const relaySet = new Set<string>();

    if (config.spookstrOnlyMode) {
      const spookstrRelay = config.relays?.find(r => r.url.includes('spookstr'));
      if (spookstrRelay) relaySet.add(spookstrRelay.url);
      else relaySet.add('wss://spookstr2.nostr1.com');
    } else {
      // Add user's configured read relays (limit to 5 for performance)
      if (config.relays) {
        config.relays
          .filter(r => r.mode === 'read' || r.mode === 'both')
          .slice(0, 5) // Limit to 5 relays max
          .forEach(r => relaySet.add(r.url));
      }

      // Add user's NIP-65 read relays only if we have few configured relays
      if (relaySet.size < 3 && userRelayList && userRelayList.length > 0) {
        userRelayList
          .filter(r => r.mode === 'read' || r.mode === 'both')
          .slice(0, 3 - relaySet.size) // Fill up to 3 total
          .forEach(r => relaySet.add(r.url));
      }

      // Add fallback relay if still none
      if (relaySet.size === 0) {
        relaySet.add(config.relayUrl || 'wss://relay.nostr.band');
      }
    }

    const notificationRelays = Array.from(relaySet);
    if (notificationRelays.length === 0) return;

    // Throttle subscription creation to prevent excessive reconnections
    const throttleKey = `throttle-${user.pubkey}`;
    const lastCreation = (window as any)[throttleKey] || 0;
    const now = Date.now();

    if (now - lastCreation < 10000) { // 10 second throttle
      console.log('[Real-time Notifications] Throttling subscription creation');
      return;
    }

    (window as any)[throttleKey] = now;

    // Create subscription key
    const subscriptionKey = `notifications-${user.pubkey}-${notificationRelays.sort().join(',')}`;

    // Check if subscription already exists
    let subInfo = activeNotificationSubscriptions.get(subscriptionKey);

    if (subInfo) {
      // Increment reference count
      subInfo.count++;
    } else {
      // Create new subscription
      const abortController = new AbortController();

      createNotificationSubscription(
        nostr,
        user.pubkey,
        notificationRelays,
        queryClient,
        seenEventIds,
        abortController
      );

      subInfo = { count: 1, abortController };
      activeNotificationSubscriptions.set(subscriptionKey, subInfo);
    }

    // Cleanup function
    return () => {
      const info = activeNotificationSubscriptions.get(subscriptionKey);
      if (!info) return;

      info.count--;

      // If no more components are using this subscription, close it
      if (info.count <= 0) {
        info.abortController?.abort();
        activeNotificationSubscriptions.delete(subscriptionKey);
      }
    };
  }, [
    user?.pubkey,
    nostr,
    queryClient,
    config.spookstrOnlyMode,
    // Stabilize dependencies to prevent excessive re-subscriptions
    config.relays?.length, // Only react to count changes, not order
    config.relayUrl
  ]);
}

async function createNotificationSubscription(
  nostr: any,
  userPubkey: string,
  notificationRelays: string[],
  queryClient: any,
  seenEventIds: React.MutableRefObject<Set<string>>,
  abortController: AbortController
): Promise<void> {
  console.log(`[Real-time Notifications] Starting subscription on ${notificationRelays.length} relays for user:`, userPubkey.slice(0, 8));

  try {
    // First, get user's posts to know what to watch for interactions
    let userPosts: NostrEvent[] = [];

    try {
      const relayGroup = nostr.group(notificationRelays);
      userPosts = await relayGroup.query([{
        kinds: [1],
        authors: [userPubkey],
        limit: 200 // Reduced from 500 for better performance
      }], { signal: abortController.signal });

      console.log(`[Real-time Notifications] Found ${userPosts.length} user posts to monitor`);
    } catch (error) {
      console.log('[Real-time Notifications] Relay group failed, trying fallback:', error.message);

      // Fallback: try with just the first relay
      try {
        const singleRelay = nostr.relay(notificationRelays[0]);
        userPosts = await singleRelay.query([{
          kinds: [1],
          authors: [userPubkey],
          limit: 200
        }], { signal: abortController.signal });

        console.log(`[Real-time Notifications] Fallback: Found ${userPosts.length} user posts`);
      } catch (fallbackError) {
        console.error('[Real-time Notifications] Fallback also failed:', fallbackError);
        return;
      }
    }

    const userPostIds = userPosts.map(post => post.id);
    if (userPostIds.length === 0) {
      console.log('[Real-time Notifications] No user posts to monitor');
      return;
    }

    // Create filter for new interactions
    const filters: NostrFilter[] = [{
      kinds: [1, 6, 7, 9735, 16], // comments, reposts, likes, zaps, generic reposts
      '#e': userPostIds,
      since: Math.floor(Date.now() / 1000), // Only new events from now
    }];

    // Handle incoming events
    const handleEvent = (event: NostrEvent) => {
      // Skip user's own interactions
      if (event.pubkey === userPubkey) return;

      // Deduplicate events across relays
      if (seenEventIds.current.has(event.id)) return;
      seenEventIds.current.add(event.id);

      // Filter NSFW content for comments
      if (event.kind === 1) {
        const passed = filterNSFWContent([event]).length > 0;
        if (!passed) return;
      }

      console.log('[Real-time Notifications] New interaction received:', {
        kind: event.kind,
        author: event.pubkey.slice(0, 8),
        content: event.content?.substring(0, 30) || '(no content)'
      });

      // Invalidate the notifications query to trigger a refetch
      queryClient.invalidateQueries({
        queryKey: ['notifications', userPubkey],
        exact: false,
      });

      // Optional: Update the notification bell count immediately
      // This could be enhanced to show a live count
    };

    // Subscribe to all relays
    try {
      const relayGroup = nostr.group(notificationRelays);
      for await (const msg of relayGroup.req(filters, { signal: abortController.signal })) {
        const event = (msg as any).event || msg;
        if (event) handleEvent(event);
      }
    } catch (groupError) {
      console.log('[Real-time Notifications] Relay group failed, trying fallback:', groupError);
      // Fallback to default nostr instance
      for await (const msg of nostr.req(filters, { signal: abortController.signal })) {
        const event = (msg as any).event || msg;
        if (event) handleEvent(event);
      }
    }

  } catch (error: any) {
    // Ignore abort errors (expected when component unmounts)
    if (error?.name === 'AbortError') return;
    console.error('[Real-time Notifications] Subscription error:', error);
  }
}