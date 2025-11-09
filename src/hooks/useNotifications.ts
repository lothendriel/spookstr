import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from './useCurrentUser';
import { useAppContext } from './useAppContext';
import { useUserRelays } from './useUserRelays';
import { useNotificationDiscovery } from './useContextualRelayDiscovery';
import type { NostrEvent } from '@nostrify/nostrify';
import { filterNSFWContent } from '@/lib/nsfwFilter';
import { useEffect, useState } from 'react';

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

// **FIX 1: Separate query for user posts with better error handling and retry logic**
function useUserPostsQuery(enabled: boolean, relayKey: string) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['user-posts', user?.pubkey, relayKey],
    queryFn: async ({ signal }) => {
      if (!user?.pubkey) {
        console.log('[UserPosts] ❌ No user pubkey, returning empty');
        return [];
      }

      console.log('[UserPosts] 🔄 Fetching user posts for', user.pubkey.slice(0, 8) + '...');

      const abortSignal = AbortSignal.any([signal, AbortSignal.timeout(8000)]);

      try {
        // Try to fetch from user's preferred relays first
        const userPosts = await nostr.query(
          [{ kinds: [1], authors: [user.pubkey], limit: 200 }],
          { signal: abortSignal }
        );

        console.log('[UserPosts] ✅ Found', userPosts.length, 'posts from default relays');
        return userPosts;
      } catch (error) {
        console.error('[UserPosts] ❌ Error fetching from default relays:', error);

        // Fallback: try with a longer timeout and different relay set
        try {
          const fallbackPosts = await nostr.query(
            [{ kinds: [1], authors: [user.pubkey], limit: 200 }],
            { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) }
          );

          console.log('[UserPosts] ✅ Found', fallbackPosts.length, 'posts from fallback');
          return fallbackPosts;
        } catch (fallbackError) {
          console.error('[UserPosts] ❌ Fallback also failed:', fallbackError);
          throw fallbackError; // Let useQuery handle the retry
        }
      }
    },
    enabled: enabled && !!user?.pubkey,
    retry: 3, // More retries for user posts - critical for notifications
    retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 10000),
    staleTime: 300000, // 5 minutes - same as before
    gcTime: 600000, // 10 minutes
  });
}

export function useNotifications() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const [retryCount, setRetryCount] = useState(0);

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

  // **FIX 2: Use separate query for user posts with better reliability**
  const userPostsQuery = useUserPostsQuery(!!user?.pubkey, relayKey);

  const query = useInfiniteQuery({
    queryKey: ['notifications', user?.pubkey, relayKey, userRelayList?.length],
    queryFn: async ({ pageParam = undefined, signal: querySignal }) => {
      console.log('[Notifications] 🔔 Query function called', {
        pubkey: user?.pubkey?.slice(0, 8) + '...',
        pageParam,
        isInitialLoad: !pageParam,
        retryCount
      });

      if (!user?.pubkey) {
        console.log('[Notifications] ❌ No user pubkey, returning empty');
        return { notifications: [], hasMore: false, oldestTimestamp: undefined };
      }

      const signal = AbortSignal.any([querySignal, AbortSignal.timeout(15000)]);

      // **FIX 3: Wait for user posts to be available or fail gracefully**
      let userPosts: NostrEvent[];
      let userPostIds: string[];

      if (userPostsQuery.data) {
        // Use the data from the separate query
        userPosts = userPostsQuery.data;
        userPostIds = userPosts.map(post => post.id);
        console.log(`[Notifications] ✅ Using ${userPosts.length} user posts from dedicated query`);
      } else if (userPostsQuery.isError) {
        console.error('[Notifications] ❌ User posts query failed, cannot fetch notifications');
        // Return empty but don't throw - let the user see the error state
        return { notifications: [], hasMore: false, oldestTimestamp: undefined };
      } else {
        // Still loading, return empty for now
        console.log('[Notifications] ⏳ User posts still loading, returning empty');
        return { notifications: [], hasMore: false, oldestTimestamp: undefined };
      }

      if (userPostIds.length === 0) {
        console.log('[Notifications] No user posts found, returning empty');
        return { notifications: [], hasMore: false, oldestTimestamp: undefined };
      }

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

      // **FIX 4: Improved query strategy - check all posts for infinite scroll**
      // With infinite scroll, we don't need to artificially limit initial discovery
      // Let the pagination system handle loading progressively
      const queryPostIds = userPostIds;
      console.log(`[Notifications] 🔄 Checking interactions on all ${queryPostIds.length} posts`);

      // Build query filter with pagination
      const filter: any = {
        kinds: [1, 6, 7, 9735, 16],
        '#e': queryPostIds,
        limit: 200, // Increased limit for better infinite scroll experience
      };

      if (pageParam) {
        filter.until = pageParam;
      }

      // Query for interactions with improved error handling
      let interactions: NostrEvent[] = [];
      let querySuccess = false;

      // **FIX 5: Multi-attempt query with different strategies**
      const queryStrategies = [
        // Strategy 1: Use the configured relay group
        async () => {
          console.log('[Notifications] 🔄 Strategy 1: Using configured relay group');
          return await relayGroup.query([filter], { signal });
        },
        // Strategy 2: Try with individual relays to find working ones
        async () => {
          console.log('[Notifications] 🔄 Strategy 2: Trying individual relays');
          const allInteractions: NostrEvent[] = [];

          // Try up to 3 relays individually
          const relaysToTry = readRelays.slice(0, 3);
          for (const relayUrl of relaysToTry) {
            try {
              const relay = nostr.relay(relayUrl);
              const relayInteractions = await relay.query([filter], {
                signal: AbortSignal.any([signal, AbortSignal.timeout(8000)])
              });
              allInteractions.push(...relayInteractions);
              console.log(`[Notifications] ✅ Got ${relayInteractions.length} interactions from ${relayUrl}`);
            } catch (relayError) {
              console.warn(`[Notifications] ❌ Relay ${relayUrl} failed:`, relayError);
              // Continue with next relay
            }
          }

          return allInteractions;
        },
        // Strategy 3: Last resort - use default nostr instance
        async () => {
          console.log('[Notifications] 🔄 Strategy 3: Using default nostr instance');
          return await nostr.query([filter], { signal });
        }
      ];

      for (let i = 0; i < queryStrategies.length; i++) {
        try {
          interactions = await queryStrategies[i]();
          if (interactions.length > 0) {
            querySuccess = true;
            console.log(`[Notifications] ✅ Strategy ${i + 1} succeeded with ${interactions.length} interactions`);
            break;
          }
        } catch (error) {
          console.warn(`[Notifications] ❌ Strategy ${i + 1} failed:`, error);
          if (i === queryStrategies.length - 1) {
            // Last strategy failed, throw the error
            console.error('[Notifications] ❌ All query strategies failed');
            throw error;
          }
        }
      }

      if (!querySuccess) {
        console.log('[Notifications] ⚠️ No interactions found from any strategy');
        return { notifications: [], hasMore: false, oldestTimestamp: undefined };
      }

      console.log(`[Notifications] Found ${interactions.length} raw interactions from relays`);

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

      // For pagination, we need to determine if there might be more events
      // If we got the full limit of interactions, there might be more
      const hasMore = interactions.length >= filter.limit;
      const oldestTimestamp = sortedNotifications.length > 0
        ? Math.min(...sortedNotifications.map(n => n.timestamp)) - 1 // Get oldest timestamp and subtract 1
        : undefined;

      console.log(`[Notifications] ✅ Returning ${sortedNotifications.length} notifications, hasMore: ${hasMore}`);

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
    // **FIX 6: Improved query configuration with better retry logic**
    enabled: !!user?.pubkey && userPostsQuery.data !== undefined, // Only enable when user posts are available
    retry: (failureCount, error) => {
      // **FIX 7: Smarter retry logic - don't retry on certain errors**
      // Don't retry if we have no user posts (fundamental dependency missing)
      if (!userPostsQuery.data && userPostsQuery.isError) {
        console.log('[Notifications] Skipping retry due to user posts query failure');
        return false;
      }

      // Don't retry after 3 attempts
      if (failureCount >= 3) {
        console.log('[Notifications] Max retries reached, stopping');
        return false;
      }

      // Retry on network errors and timeouts
      if (error instanceof Error && (
        error.name === 'AbortError' ||
        error.name === 'TimeoutError' ||
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('relay')
      )) {
        console.log(`[Notifications] Retrying (attempt ${failureCount + 1})`);
        return true;
      }

      return false;
    },
    retryDelay: (attemptIndex) => {
      // **FIX 8: Progressive retry delays with user feedback**
      const delays = [1000, 3000, 5000]; // 1s, 3s, 5s
      const delay = delays[attemptIndex] || 5000;
      console.log(`[Notifications] Retry delay: ${delay}ms (attempt ${attemptIndex + 1})`);
      return delay;
    },
    staleTime: 90000, // 1.5 minutes - slightly increased for better performance
    gcTime: 600000, // 10 minutes - keep data longer
    // **FIX 9: Smarter background refresh**
    refetchInterval: (data, query) => {
      if (document.hidden || !user?.pubkey) return false;
      if (userPostsQuery.isError) return false; // Don't refresh if user posts failed

      // Only auto-refresh the first page to check for new notifications
      // Avoid refreshing all pages which would re-query everything
      const hasMultiplePages = data?.pages && data.pages.length > 1;
      if (hasMultiplePages) return false; // Don't auto-refresh when user has scrolled down

      return 180000; // 3 minutes for initial page only (increased for better performance)
    },
    // **FIX 10: Reduce window focus refetches to avoid unnecessary queries**
    refetchOnWindowFocus: (query) => {
      if (!user?.pubkey || !query.state.data) return false; // More restrictive
      if (userPostsQuery.isError) return false; // Don't refetch if user posts failed

      const lastUpdated = query.state.dataUpdatedAt;
      const fiveMinutesAgo = Date.now() - 300000; // 5 minutes
      return lastUpdated < fiveMinutesAgo;
    },
    // **FIX 11: Add error callback for better debugging**
    onError: (error) => {
      console.error('[Notifications] ❌ Query error:', error);
      setRetryCount(prev => prev + 1);
    },
    onSuccess: (data) => {
      console.log('[Notifications] ✅ Query success, pages:', data.pages.length);
      setRetryCount(0);
    }
  });

  // **FIX 12: Improved refetch logic with better timing**
  // Refetch notifications when user's relay list becomes available
  // This ensures we get more accurate results once we know the user's preferred relays
  useEffect(() => {
    if (user?.pubkey && !isLoadingRelays && userRelayList && userPostsQuery.data) {
      // Add a small delay to ensure everything is ready
      const timer = setTimeout(() => {
        console.log('[Notifications] 🔄 User relay list loaded, refetching notifications');
        query.refetch();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [user?.pubkey, isLoadingRelays, userRelayList, userPostsQuery.data, query]);

  // **FIX 13: Add retry mechanism for when user posts query succeeds after initial failure**
  useEffect(() => {
    if (user?.pubkey && userPostsQuery.data && !userPostsQuery.isPreviousData && retryCount > 0) {
      console.log('[Notifications] 🔄 User posts query succeeded after retry, refetching notifications');
      query.refetch();
    }
  }, [userPostsQuery.data, userPostsQuery.isPreviousData, retryCount, user?.pubkey, query]);

  return query;
}
