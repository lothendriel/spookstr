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

  // Create a stable relay identifier for the query key
  const relayKey = config.spookstrOnlyMode
    ? 'spookstr-only'
    : config.relays?.filter(r => r.mode === 'read' || r.mode === 'both').map(r => r.url).sort().join(',') || config.relayUrl;

  return useInfiniteQuery({
    queryKey: ['notifications', user?.pubkey, relayKey],
    queryFn: async ({ pageParam = undefined, signal: querySignal }) => {
      console.log('[Notifications] 🔔 Query function called', {
        pubkey: user?.pubkey?.slice(0, 8) + '...',
        pageParam
      });

      if (!user?.pubkey) {
        console.log('[Notifications] ❌ No user pubkey, returning empty');
        return { notifications: [], hasMore: false, oldestTimestamp: undefined };
      }

      const signal = AbortSignal.any([querySignal, AbortSignal.timeout(10000)]); // Increased to 10s for multiple relays

      // Get read relays from config, respecting spookstrOnlyMode
      let readRelays: string[];
      if (config.spookstrOnlyMode) {
        // Only use Spookstr relay in spookstrOnlyMode
        const spookstrRelay = config.relays?.find(r => r.url.includes('spookstr'));
        readRelays = spookstrRelay ? [spookstrRelay.url] : ['wss://spookstr2.nostr1.com'];
      } else {
        // Use all configured read relays
        readRelays = config.relays
          ?.filter(r => r.mode === 'read' || r.mode === 'both')
          .map(r => r.url) || [config.relayUrl];
      }

      // Use all read relays for queries
      const relayGroup = readRelays.length > 0 ? nostr.group(readRelays) : nostr;

      console.log(`[Notifications] Querying ${readRelays.length} relays (spookstrOnly: ${config.spookstrOnlyMode}):`, readRelays);

      // First, get user posts from ALL relays (increase limit to catch more)
      let userPosts;
      try {
        userPosts = await relayGroup.query(
          [{ kinds: [1], authors: [user.pubkey], limit: 500 }],
          { signal }
        );
        console.log(`[Notifications] Found ${userPosts.length} user posts`);
      } catch (error) {
        console.error('[Notifications] Error fetching user posts:', error);
        // Return empty on error - query will retry automatically
        return { notifications: [], hasMore: false, oldestTimestamp: undefined };
      }

      const userPostIds = userPosts.map(post => post.id);

      if (userPostIds.length === 0) {
        console.log('[Notifications] No user posts found, returning empty');
        return { notifications: [], hasMore: false, oldestTimestamp: undefined };
      }

      // Build query filter with pagination
      const filter: any = {
        kinds: [1, 6, 7, 9735, 16], // 1=comment, 6=repost, 7=like, 9735=zap, 16=generic repost
        '#e': userPostIds,
        limit: 200, // Load more to ensure we have enough after deduplication
      };

      // Add pagination using until timestamp
      if (pageParam) {
        filter.until = pageParam;
      }

      // Query for interactions with user's posts from ALL read relays
      let interactions;
      try {
        interactions = await relayGroup.query([filter], { signal });
        console.log(`[Notifications] Found ${interactions.length} raw interactions from relays`);
      } catch (error) {
        console.error('[Notifications] Error fetching interactions:', error);
        // Return empty on error - query will retry automatically
        return { notifications: [], hasMore: false, oldestTimestamp: undefined };
      }

      // Filter out the user's own interactions
      const otherUserInteractions = interactions.filter(
        event => event.pubkey !== user.pubkey
      );

      console.log(`[Notifications] ${otherUserInteractions.length} interactions from other users`);

      // Deduplicate by event.id — multiple relays may return same event
      const uniqueInteractions = Array.from(
        new Map(otherUserInteractions.map(event => [event.id, event])).values()
      );

      console.log(`[Notifications] ${uniqueInteractions.length} unique interactions after deduplication`);

      // Count kind 1 events before filtering
      const kind1Before = uniqueInteractions.filter(e => e.kind === 1).length;
      console.log(`[Notifications] ${kind1Before} kind 1 events (comments) before NSFW filter`);

      // Filter out NSFW content from comments (kind 1 events only)
      const filteredInteractions = uniqueInteractions.filter(event => {
        // Only filter kind 1 events (comments) - other kinds (likes, reposts, zaps) are metadata
        if (event.kind === 1) {
          // filterNSFWContent returns non-NSFW events, so length > 0 means it passed
          const passed = filterNSFWContent([event]).length > 0;
          if (!passed) {
            console.log('[Notifications] ❌ Filtered out NSFW comment:', event.content.substring(0, 50));
          }
          return passed; // Keep if not NSFW
        }
        return true; // Keep all other interaction types
      });

      const kind1After = filteredInteractions.filter(e => e.kind === 1).length;
      console.log(`[Notifications] ${kind1After} kind 1 events (comments) after NSFW filter (filtered ${kind1Before - kind1After})`);
      console.log(`[Notifications] ${filteredInteractions.length} total interactions after NSFW filter`);

      // Log breakdown by type
      const breakdown = filteredInteractions.reduce((acc, event) => {
        acc[event.kind] = (acc[event.kind] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      console.log('[Notifications] Event types:', breakdown);

      // Convert to notifications
      const notifications: Notification[] = filteredInteractions.map(event => {
        let type: Notification['type'];

        if (event.kind === 7) {
          type = 'like';
        } else if (event.kind === 6 || event.kind === 16) {
          type = 'repost';
        } else if (event.kind === 9735) {
          type = 'zap';
        } else {
          type = 'comment';
        }

        // Get the target event ID from the 'e' tags
        // For comments, find the 'root' marker tag, or fallback to first e tag
        const eTags = event.tags.filter(tag => tag[0] === 'e');
        let targetEventId = '';

        if (eTags.length > 0) {
          // Look for root marker
          const rootTag = eTags.find(tag => tag[3] === 'root');
          if (rootTag) {
            targetEventId = rootTag[1];
          } else {
            // Find which of our posts this references
            const matchingTag = eTags.find(tag => userPostIds.includes(tag[1]));
            targetEventId = matchingTag ? matchingTag[1] : eTags[0][1];
          }
        }

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

      // Return only 10 notifications per page
      const pageSize = 10;
      const paginatedNotifications = sortedNotifications.slice(0, pageSize);

      // Determine if there are more notifications to load
      const hasMore = sortedNotifications.length >= pageSize;
      const oldestTimestamp = paginatedNotifications.length > 0
        ? paginatedNotifications[paginatedNotifications.length - 1].timestamp - 1 // Subtract 1 to avoid duplicates
        : undefined;

      console.log(`[Notifications] Returning ${paginatedNotifications.length} notifications, hasMore: ${hasMore}`);

      return {
        notifications: paginatedNotifications,
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
    retry: 2, // Retry failed queries up to 2 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}
