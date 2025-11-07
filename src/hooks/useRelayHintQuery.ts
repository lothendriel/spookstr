import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from './useAppContext';
import type { NostrEvent, Filter } from '@nostrify/nostrify';
import { relayHintCache, enhanceFiltersWithHints } from '@/lib/relayHints';

interface RelayHintQueryOptions {
  /** Nostr filters to apply */
  filters: Filter[];
  /** Whether the query is enabled */
  enabled?: boolean;
  /** How long data stays fresh */
  staleTime?: number;
  /** Number of retries */
  retry?: number;
  /** Maximum number of relays to use (including hints) */
  maxRelays?: number;
  /** Whether to use relay hints for this query */
  useRelayHints?: boolean;
  /** Custom query key for cache invalidation */
  queryKey?: any[];
}

/**
 * Enhanced Nostr query hook that automatically discovers and uses relay hints
 * from previously seen events to improve content discovery.
 *
 * This hook:
 * 1. Analyzes your filters to find referenced event IDs, pubkeys, and addresses
 * 2. Checks the relay hint cache for known locations of these items
 * 3. Adds discovered relay hints to your base relay set
 * 4. Stores new relay hints from query results for future use
 *
 * Use this for queries that reference specific content (replies, quotes, zaps, etc.)
 */
export function useRelayHintQuery({
  filters,
  enabled = true,
  staleTime = 30000,
  retry = 1,
  maxRelays = 6, // Slightly higher than normal to accommodate hints
  useRelayHints = true,
  queryKey,
}: RelayHintQueryOptions) {
  const { nostr } = useNostr();
  const { config, presetRelays = [] } = useAppContext();

  return useQuery({
    queryKey: queryKey || ['relay-hint-query', filters, useRelayHints],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      // Get base relays from user config
      let baseRelays: string[];
      if (config.relays && config.relays.length > 0) {
        baseRelays = config.relays
          .filter(r => r.mode === 'read' || r.mode === 'both')
          .map(r => r.url);
      } else {
        baseRelays = [config.relayUrl];
      }

      // Always include Spookstr relay
      const spookstrRelay = 'wss://spookstr2.nostr1.com';
      if (!baseRelays.includes(spookstrRelay)) {
        baseRelays.unshift(spookstrRelay);
      }

      let finalRelays = baseRelays;
      let usedHints = false;

      // Enhance with relay hints if enabled
      if (useRelayHints) {
        const { enhancedRelays, shouldUseHints } = enhanceFiltersWithHints(
          filters,
          baseRelays,
          maxRelays
        );

        if (shouldUseHints && enhancedRelays.length > baseRelays.length) {
          finalRelays = enhancedRelays;
          usedHints = true;
          console.log('RelayHintQuery: Enhanced with hints:', {
            base: baseRelays.length,
            enhanced: finalRelays.length,
            hints: finalRelays.filter(r => !baseRelays.includes(r))
          });
        }
      }

      // If we still have very few relays, add some presets for discovery
      if (finalRelays.length < 3) {
        const additionalRelays = new Set(finalRelays);
        for (const preset of presetRelays) {
          if (additionalRelays.size >= maxRelays) break;
          additionalRelays.add(preset.url);
        }
        finalRelays = Array.from(additionalRelays);
      }

      console.log('RelayHintQuery: Querying relays:', finalRelays);
      console.log('RelayHintQuery: Filters:', filters);

      let events: NostrEvent[];

      try {
        if (finalRelays.length === 1) {
          // Single relay - use direct connection
          const relay = nostr.relay(finalRelays[0]);
          events = await relay.query(filters, { signal });
        } else {
          // Multiple relays - use group
          const relayGroup = nostr.group(finalRelays);
          events = await relayGroup.query(filters, { signal });
        }

        console.log('RelayHintQuery: Found events:', events.length, usedHints ? '(with hints)' : '(base relays)');

        // Store relay hints from discovered events for future queries
        if (useRelayHints) {
          for (const event of events) {
            relayHintCache.storeHints(event);
          }
        }

        // Deduplicate events by ID
        const uniqueEvents = new Map<string, NostrEvent>();
        for (const event of events) {
          if (!uniqueEvents.has(event.id)) {
            uniqueEvents.set(event.id, event);
          }
        }

        return Array.from(uniqueEvents.values());
      } catch (error) {
        console.error('RelayHintQuery: Error:', error);

        // Fallback to default nostr instance
        events = await nostr.query(filters, { signal });
        console.log('RelayHintQuery: Found events from fallback:', events.length);

        // Store hints even from fallback
        if (useRelayHints) {
          for (const event of events) {
            relayHintCache.storeHints(event);
          }
        }

        return events;
      }
    },
    enabled: enabled,
    staleTime,
    retry,
  });
}

/**
 * Specialized hook for fetching a single event by ID with relay hints
 * This is perfect for quoted events, reply targets, etc.
 */
export function useRelayHintEvent(eventId: string, enabled = true) {
  return useRelayHintQuery({
    filters: [{ ids: [eventId], limit: 1 }],
    enabled: enabled && !!eventId,
    staleTime: 60000, // 1 minute for single events
    retry: 2,
    maxRelays: 8, // More relays for single event discovery
    useRelayHints: true,
    queryKey: ['relay-hint-event', eventId], // Consistent query key for single events
  });
}

/**
 * Hook for fetching events that reference specific events (replies, quotes, zaps)
 * Automatically uses relay hints from the referenced events
 */
export function useRelayHintInteractions(eventIds: string[], kinds?: number[], enabled = true) {
  return useRelayHintQuery({
    filters: [{
      kinds: kinds || [1, 6, 7, 9735], // notes, reposts, likes, zaps
      '#e': eventIds,
      limit: 100
    }],
    enabled: enabled && eventIds.length > 0,
    staleTime: 15000, // Interactions change frequently
    retry: 1,
    maxRelays: 6,
    useRelayHints: true,
    queryKey: ['relay-hint-interactions', eventIds, kinds], // Consistent query key for interactions
  });
}

/**
 * Hook for fetching content from specific pubkeys with relay hints
 * Uses both NIP-65 outbox model AND relay hints from previous interactions
 */
export function useRelayHintProfile(pubkey: string, kinds?: number[], enabled = true) {
  return useRelayHintQuery({
    filters: [{
      authors: [pubkey],
      kinds: kinds || [1, 6], // notes and reposts by default
      limit: 20
    }],
    enabled: enabled && !!pubkey,
    staleTime: 30000,
    retry: 1,
    maxRelays: 5,
    useRelayHints: true,
    queryKey: ['relay-hint-profile', pubkey, kinds], // Consistent query key for profile
  });
}