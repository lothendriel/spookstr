import { useEffect, useState, useRef } from 'react';
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
 * Only checks once per relay URL to avoid infinite reconnection loops
 */
export function useRelayHealth(relays: RelayConfig[]) {
  const [healthStatus, setHealthStatus] = useState<Record<string, RelayHealthStatus>>({});
  const checkedRelays = useRef<Set<string>>(new Set());
  const socketsRef = useRef<Map<string, WebSocket>>(new Map());
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const checkRelay = (relay: RelayConfig, delay: number = 0) => {
      // Skip if already checked
      if (checkedRelays.current.has(relay.url)) {
        return;
      }

      checkedRelays.current.add(relay.url);

      // Add delay to avoid overwhelming the browser with simultaneous connections
      setTimeout(() => {
        const startTime = Date.now();

        // Set connecting status
        setHealthStatus((prev) => ({
          ...prev,
          [relay.url]: {
            url: relay.url,
            status: 'connecting',
          },
        }));

        console.log(`[RelayHealth] Connecting to ${relay.url}...`);

        try {
          const ws = new WebSocket(relay.url);
          socketsRef.current.set(relay.url, ws);

        // Connection timeout (5 seconds)
        const timeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CLOSED) {
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

        timeoutsRef.current.set(relay.url, timeout);

        ws.onopen = () => {
          const latency = Date.now() - startTime;
          const currentTimeout = timeoutsRef.current.get(relay.url);
          if (currentTimeout) {
            clearTimeout(currentTimeout);
            timeoutsRef.current.delete(relay.url);
          }

          console.log(`[RelayHealth] ✅ Connected to ${relay.url} (${latency}ms)`);

          setHealthStatus((prev) => ({
            ...prev,
            [relay.url]: {
              url: relay.url,
              status: 'connected',
              lastConnected: Date.now(),
              latency,
            },
          }));

          // Close connection after successful health check
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
          }, 1000);
        };

        ws.onerror = (error) => {
          const currentTimeout = timeoutsRef.current.get(relay.url);
          if (currentTimeout) {
            clearTimeout(currentTimeout);
            timeoutsRef.current.delete(relay.url);
          }

          console.error(`[RelayHealth] ❌ Error connecting to ${relay.url}:`, error);

          setHealthStatus((prev) => ({
            ...prev,
            [relay.url]: {
              url: relay.url,
              status: 'error',
              error: 'Connection failed',
            },
          }));
        };

        ws.onclose = (event) => {
          const currentTimeout = timeoutsRef.current.get(relay.url);
          if (currentTimeout) {
            clearTimeout(currentTimeout);
            timeoutsRef.current.delete(relay.url);
          }

          console.log(`[RelayHealth] 🔌 Disconnected from ${relay.url} (code: ${event.code})`);

          // Only update to disconnected if not already in error or connected state
          setHealthStatus((prev) => {
            const current = prev[relay.url];
            if (current && (current.status === 'error' || current.status === 'connected')) {
              return prev;
            }
            return {
              ...prev,
              [relay.url]: {
                url: relay.url,
                status: 'disconnected',
                error: event.code !== 1000 ? `Closed with code ${event.code}` : undefined,
              },
            };
          });
        };
      } catch (error) {
        console.error(`[RelayHealth] ❌ Exception for ${relay.url}:`, error);
        setHealthStatus((prev) => ({
          ...prev,
          [relay.url]: {
            url: relay.url,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }));
      }
      }, delay);
    };

    // Check new relays with staggered delays to avoid overwhelming the browser
    relays.forEach((relay, index) => {
      checkRelay(relay, index * 200); // 200ms delay between each connection
    });

    // Cleanup function
    return () => {
      // Close all WebSocket connections
      socketsRef.current.forEach((ws, url) => {
        try {
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close(1000, 'Component unmounting');
          }
        } catch (e) {
          console.error(`Error closing WebSocket for ${url}:`, e);
        }
      });

      // Clear all timeouts
      timeoutsRef.current.forEach((timeout) => {
        clearTimeout(timeout);
      });

      socketsRef.current.clear();
      timeoutsRef.current.clear();
    };
  }, [relays]);

  return healthStatus;
}
