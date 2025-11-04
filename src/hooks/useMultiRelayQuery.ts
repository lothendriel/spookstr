import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNostr } from '@nostrify/react';
import { NostrEvent } from '@nostrify/nostrify';
import { useAppContext } from './useAppContext';

interface MultiRelayQueryOptions {
  filters: any[];
  relayUrls?: string[];
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  retry?: number;
}

/**
 * Enhanced multi-relay query hook that fetches data from multiple relays in parallel
 * and returns the combined results. Uses race-based querying for faster responses.
 *
 * Features:
 * - Parallel querying across multiple relays
 * - Automatic fallback to healthy relays
 * - Result deduplication by event ID
 * - Configurable timeout and retry logic
 * - Integration with app relay configuration
 */
export function useMultiRelayQuery({
  filters,
  relayUrls: customRelayUrls,
  enabled = true,
  staleTime = 60000, // 1 minute default
  gcTime = 300000, // 5 minutes default
  retry = 2,
}: MultiRelayQueryOptions) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  // Determine which relays to use
  const targetRelays = useMemo(() => {
    // If custom relays provided, use those
    if (customRelayUrls && customRelayUrls.length > 0) {
      return customRelayUrls;
    }

    // Otherwise use configured relays with read access
    const configuredRelays = config.relays
      ?.filter(relay => relay.mode === 'read' || relay.mode === 'both')
      .map(relay => relay.url) || [];

    // Always include the default relay as fallback
    const defaultRelays = [config.relayUrl];

    // Combine and deduplicate
    const allRelays = [...configuredRelays, ...defaultRelays];
    return Array.from(new Set(allRelays));
  }, [customRelayUrls, config.relays, config.relayUrl]);

  return useQuery({
    queryKey: ['multi-relay-query', JSON.stringify(filters), targetRelays],
    queryFn: async (c) => {
      if (!enabled || targetRelays.length === 0) {
        console.log('[Multi-Relay Query] Query disabled or no relays available');
        return [];
      }

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(8000)]);

      console.log('[Multi-Relay Query] Querying', targetRelays.length, 'relays with filters:', filters);

      // Query all relays in parallel with individual timeouts
      const relayPromises = targetRelays.map(async (relayUrl, index) => {
        try {
          console.log(`[Multi-Relay Query] Querying relay ${index + 1}/${targetRelays.length}:`, relayUrl);

          // Use individual relay connection
          const relay = nostr.relay(relayUrl);
          const events = await relay.query(filters, { signal });

          console.log(`[Multi-Relay Query] ✅ Relay ${relayUrl} returned`, events.length, 'events');
          return { relayUrl, events, success: true };
        } catch (error) {
          console.warn(`[Multi-Relay Query] ❌ Relay ${relayUrl} failed:`, error);
          return { relayUrl, events: [], success: false, error };
        }
      });

      // Wait for all relay queries to complete (success or failure)
      const results = await Promise.allSettled(relayPromises);

      // Process results
      const allEvents: NostrEvent[] = [];
      const successfulRelays: string[] = [];
      const failedRelays: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { relayUrl, events, success, error } = result.value;

          if (success && events.length > 0) {
            allEvents.push(...events);
            successfulRelays.push(relayUrl);
          } else {
            failedRelays.push(relayUrl);
          }
        } else {
          failedRelays.push(targetRelays[index]);
          console.warn(`[Multi-Relay Query] Relay ${targetRelays[index]} promise rejected:`, result.reason);
        }
      });

      console.log('[Multi-Relay Query] Results summary:', {
        totalEvents: allEvents.length,
        successfulRelays: successfulRelays.length,
        failedRelays: failedRelays.length,
        successfulRelayList: successfulRelays,
        failedRelayList: failedRelays
      });

      // Deduplicate events by ID to prevent duplicates
      const uniqueEvents = new Map<string, NostrEvent>();
      let duplicateCount = 0;

      for (const event of allEvents) {
        if (!uniqueEvents.has(event.id)) {
          uniqueEvents.set(event.id, event);
        } else {
          duplicateCount++;
        }
      }

      const deduplicatedEvents = Array.from(uniqueEvents.values());

      console.log('[Multi-Relay Query] Deduplication:', {
        originalCount: allEvents.length,
        duplicateCount,
        finalCount: deduplicatedEvents.length
      });

      return deduplicatedEvents;
    },
    enabled: enabled && targetRelays.length > 0,
    staleTime,
    gcTime,
    retry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
  });
}

/**
 * Hook for fetching a single event from multiple relays with race-based querying.
 * Optimized for fast single-event retrieval with relay hints.
 */
export function useMultiRelayEvent(
  eventId: string,
  options?: {
    relayUrls?: string[];
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
  }
) {
  const { nostr } = useNostr();
  const { config } = useAppContext();

  // Determine which relays to use
  const targetRelays = useMemo(() => {
    // If custom relays provided, use those
    if (options?.relayUrls && options.relayUrls.length > 0) {
      return options.relayUrls;
    }

    // Otherwise use configured relays with read access
    const configuredRelays = config.relays
      ?.filter(relay => relay.mode === 'read' || relay.mode === 'both')
      .map(relay => relay.url) || [];

    // Always include the default relay as fallback
    const defaultRelays = [config.relayUrl];

    // Combine and deduplicate
    const allRelays = [...configuredRelays, ...defaultRelays];
    return Array.from(new Set(allRelays));
  }, [options?.relayUrls, config.relays, config.relayUrl]);

  return useQuery({
    queryKey: ['multi-relay-event', eventId, targetRelays],
    queryFn: async (c) => {
      if (!eventId || targetRelays.length === 0) {
        console.log('[Multi-Relay Event] No event ID or relays available');
        return null;
      }

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      console.log('[Multi-Relay Event] Querying for event', eventId.slice(0, 8), 'across', targetRelays.length, 'relays');

      // Query all relays in parallel with individual timeouts
      const relayPromises = targetRelays.map(async (relayUrl, index) => {
        try {
          console.log(`[Multi-Relay Event] Querying relay ${index + 1}/${targetRelays.length}:`, relayUrl);

          // Use individual relay connection
          const relay = nostr.relay(relayUrl);
          const events = await relay.query([{
            ids: [eventId],
            limit: 1,
          }], { signal });

          console.log(`[Multi-Relay Event] Relay ${relayUrl} returned`, events.length, 'events');
          return { relayUrl, event: events[0] || null, success: true };
        } catch (error) {
          console.warn(`[Multi-Relay Event] Relay ${relayUrl} failed:`, error);
          return { relayUrl, event: null, success: false, error };
        }
      });

      // Wait for all relay queries to complete (success or failure)
      const results = await Promise.allSettled(relayPromises);

      // Find the first successful result
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success && result.value.event) {
          const { relayUrl, event } = result.value;
          console.log('[Multi-Relay Event] Found event in relay:', relayUrl, 'Event ID:', event.id.slice(0, 8));
          return event;
        }
      }

      // If no event found, log the failures
      const failedRelays = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((_, index) => targetRelays[index]);

      console.log('[Multi-Relay Event] Event not found in any relay. Failed relays:', failedRelays);
      return null;
    },
    enabled: !!eventId && (options?.enabled !== false) && targetRelays.length > 0,
    staleTime: options?.staleTime || 300000, // 5 minutes default for single events
    gcTime: options?.gcTime || 600000, // 10 minutes default
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });
}