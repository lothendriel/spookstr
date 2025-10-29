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

    // Get comprehensive relay list
    const relaySet = new Set<string>();

    if (config.spookstrOnlyMode) {
      const spookstrRelay = config.relays?.find(r => r.url.includes('spookstr'));
      if (spookstrRelay) relaySet.add(spookstrRelay.url);
      else relaySet.add('wss://spookstr2.nostr1.com');
    } else {
      // Add user's NIP-65 read relays (inbox model)
      if (userRelayList && userRelayList.length > 0) {
        userRelayList
          .filter(r => r.mode === 'read' || r.mode === 'both')
          .forEach(r => relaySet.add(r.url));
      }

      // Add ALL preset relays for maximum coverage
      presetRelays.forEach(r => relaySet.add(r.url));

      // Add configured relays as fallback
      if (config.relays) {
        config.relays
          .filter(r => r.mode === 'read' || r.mode === 'both')
          .forEach(r => relaySet.add(r.url));
      } else if (config.relayUrl) {
        relaySet.add(config.relayUrl);
      }
    }

    const notificationRelays = Array.from(relaySet);
    if (notificationRelays.length === 0) return;

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
    userRelayList?.length,
    presetRelays.map(r => r.url).join(','),
    config.relays?.map(r => r.url).join(','),
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
        limit: 500
      }], { signal: abortController.signal });
      
      console.log(`[Real-time Notifications] Found ${userPosts.length} user posts to monitor`);
    } catch (error) {
      console.error('[Real-time Notifications] Error fetching user posts:', error);
      return;
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