import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from './useAppContext';
import type { NostrEvent } from '@nostrify/nostrify';
import type { Filter } from '@nostrify/nostrify';

interface MultiRelayQueryOptions {
  filters: Filter[];
  enabled?: boolean;
  staleTime?: number;
  retry?: number;
}

/**
 * Hook for querying Nostr events from multiple relays simultaneously
 * Uses all preset relays from the relay selector for maximum coverage
 */
export function useMultiRelayQuery({ 
  filters, 
  enabled = true, 
  staleTime = 30000,
  retry = 1 
}: MultiRelayQueryOptions) {
  const { nostr } = useNostr();
  const { presetRelays = [] } = useAppContext();

  return useQuery({
    queryKey: ['multi-relay-query', filters, presetRelays.map(r => r.url)],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);
      
      // Get all available relay URLs
      const relayUrls = presetRelays.map(r => r.url);
      
      console.log('MultiRelayQuery: Fetching from relays:', relayUrls);
      console.log('MultiRelayQuery: Filters:', filters);

      // If we have preset relays, query from all of them
      if (relayUrls.length > 0) {
        try {
          const relayGroup = nostr.group(relayUrls);
          const events = await relayGroup.query(filters, { signal });
          console.log('MultiRelayQuery: Found events from relay group:', events.length);
          return events;
        } catch (groupError) {
          console.log('MultiRelayQuery: Relay group failed, falling back to default:', groupError);
          // Fallback to default nostr instance
          const events = await nostr.query(filters, { signal });
          console.log('MultiRelayQuery: Found events from fallback:', events.length);
          return events;
        }
      } else {
        // No preset relays, use default behavior
        const events = await nostr.query(filters, { signal });
        console.log('MultiRelayQuery: Found events from default:', events.length);
        return events;
      }
    },
    enabled: enabled && presetRelays.length > 0,
    staleTime,
    retry,
    onError: (error) => {
      console.error('MultiRelayQuery: Error:', error);
    },
  });
}

/**
 * Hook for fetching a single event by ID from multiple relays
 * Useful for quoted events, replies, etc.
 */
export function useMultiRelayEvent(eventId: string, enabled = true) {
  const { presetRelays = [] } = useAppContext();
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['multi-relay-event', eventId, presetRelays.map(r => r.url)],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(8000)]);
      
      const relayUrls = presetRelays.map(r => r.url);
      console.log('MultiRelayEvent: Fetching event from relays:', relayUrls, 'Event ID:', eventId);

      if (relayUrls.length > 0) {
        // Try relay group first
        try {
          const relayGroup = nostr.group(relayUrls);
          const events = await relayGroup.query([{ ids: [eventId], limit: 1 }], { signal });
          console.log('MultiRelayEvent: Found event from relay group:', events.length > 0);
          return events[0] || null;
        } catch (groupError) {
          console.log('MultiRelayEvent: Relay group failed, trying individual relays:', groupError);
          
          // Try individual relays one by one
          for (const relayUrl of relayUrls) {
            try {
              const relay = nostr.relay(relayUrl);
              const events = await relay.query([{ ids: [eventId], limit: 1 }], { signal });
              if (events.length > 0) {
                console.log('MultiRelayEvent: Found event from relay:', relayUrl);
                return events[0];
              }
            } catch (relayError) {
              console.log('MultiRelayEvent: Relay failed:', relayUrl, relayError);
              continue;
            }
          }
          
          console.log('MultiRelayEvent: No event found from any relay');
          return null;
        }
      } else {
        // Fallback to default
        const events = await nostr.query([{ ids: [eventId], limit: 1 }], { signal });
        console.log('MultiRelayEvent: Found event from default:', events.length > 0);
        return events[0] || null;
      }
    },
    enabled: enabled && !!eventId,
    staleTime: 60000, // 1 minute for single events
    retry: 2, // More retries for single events
    onError: (error) => {
      console.error('MultiRelayEvent: Error:', error);
    },
  });
}