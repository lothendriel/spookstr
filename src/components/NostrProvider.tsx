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
    console.log('🔄 Relay changed to:', config.relayUrl);
  }, [config.relayUrl, queryClient]);

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        console.log('🔗 Opening connection to relay:', url);
        return new NRelay1(url);
      },
      reqRouter(filters) {
        const kinds = filters.flatMap(f => f.kinds || []);
        console.log(`🔍 Routing query for kinds [${kinds.join(', ')}]`);

        // For profile metadata (kind 0) and contact lists (kind 3), query from multiple relays
        const needsMultiRelayQuery = filters.some(filter =>
          filter.kinds?.some(kind => [0, 3].includes(kind))
        );

        // For feed queries (kind 1 with tags), also try multiple relays for better results
        const isFeedQuery = filters.some(filter =>
          filter.kinds?.includes(1) && filter['#t']
        );

        if (needsMultiRelayQuery || isFeedQuery) {
          const multiRelays = new Set<string>([relayUrl.current]);

          // Add preset relays for important queries, but limit to prevent too many requests
          for (const { url } of (presetRelays ?? [])) {
            multiRelays.add(url);
            if (multiRelays.size >= (needsMultiRelayQuery ? 3 : 2)) { // Limit relays
              break;
            }
          }

          console.log(`🔍 Querying kinds [${kinds.join(', ')}] from multiple relays:`, [...multiRelays]);
          return new Map([...multiRelays].map(url => [url, filters]));
        }

        // For all other queries, use only the selected relay
        console.log(`🔍 Querying kinds [${kinds.join(', ')}] from single relay:`, relayUrl.current);
        return new Map([[relayUrl.current, filters]]);
      },
      eventRouter(event: NostrEvent) {
        console.log('📡 Routing event publication for kind:', event.kind, 'event ID:', event.id.substring(0, 8));

        // Always publish to all preset relays to ensure maximum reach
        const allRelays = new Set<string>();

        // Add the current selected relay
        allRelays.add(relayUrl.current);

        // Add all preset relays
        for (const { url } of (presetRelays ?? [])) {
          allRelays.add(url);
        }

        // Ensure critical relays are always included
        const criticalRelays = [
          'wss://relay.mostr.pub',      // Mostr relay
          'wss://relay.nostr.band',     // Nostr.band
          'wss://relay.damus.io',       // Damus
          'wss://relay.primal.net',     // Primal
          'wss://spookstr2.nostr1.com'  // Spookstr2
        ];

        for (const criticalRelay of criticalRelays) {
          allRelays.add(criticalRelay);
        }

        const relayList = [...allRelays];
        console.log('📡 Event will be published to relays:', relayList);

        return relayList;
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