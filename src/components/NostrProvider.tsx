import React, { useEffect, useRef, useCallback } from 'react';
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
  const spookstrOnlyMode = useRef<boolean>(false);

  // Update refs when config changes
  useEffect(() => {
    relays.current = config.relays || [{ url: config.relayUrl, mode: 'both' }];
    spookstrOnlyMode.current = config.spookstrOnlyMode ?? false;
    queryClient.resetQueries();
  }, [config.relays, config.relayUrl, config.spookstrOnlyMode, queryClient]);

  // Spookstr relay URL
  const SPOOKSTR_RELAY = 'wss://spookstr2.nostr1.com';

  // Smart relay selection based on query type and performance
  const getFeedRelays = useCallback((): string[] => {
    // If Spookstr-only mode is enabled, only use the Spookstr relay
    if (spookstrOnlyMode.current) {
      return [SPOOKSTR_RELAY];
    }

    if (relays.current && relays.current.length > 0) {
      // Get primary relays with good performance for feed queries
      const primaryRelays = relays.current
        .filter((r) => (r.mode === 'read' || r.mode === 'both') &&
                      (r.priority === 'primary' || !r.priority))
        .sort((a, b) => {
          // Sort by performance: connected status, then latency, then reliability
          const aScore = (a.status === 'connected' ? 100 : 0) +
                        (a.reliabilityScore || 50) -
                        ((a.latency || 1000) / 10);
          const bScore = (b.status === 'connected' ? 100 : 0) +
                        (b.reliabilityScore || 50) -
                        ((b.latency || 1000) / 10);
          return bScore - aScore;
        })
        .slice(0, 3) // Limit to top 3 for performance
        .map((r) => r.url);

      if (primaryRelays.length > 0) return primaryRelays;

      // Fallback to any read relays
      return relays.current
        .filter((r) => r.mode === 'read' || r.mode === 'both')
        .slice(0, 2)
        .map((r) => r.url);
    }
    // Fallback to legacy relayUrl if no relays configured
    return [config.relayUrl];
  }, [config.relayUrl]);

  const getDiscoveryRelays = useCallback((): string[] => {
    // If Spookstr-only mode is enabled, only use the Spookstr relay
    if (spookstrOnlyMode.current) {
      return [SPOOKSTR_RELAY];
    }

    if (relays.current && relays.current.length > 0) {
      // Use all read relays for discovery queries
      const allReadRelays = relays.current
        .filter((r) => r.mode === 'read' || r.mode === 'both')
        .map((r) => r.url);

      // Add preset relays for better discovery, up to 5 total
      const relaySet = new Set(allReadRelays);
      for (const { url } of (presetRelays ?? [])) {
        relaySet.add(url);
        if (relaySet.size >= 5) break;
      }

      return Array.from(relaySet);
    }
    return [config.relayUrl];
  }, [config.relayUrl, presetRelays]);

  const getWriteRelays = useCallback((): string[] => {
    // If Spookstr-only mode is enabled, only use the Spookstr relay
    if (spookstrOnlyMode.current) {
      return [SPOOKSTR_RELAY];
    }

    if (relays.current && relays.current.length > 0) {
      return relays.current
        .filter((r) => r.mode === 'write' || r.mode === 'both')
        .map((r) => r.url);
    }
    // Fallback to legacy relayUrl if no relays configured
    return [config.relayUrl];
  }, [config.relayUrl]);

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        return new NRelay1(url);
      },
      reqRouter(filters) {
        // Analyze the query type to determine optimal relay routing
        const isProfileQuery = filters.some(filter =>
          filter.kinds?.includes(0) || // Profile metadata
          filter.kinds?.includes(10000) || // Contact list
          filter.kinds?.includes(10002) // Relay list
        );

        const isInteractionQuery = filters.some(filter =>
          (filter.kinds?.includes(6) && filter['#e']) || // Reposts with event reference
          (filter.kinds?.includes(7) && filter['#e']) || // Likes with event reference
          (filter.kinds?.includes(9735) && filter['#e']) || // Zap receipts with event reference
          (filter.kinds?.includes(1) && filter['#e']) || // Text note replies with event reference
          (filter.kinds?.includes(1111) && filter['#e']) // Comments with event reference
        );

        const isCommunityQuery = filters.some(filter =>
          filter.kinds?.includes(34550) // Community definitions
        );

        const isFeedQuery = filters.some(filter =>
          filter.kinds?.includes(1) && !filter['#e'] && !filter.authors // Main feed without specific authors or event refs
        );

        // Route queries intelligently
        let targetRelays: string[];

        if (isFeedQuery) {
          // Use fast, reliable relays for main feed
          targetRelays = getFeedRelays();
        } else if (isProfileQuery || isInteractionQuery || isCommunityQuery) {
          // Use discovery relays for metadata and interaction queries
          targetRelays = getDiscoveryRelays();
        } else {
          // Default to feed relays for other queries
          targetRelays = getFeedRelays();
        }

        // If Spookstr-only mode is enabled, override with Spookstr relay
        if (spookstrOnlyMode.current) {
          targetRelays = [SPOOKSTR_RELAY];
        }

        const relayMap = new Map();
        for (const relayUrl of targetRelays) {
          relayMap.set(relayUrl, filters);
        }
        return relayMap;
      },
      eventRouter(_event: NostrEvent) {
        const writeRelays = getWriteRelays();

        // Publish to configured write relays
        const allRelays = new Set<string>(writeRelays);

        // If we have very few write relays, add some preset relays for redundancy
        // But only if not in Spookstr-only mode
        if (allRelays.size < 2 && !spookstrOnlyMode.current) {
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