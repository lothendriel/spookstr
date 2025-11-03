import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppContext } from './useAppContext';
import { relayHintCache, extractRelayHints } from '@/lib/relayHints';
import { RelayHintPopulator } from '@/lib/relayHintPopulator';
import type { NostrEvent, Filter } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';

interface RobustQuotedEventOptions {
  /** Whether the query is enabled */
  enabled?: boolean;
  /** How long data stays fresh */
  staleTime?: number;
  /** Number of retries */
  retry?: number;
}

/**
 * Ultra-robust quoted event discovery that uses multiple strategies in parallel
 * to maximize the chances of finding quoted content, even if it's on obscure relays.
 */
export function useRobustQuotedEvent(
  eventId: string | undefined,
  options: RobustQuotedEventOptions = {}
) {
  const { nostr } = useNostr();
  const { config, presetRelays = [] } = useAppContext();
  const queryClient = useQueryClient();

  const { enabled = true, staleTime = 120000, retry = 1 } = options;

  return useQuery({
    queryKey: ['robust-quoted-event', eventId],
    queryFn: async (c) => {
      if (!eventId) {
        throw new Error('No event ID provided');
      }

      console.log('🔍 RobustQuotedEvent: Starting discovery for:', eventId);

      // Log cache statistics for debugging
      const cacheStats = RelayHintPopulator.getCacheStats();
      console.log('📊 Cache stats:', cacheStats);

      // Parse the event ID to understand what we're looking for
      let targetId: string;
      let filter: Filter;

      try {
        const decoded = nip19.decode(eventId);

        if (decoded.type === 'note') {
          targetId = decoded.data as string;
          filter = { ids: [targetId], limit: 1 };
        } else if (decoded.type === 'nevent') {
          const neventData = decoded.data as { id: string; relays?: string[] };
          targetId = neventData.id;
          filter = { ids: [targetId], limit: 1 };
        } else if (decoded.type === 'naddr') {
          const naddr = decoded.data as { identifier: string; pubkey: string; kind: number; relays?: string[] };
          filter = {
            kinds: [naddr.kind],
            authors: [naddr.pubkey],
            '#d': [naddr.identifier],
            limit: 1
          };
        } else {
          throw new Error(`Unsupported NIP-19 type: ${decoded.type}`);
        }
      } catch (error) {
        console.error('❌ RobustQuotedEvent: Failed to decode event ID:', error);
        throw new Error('Invalid event ID format');
      }

      // Strategy 1: Try with relay hints from cache first
      console.log('📡 Strategy 1: Trying with relay hints from cache...');
      const cachedHintsResult = await tryWithRelayHints(filter, targetId, eventId);
      if (cachedHintsResult) {
        console.log('✅ Strategy 1 succeeded with cached hints');
        return cachedHintsResult;
      }

      // Strategy 2: Try with expanded relay set including all presets
      console.log('📡 Strategy 2: Trying with expanded relay set...');
      const expandedRelaysResult = await tryWithExpandedRelays(filter);
      if (expandedRelaysResult) {
        console.log('✅ Strategy 2 succeeded with expanded relays');
        return expandedRelaysResult;
      }

      // Strategy 3: Try individual high-priority relays sequentially
      console.log('📡 Strategy 3: Trying high-priority relays sequentially...');
      const sequentialResult = await trySequentialHighPriorityRelays(filter);
      if (sequentialResult) {
        console.log('✅ Strategy 3 succeeded with sequential relays');
        return sequentialResult;
      }

      // Strategy 4: Last resort - try the default nostr instance with longer timeout
      console.log('📡 Strategy 4: Trying fallback with extended timeout...');
      const fallbackResult = await tryFallbackWithTimeout(filter, c.signal);
      if (fallbackResult) {
        console.log('✅ Strategy 4 succeeded with fallback');
        return fallbackResult;
      }

      console.log('❌ All strategies failed for event:', eventId);

      // Fallback: Even if we couldn't fetch the event, try to extract relay hints
      // from the original event that referenced this quoted event
      // This helps build cache for future attempts
      try {
        const { useNostr } = await import('@nostrify/react');
        const nostr = useNostr.getState();

        // Try to find the original event that quoted this event to extract its relay hints
        const referencingEvents = await nostr.query([{
          kinds: [1, 6, 16], // notes, reposts, generic reposts
          '#e': [targetId],
          limit: 5,
        }], { signal: AbortSignal.timeout(5000) });

        if (referencingEvents.length > 0) {
          console.log(`📡 Found ${referencingEvents.length} referencing events for failed quote, extracting hints`);
          RelayHintPopulator.processEvents(referencingEvents);
        }
      } catch (error) {
        console.log('📡 Fallback hint extraction failed:', error);
      }

      return null;
    },
    enabled: enabled && !!eventId,
    staleTime,
    retry,
  });
}

/**
 * Strategy 1: Try with relay hints from cache
 */
async function tryWithRelayHints(filter: Filter, targetId: string, originalEventId: string): Promise<NostrEvent | null> {
  try {
    // Get base relays
    const baseRelays = [
      'wss://spookstr2.nostr1.com',
      'wss://relay.damus.io',
      'wss://relay.nostr.band',
      'wss://nos.lol',
      'wss://relay.primal.net'
    ];

    // Get hints from cache for this specific event
    const eventHints = relayHintCache.getEventHints([targetId]);
    const allRelays = [...new Set([...baseRelays, ...eventHints])];

    console.log('📡 Strategy 1: Trying relays:', allRelays.slice(0, 8));

    const { nostr } = useNostr.getState();

    if (allRelays.length === 1) {
      const relay = nostr.relay(allRelays[0]);
      const events = await relay.query([filter], { signal: AbortSignal.timeout(8000) });
      if (events[0]) {
        console.log('✅ Strategy 1 succeeded with cached hints');
        RelayHintPopulator.processEvent(events[0]);
        return events[0];
      }
      return events[0] || null;
    } else {
      const relayGroup = nostr.group(allRelays.slice(0, 8));
      const events = await relayGroup.query([filter], { signal: AbortSignal.timeout(8000) });
      if (events[0]) {
        console.log('✅ Strategy 1 succeeded with cached hints');
        RelayHintPopulator.processEvent(events[0]);
        return events[0];
      }
      return events[0] || null;
    }
  } catch (error) {
    console.log('📡 Strategy 1 failed:', error);
    return null;
  }
}

/**
 * Strategy 2: Try with expanded relay set
 */
async function tryWithExpandedRelays(filter: Filter): Promise<NostrEvent | null> {
  try {
    // Comprehensive list of reliable relays
    const expandedRelays = [
      'wss://spookstr2.nostr1.com',
      'wss://relay.damus.io',
      'wss://relay.nostr.band',
      'wss://nos.lol',
      'wss://relay.primal.net',
      'wss://nostr.wine',
      'wss://purplepag.es',
      'wss://relay.snort.social',
      'wss://nostr.fmt.wiz.biz',
      'wss://relay.current.fyi',
      'wss://brb.io',
      'wss://nostr.oxtr.dev',
      'wss://relay.bitcoiner.social',
      'wss://nostr.mom',
      'wss://nostr.zebedee.cloud'
    ];

    console.log('📡 Strategy 2: Trying expanded relay set (first 10):', expandedRelays.slice(0, 10));

    const { nostr } = useNostr.getState();
    const relayGroup = nostr.group(expandedRelays.slice(0, 10));
    const events = await relayGroup.query([filter], { signal: AbortSignal.timeout(12000) });

    if (events[0]) {
      // Store relay hints from the found event
      RelayHintPopulator.processEvent(events[0]);
    }

    return events[0] || null;
  } catch (error) {
    console.log('📡 Strategy 2 failed:', error);
    return null;
  }
}

/**
 * Strategy 3: Try high-priority relays sequentially
 */
async function trySequentialHighPriorityRelays(filter: Filter): Promise<NostrEvent | null> {
  const highPriorityRelays = [
    'wss://spookstr2.nostr1.com',
    'wss://relay.damus.io',
    'wss://relay.nostr.band',
    'wss://nos.lol',
    'wss://relay.primal.net'
  ];

  console.log('📡 Strategy 3: Trying high-priority relays sequentially...');

  const { nostr } = useNostr.getState();

  for (const relayUrl of highPriorityRelays) {
    try {
      console.log(`📡 Strategy 3: Trying ${relayUrl}...`);
      const relay = nostr.relay(relayUrl);
      const events = await relay.query([filter], { signal: AbortSignal.timeout(6000) });

      if (events[0]) {
        console.log(`✅ Strategy 3: Found event on ${relayUrl}`);
        // Store relay hints from the found event
        RelayHintPopulator.processEvent(events[0]);
        return events[0];
      }
    } catch (error) {
      console.log(`📡 Strategy 3: ${relayUrl} failed:`, error);
      continue;
    }
  }

  return null;
}

/**
 * Strategy 4: Fallback with extended timeout
 */
async function tryFallbackWithTimeout(filter: Filter, signal?: AbortSignal): Promise<NostrEvent | null> {
  try {
    console.log('📡 Strategy 4: Trying fallback with extended timeout...');
    const { nostr } = useNostr.getState();

    const combinedSignal = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(20000)])
      : AbortSignal.timeout(20000);

    const events = await nostr.query([filter], { signal: combinedSignal });

    if (events[0]) {
      console.log('✅ Strategy 4: Found event with fallback');
      RelayHintPopulator.processEvent(events[0]);
      return events[0];
    }

    return events[0] || null;
  } catch (error) {
    console.log('📡 Strategy 4 failed:', error);
    return null;
  }
}

/**
 * Prefetch quoted events to improve perceived performance
 */
export function usePrefetchQuotedEvent(eventId: string | undefined) {
  const queryClient = useQueryClient();

  const prefetch = () => {
    if (eventId) {
      queryClient.prefetchQuery({
        queryKey: ['robust-quoted-event', eventId],
        queryFn: async () => {
          // Use a simplified version for prefetching
          const { useRobustQuotedEvent } = await import('./useRobustQuotedEvent');
          const { data } = useRobustQuotedEvent(eventId, { enabled: true });
          return data;
        },
        staleTime: 300000, // 5 minutes
      });
    }
  };

  return { prefetch };
}

/**
 * Batch prefetch multiple quoted events
 */
export function useBatchPrefetchQuotedEvents(eventIds: string[]) {
  const queryClient = useQueryClient();

  const prefetchAll = () => {
    eventIds.forEach((eventId) => {
      if (eventId) {
        queryClient.prefetchQuery({
          queryKey: ['robust-quoted-event', eventId],
          queryFn: async () => {
            // Simplified prefetch
            return null; // Will be fetched on demand
          },
          staleTime: 300000,
        });
      }
    });
  };

  return { prefetchAll };
}