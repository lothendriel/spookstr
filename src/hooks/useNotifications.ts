import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from './useCurrentUser';
import { useAppContext } from './useAppContext';
import type { NostrEvent } from '@nostrify/nostrify';

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

  return useQuery({
    queryKey: ['notifications', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) {
        return [];
      }

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      // First, get all posts by the current user
      const userPosts = await nostr.query(
        [{ kinds: [1], authors: [user.pubkey], limit: 100 }],
        { signal }
      );

      const userPostIds = userPosts.map(post => post.id);

      if (userPostIds.length === 0) {
        return [];
      }

      // Use ALL selected relays for notifications
      const relayGroup = nostr.group(config.selectedRelays || [config.relayUrl]);

      // Query for all interactions with user's posts from ALL relays
      const interactions = await relayGroup.query(
        [
          {
            kinds: [1, 6, 7, 9735],
            '#e': userPostIds,
            limit: 200,
          }
        ],
        { signal }
      );

      // Filter out the user's own interactions
      const otherUserInteractions = interactions.filter(
        event => event.pubkey !== user.pubkey
      );

      // Deduplicate by event.id — multiple relays may return same event
      const uniqueInteractions = Array.from(
        new Map(otherUserInteractions.map(event => [event.id, event])).values()
      );

      // Convert to notifications
      const notifications: Notification[] = uniqueInteractions.map(event => {
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
      return notifications.sort((a, b) => b.timestamp - a.timestamp);
    },
    enabled: !!user?.pubkey,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
