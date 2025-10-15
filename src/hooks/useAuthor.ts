import { type NostrEvent, type NostrMetadata, NSchema as n } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

export function useAuthor(pubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery<{ event?: NostrEvent; metadata?: NostrMetadata }>({
    queryKey: ['author', pubkey ?? ''],
    queryFn: async ({ signal }) => {
      if (!pubkey) {
        return {};
      }

      const [event] = await nostr.query(
        [{ kinds: [0], authors: [pubkey!], limit: 1 }],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(1500)]) },
      );

      if (!event) {
        // Return empty object instead of throwing error when no metadata event is found
        // This allows components to handle missing metadata gracefully
        return {};
      }

      try {
        const metadata = n.json().pipe(n.metadata()).parse(event.content);
        return { metadata, event };
      } catch {
        // Return event without metadata if parsing fails
        return { event };
      }
    },
    retry: 3,
  });
}
