import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { useRelayHealth } from '@/hooks/useRelayHealth';
import { useToast } from '@/hooks/useToast';

interface NostrProviderProps {
  children: React.ReactNode;
}

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config, presetRelays } = useAppContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { checkAllRelays, getBestRelay } = useRelayHealth();

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);
  const [isInitialized, setIsInitialized] = useState(false);

  // Use refs so the pool always has the latest data
  const relayUrl = useRef<string>(config.relayUrl);
  const availableRelays = useRef<Set<string>>(new Set());

  // Update refs when config changes
  useEffect(() => {
    const previousUrl = relayUrl.current;
    relayUrl.current = config.relayUrl;

    if (previousUrl !== config.relayUrl) {
      // Reset queries and check health of new relay
      queryClient.resetQueries();
      checkRelayHealth([config.relayUrl, 'Current']);
    }
  }, [config.relayUrl, queryClient, checkAllRelays]);

  const checkRelayHealth = useCallback(async (relays: string[]) => {
    try {
      const relayObjects = relays.map(url => ({ url, name: url.includes('://') ? new URL(url).hostname : url }));
      await checkAllRelays(relayObjects);

      // Update available relays based on health
      const bestRelay = getBestRelay();
      if (bestRelay && bestRelay !== relayUrl.current) {
        // Auto-switch to best relay if current one is unhealthy
        toast({
          title: 'Switched to better relay',
          description: `Connected to ${bestRelay} for improved performance`,
        });
        // Note: We don't automatically change config.relayUrl here as it should be user-driven
      }
    } catch (error) {
      console.error('Failed to check relay health:', error);
    }
  }, [checkAllRelays, getBestRelay, toast]);

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

        // Add preset relays, but prioritize based on health
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

    // Initialize relay health checking
    const initializeRelays = async () => {
      const initialRelays = [
        config.relayUrl,
        ...(presetRelays?.slice(0, 3).map(r => r.url) || [])
      ];

      await checkRelayHealth(initialRelays);
      setIsInitialized(true);
    };

    initializeRelays();
  }

  // Monitor connection health and auto-reconnect
  useEffect(() => {
    if (!isInitialized) return;

    const healthCheckInterval = setInterval(async () => {
      const currentRelays = [
        relayUrl.current,
        ...(presetRelays?.slice(0, 2).map(r => r.url) || [])
      ];

      await checkRelayHealth(currentRelays);
    }, 60000); // Check every minute

    return () => clearInterval(healthCheckInterval);
  }, [isInitialized, presetRelays, checkRelayHealth]);

  return (
    <NostrContext.Provider value={{ nostr: pool.current }}>
      {children}
    </NostrContext.Provider>
  );
};

export default NostrProvider;