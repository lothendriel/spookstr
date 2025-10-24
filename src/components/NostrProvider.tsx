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
        // For profile metadata, community definitions, and interaction events with specific event references, query multiple relays
        const isMultiRelayQuery = filters.some(filter =>
          filter.kinds?.includes(0) || // Profile metadata
          filter.kinds?.includes(10000) || // Contact list
          filter.kinds?.includes(10002) || // Relay list
          filter.kinds?.includes(34550) || // Community definitions
          (filter.kinds?.includes(6) && filter['#e']) || // Reposts with event reference
          (filter.kinds?.includes(7) && filter['#e']) || // Likes with event reference
          (filter.kinds?.includes(9735) && filter['#e']) || // Zap receipts with event reference
          (filter.kinds?.includes(1) && filter['#e']) || // Text note replies with event reference
          (filter.kinds?.includes(1111) && filter['#e']) // Comments with event reference
        );

        if (isMultiRelayQuery) {
          // For these important queries, use the selected relay plus preset relays for better data availability
          const relays = new Set<string>([relayUrl.current]);

          // Add preset relays, capped at 5 total
          for (const { url } of (presetRelays ?? [])) {
            relays.add(url);
            if (relays.size >= 5) break;
          }

          const relayMap = new Map();
          for (const relayUrl of relays) {
            relayMap.set(relayUrl, filters);
          }
          return relayMap;
        }

        // For other queries (including main feed), use only the selected relay
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