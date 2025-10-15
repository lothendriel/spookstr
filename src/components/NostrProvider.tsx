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
    const previousUrl = relayUrl.current;
    relayUrl.current = config.relayUrl;

    if (previousUrl !== config.relayUrl) {
      // Reset queries when relay changes
      queryClient.resetQueries();
    }
  }, [config.relayUrl, queryClient]);

  // Initialize NPool with enhanced routing
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        return new NRelay1(url);
      },
      reqRouter(filters) {
        // Use current relay for reading, but have fallback strategy
        const primaryRelay = relayUrl.current;
        const fallbackRelays = presetRelays?.slice(0, 2).map(r => r.url) || [];

        const relayMap = new Map();
        relayMap.set(primaryRelay, filters);

        // Add fallback relays with the same filters
        fallbackRelays.forEach(relay => {
          relayMap.set(relay, filters);
        });

        return relayMap;
      },
      eventRouter(event: NostrEvent) {
        // Smart publishing strategy
        const allRelays = new Set<string>();

        // Always try to publish to the current relay
        allRelays.add(relayUrl.current);

        // Add preset relays
        const presetUrls = presetRelays?.map(r => r.url) || [];
        presetUrls.forEach(url => allRelays.add(url));

        // For important events (like zaps, profile updates), publish to more relays
        const isImportantEvent = [0, 1, 3, 9735].includes(event.kind);
        if (isImportantEvent) {
          // Add additional well-known relays for important events
          const importantRelays = [
            'wss://relay.damus.io',
            'wss://nos.lol',
            'wss://relay.nostr.band'
          ];
          importantRelays.forEach(url => allRelays.add(url));
        }

        return Array.from(allRelays).slice(0, 8); // Cap at 8 relays
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