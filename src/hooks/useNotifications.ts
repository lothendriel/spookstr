import { useInfiniteQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from './useCurrentUser';
import { useAppContext } from './useAppContext';
import { useUserRelays } from './useUserRelays';
import { useNotificationDiscovery } from './useContextualRelayDiscovery';
import type { NostrEvent } from '@nostrify/nostrify';
import { filterNSFWContent } from '@/lib/nsfwFilter';
import { useEffect } from 'react';

export interface Notification {
  id: string;
  type: 'like' | 'repost' | 'zap' | 'comment';
  event: NostrEvent;
  timestamp: number;
  author: string;
  targetEventId: string;
  read: boolean;
}

// Cache for user posts to avoid refetching them on every notification check
const userPostsCache = new Map<string, { posts: NostrEvent[], timestamp: number }>();
const CACHE_DURATION = 300000; // 5 minutes

// Cleanup old cache entries to prevent memory leaks
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, value] of userPostsCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION * 2) {
      userPostsCache.delete(key);
    }
  }
};

// Run cleanup every 10 minutes
setInterval(cleanupCache, 600000);

export function useNotifications() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();

  // Fetch the user's NIP-65 relay list for inbox model
  const { data: userRelayList, isLoading: isLoadingRelays } = useUserRelays(user?.pubkey);

  // Use enhanced relay discovery for notifications
  const {
    events: enhancedNotifications,
    isLoading: isDiscovering,
    stats: discoveryStats
  } = useNotificationDiscovery(!!user?.pubkey);

  // Create a stable relay identifier for the query key
  const relayKey = config.spookstrOnlyMode
    ? 'spookstr-only'
    : config.relays?.filter(r => r.mode === 'read' || r.mode === 'both').map(r => r.url).sort().join(',') || config.relayUrl;

  const query = useInfiniteQuery({
    queryKey: ['notifications', user?.pubkey, relayKey, userRelayList?.length],
    queryFn: async ({ pageParam = undefined, signal: querySignal }) => {
      console.log('[Notifications] 🔔 Query function called', {
        pubkey: user?.pubkey?.slice(0, 8) + '...',
        pageParam,
        isInitialLoad: !pageParam
      });

      if (!user?.pubkey) {
        console.log('[Notifications] ❌ No user pubkey, returning empty');
        return { notifications: [], hasMore: false, oldestTimestamp: undefined };
      }

      const signal = AbortSignal.any([querySignal, AbortSignal.timeout(10000)]);

      // Get read relays using inbox model (NIP-65)
      let readRelays: string[];
      if (config.spookstrOnlyMode) {
        const spookstrRelay = config.relays?.find(r => r.url.includes('spookstr'));
        readRelays = spookstrRelay ? [spookstrRelay.url] : ['wss://spookstr2.nostr1.com'];
        console.log('[Notifications] 👻 Spookstr-only mode, using relay:', readRelays[0]);
      } else if (userRelayList && userRelayList.length > 0) {
        const nip65ReadRelays = userRelayList
          .filter(r => r.mode === 'read' || r.mode === 'both')
          .map(r => r.url);
        const configReadRelays = config.relays
          ?.filter(r => r.mode === 'read' || r.mode === 'both')
          .map(r => r.url) || [config.relayUrl];
        const relaySet = new Set([...nip65ReadRelays, ...configReadRelays]);
        readRelays = Array.from(relaySet);
        console.log('[Notifications] 📥 Using inbox model with user\'s NIP-65 read relays:', nip65ReadRelays.length);
      } else {
        readRelays = config.relays
          ?.filter(r => r.mode === 'read' || r.mode === 'both')
          .map(r => r.url) || [config.relayUrl];
        const relayStatus = isLoadingRelays ? ' (still loading, using defaults)' : ' (no user relays found)';
        console.log('[Notifications] 🔄 Using default relays' + relayStatus + ':', readRelays);
      }

      const relayGroup = readRelays.length > 0 ? nostr.group(readRelays) : nostr;
      console.log(`[Notifications] Querying ${readRelays.length} relays (spookstrOnly: ${config.spookstrOnlyMode}):`, readRelays);

      // **OPTIMIZATION 1: Cache user posts to avoid refetching every time**
      const cacheKey = `${user.pubkey}-${relayKey}`;
      const now = Date.now();
      const cached = userPostsCache.get(cacheKey);

      let userPosts: NostrEvent[];
      let userPostIds: string[];

      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        // Use cached posts
        userPosts = cached.posts;
        userPostIds = userPosts.map(post => post.id);
        console.log(`[Notifications] ♻️ Using ${userPosts.length} cached user posts`);
      } else {
        // Fetch fresh posts
        try {
          userPosts = await relayGroup.query(
            [{ kinds: [1], authors: [user.pubkey], limit: 300 }], // Reduced from 500 to 300
            { signal }
          );
          userPostIds = userPosts.map(post => post.id);

          // Cache the results
          userPostsCache.set(cacheKey, { posts: userPosts, timestamp: now });
          console.log(`[Notifications] 🔄 Fetched and cached ${userPosts.length} user posts`);
        } catch (error) {
          console.error('[Notifications] Error fetching user posts:', error);
          return { notifications: [], hasMore: false, oldestTimestamp: undefined };
        }
      }

      if (userPostIds.length === 0) {
        console.log('[Notifications] No user posts found, returning empty');
        return { notifications: [], hasMore: false, oldestTimestamp: undefined };
      }

      // **OPTIMIZATION 2: Use recent posts for initial load, all posts for pagination**
      let queryPostIds: string[];
      if (!pageParam) {
        // For initial load, only check interactions on recent posts (last 50)
        // This dramatically reduces query size for new notification checks
        const recentPosts = userPosts
          .sort((a, b) => b.created_at - a.created_at)
          .slice(0, 50);
        queryPostIds = recentPosts.map(post => post.id);
        console.log(`[Notifications] 🆕 Initial load: checking interactions on ${queryPostIds.length} recent posts`);
      } else {
        // For pagination, check all posts
        queryPostIds = userPostIds;
        console.log(`[Notifications] 📖 Pagination: checking interactions on all ${queryPostIds.length} posts`);
      }

      // Build query filter with pagination
      const filter: any = {
        kinds: [1, 6, 7, 9735, 16],
        '#e': queryPostIds,
        limit: 100, // Reduced from 200 for better performance
      };

      if (pageParam) {
        filter.until = pageParam;
      }

      // Query for interactions
      let interactions;
      try {
        interactions = await relayGroup.query([filter], { signal });
        console.log(`[Notifications] Found ${interactions.length} raw interactions from relays`);
      } catch (error) {
        console.error('[Notifications] Error fetching interactions:', error);
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
    // Always enable notifications when user is logged in
    // Use default relays initially if user's relay list is still loading
    enabled: !!user?.pubkey,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 60000, // Increased to 1 minute - reduce unnecessary refetches
    gcTime: 600000, // Increased to 10 minutes - keep data longer
    // **OPTIMIZATION 3: Smarter background refresh**
    refetchInterval: (data, query) => {
      if (document.hidden || !user?.pubkey) return false;

      // Only auto-refresh the first page to check for new notifications
      // Avoid refreshing all pages which would re-query everything
      const hasMultiplePages = data?.pages && data.pages.length > 1;
      if (hasMultiplePages) return false; // Don't auto-refresh when user has scrolled down

      return 120000; // 2 minutes for initial page only
    },
    // **OPTIMIZATION 4: Reduce window focus refetches**
    refetchOnWindowFocus: (query) => {
      if (!user?.pubkey || !query.state.data) return true;
      const lastUpdated = query.state.dataUpdatedAt;
      const fiveMinutesAgo = Date.now() - 300000; // Increased from 2 to 5 minutes
      return lastUpdated < fiveMinutesAgo;
    }
  });

  // Refetch notifications when user's relay list becomes available
  // This ensures we get more accurate results once we know the user's preferred relays
  useEffect(() => {
    if (user?.pubkey && !isLoadingRelays && userRelayList) {
      console.log('[Notifications] 🔄 User relay list loaded, refetching notifications');
      query.refetch();
    }
  }, [user?.pubkey, isLoadingRelays, userRelayList, query]);

  return query;
}
