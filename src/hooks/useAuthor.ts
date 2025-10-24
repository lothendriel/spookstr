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

      console.log('🔍 Fetching author profile for pubkey:', pubkey);

      const [event] = await nostr.query(
        [{ kinds: [0], authors: [pubkey!], limit: 1 }],
        {
          signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
        },
      );

      if (!event) {
        console.warn('⚠️ No profile event found for pubkey:', pubkey);
        return {};
      }

      console.log('✅ Profile event found for pubkey:', pubkey, 'Event ID:', event.id);

      try {
        const metadata = n.json().pipe(n.metadata()).parse(event.content);
        const result = { metadata, event };
        // Cache data in localStorage
        if (pubkey) {
          const cacheKey = `author-${pubkey}`;
          localStorage.setItem(cacheKey, JSON.stringify(result));
        }
        console.log('✅ Profile metadata parsed successfully for:', pubkey);
        return result;
      } catch (error) {
        console.error('❌ Failed to parse profile metadata for:', pubkey, error);
        // Return event without metadata if parsing fails
        return { event };
      }
    },
    initialData,
    retry: 3,
  });
}