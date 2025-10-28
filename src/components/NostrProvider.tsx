import React, { useEffect, useRef } from 'react';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { RelayConfig } from '@/contexts/AppContext';

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
  const relays = useRef<RelayConfig[]>([]);

  // Get read and write relays from config
  const getReadRelays = (): string[] => {
    if (config.relays && config.relays.length > 0) {
      return config.relays
        .filter((r) => r.mode === 'read' || r.mode === 'both')
        .map((r) => r.url);
    }
    // Fallback to legacy relayUrl
    return [config.relayUrl];
  };

  const getWriteRelays = (): string[] => {
    if (config.relays && config.relays.length > 0) {
      return config.relays
        .filter((r) => r.mode === 'write' || r.mode === 'both')
        .map((r) => r.url);
    }
    // Fallback to legacy relayUrl
    return [config.relayUrl];
  };

  // Update refs when config changes
  useEffect(() => {
    relays.current = config.relays || [{ url: config.relayUrl, mode: 'both' }];
    queryClient.resetQueries();
  }, [config.relays, config.relayUrl, queryClient]);

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        return new NRelay1(url);
      },
      reqRouter(filters) {
        const readRelays = getReadRelays();

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
          // For these important queries, use read relays plus preset relays for better data availability
          const relays = new Set<string>(readRelays);

          // Add preset relays for better discovery, capped at 5 total
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

        // For other queries (including main feed), use configured read relays
        const relayMap = new Map();
        for (const relayUrl of readRelays) {
          relayMap.set(relayUrl, filters);
        }
        return relayMap;
      },
      eventRouter(_event: NostrEvent) {
        const writeRelays = getWriteRelays();

        // Publish to configured write relays
        const allRelays = new Set<string>(writeRelays);

        // If we have very few write relays, add some preset relays for redundancy
        if (allRelays.size < 2) {
          for (const { url } of (presetRelays ?? [])) {
            allRelays.add(url);
            if (allRelays.size >= 3) break;
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