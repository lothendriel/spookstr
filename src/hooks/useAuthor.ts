import { type NostrEvent, type NostrMetadata, NSchema as n } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

export function useAuthor(pubkey: string | undefined) {
  const { nostr } = useNostr();

  // Check localStorage for cached data
  let initialData;
  if (pubkey) {
    const cacheKey = `author-${pubkey}`;
    const cachedItem = localStorage.getItem(cacheKey);
    if (cachedItem) {
      initialData = JSON.parse(cachedItem);
    }
  }

  return useQuery<{ event?: NostrEvent; metadata?: NostrMetadata }>({
    queryKey: ['author', pubkey ?? ''],
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
    retry: 3,
  });
}