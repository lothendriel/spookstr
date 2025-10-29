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

  // Get read relays with health-aware filtering
  const getReadRelays = (): string[] => {
    // If Spookstr-only mode is enabled, only use the Spookstr relay
    if (spookstrOnlyMode.current) {
      return [SPOOKSTR_RELAY];
    }

    let candidateRelays: string[];
    if (relays.current && relays.current.length > 0) {
      candidateRelays = relays.current
        .filter((r) => r.mode === 'read' || r.mode === 'both')
        .map((r) => r.url);
    } else {
      // Fallback to legacy relayUrl if no relays configured
      candidateRelays = [config.relayUrl];
    }

    // Apply health-aware filtering if intelligent system is available
    if (intelligentRelayInitialized.current) {
      try {
        const healthyRelays = candidateRelays.filter(url => {
          const health = relayHealthMonitor.getMetrics(url);

          // If no health data, assume healthy (don't exclude)
          if (!health) return true;

          // Exclude relays that are clearly problematic
          if (health.status === 'offline' || health.errorStreakCount > 5) {
            console.log(`🚫 [Health-Aware] Excluding unhealthy relay: ${new URL(url).hostname} (status: ${health.status})`);
            return false;
          }

          return true;
        });

        // Ensure we always have at least one relay
        if (healthyRelays.length > 0) {
          console.log(`✅ [Health-Aware] Selected ${healthyRelays.length}/${candidateRelays.length} healthy read relays`);
          return healthyRelays;
        } else {
          console.log(`⚠️ [Health-Aware] All relays unhealthy, using all configured relays as fallback`);
          return candidateRelays;
        }
      } catch (error) {
        console.debug('Health-aware filtering failed, using all relays:', error);
        return candidateRelays;
      }
    }

    return candidateRelays;
  };

  // Get write relays with health-aware filtering
  const getWriteRelays = (): string[] => {
    // If Spookstr-only mode is enabled, only use the Spookstr relay
    if (spookstrOnlyMode.current) {
      return [SPOOKSTR_RELAY];
    }

    let candidateRelays: string[];
    if (relays.current && relays.current.length > 0) {
      candidateRelays = relays.current
        .filter((r) => r.mode === 'write' || r.mode === 'both')
        .map((r) => r.url);
    } else {
      // Fallback to legacy relayUrl if no relays configured
      candidateRelays = [config.relayUrl];
    }

    // Apply health-aware filtering if intelligent system is available
    if (intelligentRelayInitialized.current) {
      try {
        const healthyRelays = candidateRelays.filter(url => {
          const health = relayHealthMonitor.getMetrics(url);

          // If no health data, assume healthy (don't exclude)
          if (!health) return true;

          // For publishing, be more conservative - exclude degraded relays too
          if (health.status === 'offline' || health.status === 'unhealthy' || health.errorStreakCount > 3) {
            console.log(`🚫 [Health-Aware] Excluding unreliable publish relay: ${new URL(url).hostname} (status: ${health.status})`);
            return false;
          }

          return true;
        });

        // For publishing, we want redundancy, so keep more relays
        if (healthyRelays.length > 0) {
          console.log(`✅ [Health-Aware] Selected ${healthyRelays.length}/${candidateRelays.length} healthy write relays`);
          return healthyRelays;
        } else {
          console.log(`⚠️ [Health-Aware] All write relays unhealthy, using all configured relays as fallback`);
          return candidateRelays;
        }
      } catch (error) {
        console.debug('Health-aware write filtering failed, using all relays:', error);
        return candidateRelays;
      }
    }

    return candidateRelays;
  };

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        // Create relay with optional request tracking
        const relay = new NRelay1(url);

        // Only add tracking if intelligent system is available and request tracker exists
        if (intelligentRelayInitialized.current && typeof requestTracker !== 'undefined') {
          try {
            // Track connection status
            requestTracker.updateConnectionStatus(url, 'connecting');

            // Wrap the relay methods to track requests (non-blocking)
            const originalQuery = relay.query.bind(relay);
            const originalEvent = relay.event.bind(relay);

            relay.query = async (filters: any[], options?: any) => {
              let requestId: string | undefined;
              let startTime: number | undefined;

              try {
                requestId = requestTracker.trackRequest(url, 'query');
                startTime = performance.now();
                requestTracker.updateConnectionStatus(url, 'connected');
              } catch (trackingError) {
                // Tracking failed, but continue with request
                console.debug('Request tracking failed, continuing without tracking:', trackingError);
              }

              try {
                const result = await originalQuery(filters, options);

                // Track success if tracking is available
                if (requestId && startTime) {
                  const latency = performance.now() - startTime;
                  requestTracker.trackSuccess(url, requestId, latency);
                }

                return result;
              } catch (error) {
                // Track failure if tracking is available
                if (requestId) {
                  requestTracker.trackFailure(url, requestId, error);
                  requestTracker.updateConnectionStatus(url, 'error');
                }
                throw error;
              }
            };

            relay.event = async (event: any, options?: any) => {
              let requestId: string | undefined;
              let startTime: number | undefined;

              try {
                requestId = requestTracker.trackRequest(url, 'publish');
                startTime = performance.now();
                requestTracker.updateConnectionStatus(url, 'connected');
              } catch (trackingError) {
                console.debug('Event tracking failed, continuing without tracking:', trackingError);
              }

              try {
                const result = await originalEvent(event, options);

                if (requestId && startTime) {
                  const latency = performance.now() - startTime;
                  requestTracker.trackSuccess(url, requestId, latency);
                }

                return result;
              } catch (error) {
                if (requestId) {
                  requestTracker.trackFailure(url, requestId, error);
                  requestTracker.updateConnectionStatus(url, 'error');
                }
                throw error;
              }
            };
          } catch (error) {
            // If anything fails in tracking setup, just return the normal relay
            console.debug('Failed to set up request tracking for', url, error);
          }
        }

        return relay;
      },
      reqRouter(filters) {
        // Temporarily disable intelligent routing to fix infinite loop
        // TODO: Re-enable after fixing the integration issues

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
      eventRouter(_event: NostrEvent) {
        // Temporarily disable intelligent routing to fix infinite loop
        // TODO: Re-enable after fixing the integration issues

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