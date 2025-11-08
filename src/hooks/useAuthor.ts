import { type NostrEvent, type NostrMetadata, NSchema as n } from '@nostrify/nostrify';
import type { AppUser } from '@/types';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export function useAuthor(pubkey: string | undefined) {
  const { nostr } = useNostr();

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

  return useQuery<{ event?: NostrEvent; metadata?: NostrMetadata }>({
    queryKey: queryKeys.author.details(pubkey ?? ''),
    queryFn: async ({ signal }) => {
      if (!pubkey) {
        return {};
      }

      const [event] = await nostr.query(
        [{ kinds: [0], authors: [pubkey!], limit: 1 }],
        {
          signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]),
        },
      );

      if (!event) {
        return {};
      }

      try {
        const metadata = n.json().pipe(n.metadata()).parse(event.content);
        const result = { metadata, event };
        // Cache data in localStorage
        if (pubkey) {
          const cacheKey = `author-${pubkey}`;
          localStorage.setItem(cacheKey, JSON.stringify(result));
        }
        return result;
      } catch {
        // Return event without metadata if parsing fails
        return { event };
      }
    },
    initialData,
    enabled: !!pubkey,
    retry: 1,
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