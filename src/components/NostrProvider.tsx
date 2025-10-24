import React, { useEffect, useRef } from 'react';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

interface NostrProviderProps {
  children: React.ReactNode;
}

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config, presetRelays } = useAppContext();

  const queryClient = useQueryClient();

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);

  // Use refs so the pool always has the latest data
  const relayUrl = useRef<string>(config.relayUrl);

  // Update refs when config changes
  useEffect(() => {
    relayUrl.current = config.relayUrl;
    queryClient.resetQueries();
  }, [config.relayUrl, queryClient]);

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        return new NRelay1(url);
      },
      reqRouter(filters) {
        // For profile metadata (kind 0) and contact lists (kind 3), query from multiple relays
        const needsMultiRelayQuery = filters.some(filter =>
          filter.kinds?.some(kind => [0, 3].includes(kind))
        );

        if (needsMultiRelayQuery) {
          const multiRelays = new Set<string>([relayUrl.current]);

          // Add preset relays for important queries, but limit to prevent too many requests
          for (const { url } of (presetRelays ?? [])) {
            multiRelays.add(url);
            if (multiRelays.size >= 3) { // Limit to 3 relays for important queries
              break;
            }
          }

          const kinds = filters.flatMap(f => f.kinds || []);
          console.log(`🔍 Querying kinds [${kinds.join(', ')}] from multiple relays:`, [...multiRelays]);
          return new Map([...multiRelays].map(url => [url, filters]));
        }

        // For all other queries, use only the selected relay
        return new Map([[relayUrl.current, filters]]);
      },
      eventRouter(_event: NostrEvent) {
        // Publish to the selected relay
        const allRelays = new Set<string>([relayUrl.current]);

        // Also publish to the preset relays, capped to 5
        for (const { url } of (presetRelays ?? [])) {
          allRelays.add(url);

          if (allRelays.size >= 5) {
            break;
          }
        }

        return [...allRelays];
      },
    });
  }

  return (
    <NostrContext.Provider value={{ nostr: pool.current }}>
      {children}
    </NostrContext.Provider>
  );
};

export default NostrProvider;