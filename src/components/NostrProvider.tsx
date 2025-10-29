import React, { useEffect, useRef } from 'react';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { RelayConfig } from '@/contexts/AppContext';
import { intelligentRelayManager } from '@/lib/intelligentRelayManager';
import { offlineSync } from '@/lib/offlineSync';
import { requestTracker } from '@/lib/requestTracker';

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
  const intelligentRelayInitialized = useRef<boolean>(false);

  // Update refs when config changes
  useEffect(() => {
    relays.current = config.relays || [{ url: config.relayUrl, mode: 'both' }];
    spookstrOnlyMode.current = config.spookstrOnlyMode ?? false;
    queryClient.resetQueries();

    // Initialize intelligent relay manager with available relays
    const initializeIntelligentRelay = async () => {
      if (!intelligentRelayInitialized.current) {
        const allRelayUrls = relays.current.map(r => r.url);

        try {
          // Initialize with reduced health monitoring to avoid connection spam
          await intelligentRelayManager.initialize(allRelayUrls);

          // Connect offline sync to the Nostr client
          if (pool.current) {
            offlineSync.init(pool.current);
          }

          intelligentRelayInitialized.current = true;
          console.log('✅ Intelligent relay system initialized (health monitoring starts when dashboard is accessed)');
        } catch (error) {
          console.error('❌ Failed to initialize intelligent relay system:', error);
        }
      }
    };

    // Delay initialization to ensure pool is ready
    setTimeout(initializeIntelligentRelay, 1000);
  }, [config.relays, config.relayUrl, config.spookstrOnlyMode, queryClient]);

  // Spookstr relay URL
  const SPOOKSTR_RELAY = 'wss://spookstr2.nostr1.com';

  // Get read and write relays from refs
  const getReadRelays = (): string[] => {
    // If Spookstr-only mode is enabled, only use the Spookstr relay
    if (spookstrOnlyMode.current) {
      return [SPOOKSTR_RELAY];
    }

    if (relays.current && relays.current.length > 0) {
      return relays.current
        .filter((r) => r.mode === 'read' || r.mode === 'both')
        .map((r) => r.url);
    }
    // Fallback to legacy relayUrl if no relays configured
    return [config.relayUrl];
  };

  const getWriteRelays = (): string[] => {
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
  };

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        // Create a tracked relay that monitors requests
        const relay = new NRelay1(url);

        // Track connection status
        requestTracker.updateConnectionStatus(url, 'connecting');

        // Wrap the relay methods to track requests
        const originalQuery = relay.query.bind(relay);
        const originalEvent = relay.event.bind(relay);

        relay.query = async (filters: any[], options?: any) => {
          const requestId = requestTracker.trackRequest(url, 'query');
          const startTime = performance.now();

          try {
            requestTracker.updateConnectionStatus(url, 'connected');
            const result = await originalQuery(filters, options);
            const latency = performance.now() - startTime;
            requestTracker.trackSuccess(url, requestId, latency);
            return result;
          } catch (error) {
            requestTracker.trackFailure(url, requestId, error);
            requestTracker.updateConnectionStatus(url, 'error');
            throw error;
          }
        };

        relay.event = async (event: any, options?: any) => {
          const requestId = requestTracker.trackRequest(url, 'publish');
          const startTime = performance.now();

          try {
            requestTracker.updateConnectionStatus(url, 'connected');
            const result = await originalEvent(event, options);
            const latency = performance.now() - startTime;
            requestTracker.trackSuccess(url, requestId, latency);
            return result;
          } catch (error) {
            requestTracker.trackFailure(url, requestId, error);
            requestTracker.updateConnectionStatus(url, 'error');
            throw error;
          }
        };

        return relay;
      },
      reqRouter(filters) {
        // If intelligent relay system is not initialized, fall back to original routing
        if (!intelligentRelayInitialized.current) {
          return this.originalReqRouter(filters);
        }

        // Use intelligent relay selection for routing
        try {
          return this.intelligentReqRouter(filters);
        } catch (error) {
          console.warn('Intelligent routing failed, falling back to original:', error);
          return this.originalReqRouter(filters);
        }
      },
      eventRouter(event: NostrEvent) {
        // If intelligent relay system is not initialized, fall back to original routing
        if (!intelligentRelayInitialized.current) {
          return this.originalEventRouter(event);
        }

        // Use intelligent relay selection for publishing
        try {
          return this.intelligentEventRouter(event);
        } catch (error) {
          console.warn('Intelligent event routing failed, falling back to original:', error);
          return this.originalEventRouter(event);
        }
      },

      // Original routing methods for fallback
      originalReqRouter: (filters: any[]) => {
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
          // If Spookstr-only mode is enabled, only use Spookstr relay even for multi-relay queries
          if (spookstrOnlyMode.current) {
            const relayMap = new Map();
            relayMap.set(SPOOKSTR_RELAY, filters);
            return relayMap;
          }

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

      originalEventRouter: (event: NostrEvent) => {
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

      // Intelligent routing methods
      intelligentReqRouter: (filters: any[]) => {
        const strategy = intelligentRelayManager.getCurrentStrategy();
        if (!strategy) {
          return this.originalReqRouter(filters);
        }

        console.log('🧠 [Intelligent Router] Using strategy:', strategy.name);

        // Determine request type based on filters
        const isProfileQuery = filters.some(filter => filter.kinds?.includes(0));
        const isInteractionQuery = filters.some(filter =>
          (filter.kinds?.includes(6) || filter.kinds?.includes(7) || filter.kinds?.includes(9735)) && filter['#e']
        );
        const isDiscoveryQuery = filters.some(filter => filter['#t'] || filter.search);

        let selectedRelays: string[];

        if (spookstrOnlyMode.current) {
          selectedRelays = [SPOOKSTR_RELAY];
        } else if (isProfileQuery || isInteractionQuery) {
          // Important queries: use primary + secondary relays
          selectedRelays = [...strategy.primary, ...strategy.secondary];
          console.log('🔍 [Intelligent Router] Using primary+secondary relays for important query');
        } else if (isDiscoveryQuery) {
          // Discovery queries: use discovery relays
          selectedRelays = strategy.discovery.length > 0 ? strategy.discovery : strategy.primary;
          console.log('🔍 [Intelligent Router] Using discovery relays for search query');
        } else {
          // Regular queries: use primary relays
          selectedRelays = strategy.primary;
          console.log('🔍 [Intelligent Router] Using primary relays for regular query');
        }

        // Create relay map for NPool
        const relayMap = new Map();
        for (const relayUrl of selectedRelays) {
          relayMap.set(relayUrl, filters);
        }

        console.log('📡 [Intelligent Router] Routing to relays:', selectedRelays.map(url => new URL(url).hostname));
        return relayMap;
      },

      intelligentEventRouter: (event: NostrEvent) => {
        const strategy = intelligentRelayManager.getCurrentStrategy();
        if (!strategy) {
          return this.originalEventRouter(event);
        }

        console.log('📤 [Intelligent Router] Publishing via strategy:', strategy.name);

        let selectedRelays: string[];

        if (spookstrOnlyMode.current) {
          selectedRelays = [SPOOKSTR_RELAY];
        } else {
          // Use publish relays for all events
          selectedRelays = strategy.publish;
        }

        console.log('📡 [Intelligent Router] Publishing to relays:', selectedRelays.map(url => new URL(url).hostname));
        return selectedRelays;
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