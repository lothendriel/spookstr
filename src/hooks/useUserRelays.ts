import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { NostrEvent } from '@nostrify/nostrify';
import { RelayConfig, RelayMode } from '@/contexts/AppContext';

/**
 * Fetch the user's NIP-65 relay list (kind 10002)
 */
export function useUserRelays(pubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['user-relays', pubkey],
    queryFn: async (c) => {
      if (!pubkey) return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      // Query for kind 10002 (NIP-65 relay list metadata)
      const events = await nostr.query(
        [
          {
            kinds: [10002],
            authors: [pubkey],
            limit: 1,
          },
        ],
        { signal }
      );

      if (events.length === 0) {
        return null;
      }

      // Get the most recent event (should only be one due to replaceable nature)
      const event = events[0];

      return parseRelayListEvent(event);
    },
    enabled: !!pubkey,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Parse a NIP-65 relay list event into RelayConfig array
 */
export function parseRelayListEvent(event: NostrEvent): RelayConfig[] {
  const relays: RelayConfig[] = [];

  // Extract all 'r' tags
  const rTags = event.tags.filter(([name]) => name === 'r');

  for (const tag of rTags) {
    const [, url, marker] = tag;

    if (!url) continue;

    let mode: RelayMode = 'both';
    if (marker === 'read') {
      mode = 'read';
    } else if (marker === 'write') {
      mode = 'write';
    }

    relays.push({
      url,
      mode,
    });
  }

  return relays;
}

/**
 * Create a NIP-65 relay list event from RelayConfig array
 */
export function createRelayListEvent(relays: RelayConfig[]): Partial<NostrEvent> {
  const tags: string[][] = [];

  for (const relay of relays) {
    if (relay.mode === 'both') {
      // Omit marker for both read and write
      tags.push(['r', relay.url]);
    } else {
      // Include marker for read-only or write-only
      tags.push(['r', relay.url, relay.mode]);
    }
  }

  return {
    kind: 10002,
    content: '',
    tags,
  };
}
