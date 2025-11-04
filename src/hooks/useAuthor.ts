import { type NostrEvent, type NostrMetadata, NSchema as n } from '@nostrify/nostrify';
import { useQuery } from '@tanstack/react-query';
import { useMultiRelayQuery } from './useMultiRelayQuery';

export function useAuthor(pubkey: string | undefined) {

  // Check localStorage for cached data
  let initialData;
  if (pubkey) {
    const cacheKey = `author-${pubkey}`;
    const cachedItem = localStorage.getItem(cacheKey);
    if (cachedItem) {
      try {
        initialData = JSON.parse(cachedItem);
      } catch {
        // Ignore invalid cache
      }
    }
  }

  // Get raw profile events from multiple relays
  const { data: rawProfileEvent, isLoading: isRawLoading, error: rawError } = useMultiRelayQuery({
    filters: [{
      kinds: [0],
      authors: [pubkey!],
      limit: 1,
    }],
    // Use high-performance relays for profile fetching
    relayUrls: [
      'wss://spookstr2.nostr1.com',
      'wss://relay.nostr.band',
      'wss://relay.damus.io',
      'wss://relay.primal.net',
      'wss://relay.mostr.pub'
    ],
    enabled: !!pubkey,
    staleTime: 900000, // 15 minutes - profiles change very infrequently
    gcTime: 1800000, // 30 minutes - keep profile data cached much longer
    retry: 2,
  });

  // Process and validate profile data
  return useQuery<{ event?: NostrEvent; metadata?: NostrMetadata }>({
    queryKey: ['author', 'processed', pubkey ?? ''],
    queryFn: () => {
      if (!pubkey || !rawProfileEvent || rawProfileEvent.length === 0) {
        console.log('[Author] No profile event found for pubkey:', pubkey?.slice(0, 8));
        return {};
      }

      const event = rawProfileEvent[0];
      console.log('[Author] Processing profile event for pubkey:', pubkey.slice(0, 8), 'from relay');

      try {
        const metadata = n.json().pipe(n.metadata()).parse(event.content);
        const result = { metadata, event };

        // Cache data in localStorage
        const cacheKey = `author-${pubkey}`;
        localStorage.setItem(cacheKey, JSON.stringify(result));

        console.log('[Author] Successfully parsed and cached profile for:', pubkey.slice(0, 8));
        return result;
      } catch (error) {
        console.warn('[Author] Failed to parse profile metadata for', pubkey.slice(0, 8), ':', error);
        // Return event without metadata if parsing fails
        return { event };
      }
    },
    initialData,
    enabled: !!pubkey && !!rawProfileEvent && rawProfileEvent.length > 0,
    staleTime: 900000, // 15 minutes - profiles change very infrequently
    gcTime: 1800000, // 30 minutes - keep profile data cached much longer
    // Enhanced caching: Very infrequent background refresh for profiles
    refetchInterval: (data, query) => {
      // Only refetch if tab is visible and we have data
      if (document.hidden || !data || !pubkey) return false;

      // Background refresh every 30 minutes for profile metadata
      // Profiles rarely change, so this is very conservative
      return 1800000; // 30 minutes
    },
    refetchOnWindowFocus: false, // Profiles don't need frequent updates
  });
}