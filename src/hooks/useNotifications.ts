import { useInfiniteQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from './useCurrentUser';
import { useAppContext } from './useAppContext';
import type { NostrEvent } from '@nostrify/nostrify';
import { filterNSFWContent } from '@/lib/nsfwFilter';

export interface Notification {
  id: string;
  type: 'like' | 'repost' | 'zap' | 'comment';
  event: NostrEvent;
  timestamp: number;
  author: string;
  targetEventId: string;
  read: boolean;
}

export function useNotifications() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();

  return useInfiniteQuery({
    queryKey: ['notifications', user?.pubkey],
    queryFn: async ({ pageParam = undefined, signal: querySignal }) => {
      if (!user?.pubkey) {
        return { notifications: [], hasMore: false, oldestTimestamp: undefined };
      }

      const signal = AbortSignal.any([querySignal, AbortSignal.timeout(5000)]);

      // First, get user posts (increase limit to catch more)
      const userPosts = await nostr.query(
        [{ kinds: [1], authors: [user.pubkey], limit: 500 }],
        { signal }
      );

      const userPostIds = userPosts.map(post => post.id);

      if (userPostIds.length === 0) {
        return { notifications: [], hasMore: false, oldestTimestamp: undefined };
      }

      // Get read relays from config
      const readRelays = config.relays
        ?.filter(r => r.mode === 'read' || r.mode === 'both')
        .map(r => r.url) || [config.relayUrl];

      // Use all read relays for notifications
      const relayGroup = readRelays.length > 0 ? nostr.group(readRelays) : nostr;

      // Build query filter with pagination
      const filter: any = {
        kinds: [1, 6, 7, 9735],
        '#e': userPostIds,
        limit: 100, // Load 100 interactions at a time
      };

      // Add pagination using until timestamp
      if (pageParam) {
        filter.until = pageParam;
      }

      // Query for interactions with user's posts from ALL read relays
      const interactions = await relayGroup.query([filter], { signal });

      // Filter out the user's own interactions
      const otherUserInteractions = interactions.filter(
        event => event.pubkey !== user.pubkey
      );

      // Deduplicate by event.id — multiple relays may return same event
      const uniqueInteractions = Array.from(
        new Map(otherUserInteractions.map(event => [event.id, event])).values()
      );

      // Filter out NSFW content from comments (kind 1 events only)
      const filteredInteractions = uniqueInteractions.filter(event => {
        // Only filter kind 1 events (comments) - other kinds (likes, reposts, zaps) are metadata
        if (event.kind === 1) {
          return !filterNSFWContent([event]).length === 0; // Keep if not NSFW
        }
        return true; // Keep all other interaction types
      });

      // Convert to notifications
      const notifications: Notification[] = filteredInteractions.map(event => {
        let type: Notification['type'];

        if (event.kind === 7) {
          type = 'like';
        } else if (event.kind === 6) {
          type = 'repost';
        } else if (event.kind === 9735) {
          type = 'zap';
        } else {
          type = 'comment';
        }

        // Get the target event ID from the 'e' tag
        const targetEventId = event.tags.find(tag => tag[0] === 'e')?.[1] || '';

        return {
          id: event.id,
          type,
          event,
          timestamp: event.created_at,
          author: event.pubkey,
          targetEventId,
          read: false, // We'll manage read state in localStorage
        };
      });

      // Sort by timestamp (newest first)
      const sortedNotifications = notifications.sort((a, b) => b.timestamp - a.timestamp);

      // Determine if there are more notifications to load
      const hasMore = sortedNotifications.length === 100; // If we got full limit, there might be more
      const oldestTimestamp = sortedNotifications.length > 0
        ? sortedNotifications[sortedNotifications.length - 1].timestamp
        : undefined;

      return {
        notifications: sortedNotifications,
        hasMore,
        oldestTimestamp,
      };
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      // Return the oldest timestamp for pagination
      return lastPage.hasMore ? lastPage.oldestTimestamp : undefined;
    },
    enabled: !!user?.pubkey,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
