import { useState, useEffect, useCallback } from 'react';
import { NRelay1 } from '@nostrify/nostrify';
import { useToast } from '@/hooks/useToast';

interface RelayHealth {
  url: string;
  name: string;
  isConnected: boolean;
  latency: number | null;
  lastChecked: Date | null;
  error: string | null;
}

export function useRelayHealthSimple() {
  const { toast } = useToast();
  const [relayHealth, setRelayHealth] = useState<Map<string, RelayHealth>>(new Map());

  const checkRelayHealth = useCallback(async (relayUrl: string, name: string): Promise<RelayHealth> => {
    const startTime = Date.now();
    
    try {
      // Create a direct relay connection for health checking
      const relay = new NRelay1(relayUrl);
      const signal = AbortSignal.timeout(5000); // 5 second timeout
      
      // Try to connect and send a simple query
      await relay.query([{ kinds: [1], limit: 1 }], { signal });
      
      const latency = Date.now() - startTime;
      
      return {
        url: relayUrl,
        name,
        isConnected: true,
        latency,
        lastChecked: new Date(),
        error: null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        url: relayUrl,
        name,
        isConnected: false,
        latency: null,
        lastChecked: new Date(),
        error: errorMessage,
      };
    }
  }, []);

  const checkAllRelays = useCallback(async (relays: Array<{ url: string; name: string }>) => {
    const healthChecks = relays.map(async (relay) => {
      const health = await checkRelayHealth(relay.url, relay.name);
      return [relay.url, health] as [string, RelayHealth];
    });

    const results = await Promise.allSettled(healthChecks);
    const newHealthMap = new Map<string, RelayHealth>();

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const [url, health] = result.value;
        newHealthMap.set(url, health);
      }
    });

    setRelayHealth(newHealthMap);

    // Check if any relays are completely offline
    const offlineRelays = Array.from(newHealthMap.values()).filter(h => !h.isConnected);
    if (offlineRelays.length === relays.length) {
      toast({
        title: 'All relays offline',
        description: 'No Nostr relays are currently reachable. Please check your internet connection.',
        variant: 'destructive',
      });
    }

    return newHealthMap;
  }, [checkRelayHealth, toast]);

  const getBestRelay = useCallback((): string | null => {
    const healthyRelays = Array.from(relayHealth.values())
      .filter(h => h.isConnected && h.latency !== null)
      .sort((a, b) => (a.latency || 0) - (b.latency || 0));

    return healthyRelays[0]?.url || null;
  }, [relayHealth]);

  // Auto-check relay health every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (relayHealth.size > 0) {
        const relays = Array.from(relayHealth.values()).map(h => ({ url: h.url, name: h.name }));
        checkAllRelays(relays);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [relayHealth.size, checkAllRelays]);

  return {
    relayHealth,
    checkRelayHealth,
    checkAllRelays,
    getBestRelay,
  };
}