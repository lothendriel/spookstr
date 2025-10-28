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
 * Monitor the health of multiple relays by attempting WebSocket connections
 */
export function useRelayHealth(relays: RelayConfig[]) {
  const [healthStatus, setHealthStatus] = useState<Record<string, RelayHealthStatus>>({});

  useEffect(() => {
    const sockets = new Map<string, WebSocket>();
    const timeouts = new Map<string, NodeJS.Timeout>();

    const checkRelay = (relay: RelayConfig) => {
      const startTime = Date.now();

      // Set connecting status
      setHealthStatus((prev) => ({
        ...prev,
        [relay.url]: {
          url: relay.url,
          status: 'connecting',
        },
      }));

      try {
        const ws = new WebSocket(relay.url);
        sockets.set(relay.url, ws);

        // Connection timeout (5 seconds)
        const timeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.close();
            setHealthStatus((prev) => ({
              ...prev,
              [relay.url]: {
                url: relay.url,
                status: 'error',
                error: 'Connection timeout',
              },
            }));
          }
        }, 5000);

        timeouts.set(relay.url, timeout);

        ws.onopen = () => {
          const latency = Date.now() - startTime;
          clearTimeout(timeout);

          setHealthStatus((prev) => ({
            ...prev,
            [relay.url]: {
              url: relay.url,
              status: 'connected',
              lastConnected: Date.now(),
              latency,
            },
          }));
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          setHealthStatus((prev) => ({
            ...prev,
            [relay.url]: {
              url: relay.url,
              status: 'error',
              error: 'Connection failed',
            },
          }));
        };

        ws.onclose = () => {
          clearTimeout(timeout);
          setHealthStatus((prev) => ({
            ...prev,
            [relay.url]: {
              ...prev[relay.url],
              status: 'disconnected',
            },
          }));
        };
      } catch (error) {
        setHealthStatus((prev) => ({
          ...prev,
          [relay.url]: {
            url: relay.url,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }));
      }
    };

    // Check all relays
    relays.forEach((relay) => {
      checkRelay(relay);
    });

    // Cleanup function
    return () => {
      // Close all WebSocket connections
      sockets.forEach((ws) => {
        ws.close();
      });

      // Clear all timeouts
      timeouts.forEach((timeout) => {
        clearTimeout(timeout);
      });

      sockets.clear();
      timeouts.clear();
    };
  }, [relays]);

  return healthStatus;
}
