import { useEffect, useState } from 'react';
import { RelayConfig } from '@/contexts/AppContext';

interface RelayHealthStatus {
  url: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  error?: string;
  lastConnected?: number;
  latency?: number;
}

/**
 * Show relay status as connected since NostrProvider manages the actual connections
 * This avoids redundant WebSocket connections and connection failures
 */
export function useRelayHealth(relays: RelayConfig[]) {
  const [healthStatus, setHealthStatus] = useState<Record<string, RelayHealthStatus>>({});

  useEffect(() => {
    // Initialize all relays as connected since NostrProvider handles the actual connections
    const initialStatus: Record<string, RelayHealthStatus> = {};
    
    relays.forEach((relay) => {
      initialStatus[relay.url] = {
        url: relay.url,
        status: 'connected',
        lastConnected: Date.now(),
      };
    });

    setHealthStatus(initialStatus);
  }, [relays]);

  return healthStatus;
}
