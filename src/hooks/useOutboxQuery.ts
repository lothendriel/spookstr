import { useNostr } from '@nostrify/react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useAppContext } from './useAppContext';
import { useUserRelays } from './useUserRelays';
import { useRelayDiscovery } from './useRelayDiscovery';
import { relayHintCache } from '@/lib/relayHints';
import { POPULAR_RELAYS } from '@/constants/relays';
import type { NostrEvent, Filter } from '@nostrify/nostrify';

const SPOOKSTR_RELAY = 'wss://spookstr2.nostr1.com';

/**
 * Get additional relays for fallback queries
 * Combines popular relays with cached relay hints
 */
function getAdditionalRelaysForFallback(currentRelays: string[]): string[] {
  const currentRelaySet = new Set(currentRelays);
  const additionalRelays = new Set<string>();

  // 1. Add popular relays (excluding current ones)
  for (const relay of POPULAR_RELAYS) {
    if (!currentRelaySet.has(relay.url) && additionalRelays.size < 10) {
      additionalRelays.add(relay.url);
    }
  }

  // 2. Add relays from hint cache (excluding current ones)
  const cachedHints = relayHintCache.getEnhancedRelays({
    baseRelays: [],
    maxRelays: 15
  });

  for (const relay of cachedHints) {
    if (!currentRelaySet.has(relay) && additionalRelays.size < 15) {
      additionalRelays.add(relay);
    }
  }

  // 3. Add some well-known reliable relays as final fallback
  const reliableFallbacks = [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band',
    'wss://relay.primal.net',
    'wss://purplepag.es',
    'wss://nostr.wine',
    'wss://relay.snort.social',
  ];

  for (const relay of reliableFallbacks) {
    if (!currentRelaySet.has(relay) && additionalRelays.size < 20) {
      additionalRelays.add(relay);
    }
  }

  return Array.from(additionalRelays);
}

interface OutboxQueryOptions {
  /** The pubkey of the user whose content we're fetching (for outbox model) */
  authorPubkey?: string;
  /** Nostr filters to apply */
  filters: Filter[];
  /** Whether the query is enabled */
  enabled?: boolean;
  /** How long data stays fresh */
  staleTime?: number;
  /** Number of retries */
  retry?: number;
}

/**
 * Hook for querying Nostr events using the outbox model (NIP-65)
 *
 * When fetching content FROM a specific user, this queries their write relays
 * (where they publish their content), falling back to Spookstr relay and defaults.
 *
 * This provides better content discovery while maintaining Spookstr community cohesion.
 */
export function useOutboxQuery({
  authorPubkey,
  filters,
  enabled = true,
  staleTime = 30000,
  retry = 1
}: OutboxQueryOptions) {
  const { nostr } = useNostr();
  const { config, presetRelays = [] } = useAppContext();

  // Fetch the author's relay list if an author is specified
  const { data: authorRelayList } = useUserRelays(authorPubkey);

  return useQuery({
    queryKey: ['outbox-query', authorPubkey, filters, authorRelayList?.map(r => r.url)],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      // Build relay list using outbox model
      const relayUrls = new Set<string>();

      // 1. Always include Spookstr relay for community content
      relayUrls.add(SPOOKSTR_RELAY);

      // 2. If we have the author's relay list, use their WRITE relays
      if (authorRelayList && authorRelayList.length > 0) {
        const writeRelays = authorRelayList
          .filter(r => r.mode === 'write' || r.mode === 'both')
          .map(r => r.url);

        writeRelays.forEach(url => relayUrls.add(url));

        console.log(`OutboxQuery: Using author's write relays:`, writeRelays);
      }

      // 3. Add user's configured read relays as fallback
      if (config.relays && config.relays.length > 0) {
        const readRelays = config.relays
          .filter(r => r.mode === 'read' || r.mode === 'both')
          .map(r => r.url);

        readRelays.forEach(url => relayUrls.add(url));
      } else {
        // Legacy single relay support
        relayUrls.add(config.relayUrl);
      }

      // 4. Add a few preset relays for broader discovery (max 5 total)
      for (const preset of presetRelays) {
        if (relayUrls.size >= 5) break;
        relayUrls.add(preset.url);
      }

      const finalRelays = Array.from(relayUrls);

      console.log('OutboxQuery: Querying relays:', finalRelays);
      console.log('OutboxQuery: Filters:', filters);

      try {
        const relayGroup = nostr.group(finalRelays);
        const events = await relayGroup.query(filters, { signal });

        console.log('OutboxQuery: Found events:', events.length);

        // Deduplicate events by ID
        const uniqueEvents = new Map<string, NostrEvent>();
        for (const event of events) {
          if (!uniqueEvents.has(event.id)) {
            uniqueEvents.set(event.id, event);
          }
        }

        return Array.from(uniqueEvents.values());
      } catch (error) {
        console.error('OutboxQuery: Error:', error);

        // Fallback to default nostr instance
        const events = await nostr.query(filters, { signal });
        console.log('OutboxQuery: Found events from fallback:', events.length);
        return events;
      }
    },
    enabled: enabled,
    staleTime,
    retry,
  });
}

/**
 * Infinite query version of useOutboxQuery for paginated content
 */
export function useOutboxInfiniteQuery({
  authorPubkey,
  filters,
  enabled = true,
  staleTime = 30000,
  retry = 1,
  limit = 50
}: OutboxQueryOptions & { limit?: number }) {
  const { nostr } = useNostr();
  const { config, presetRelays = [] } = useAppContext();
  const { connectTemporarily, isConnecting, queryWithFallbackRelays, isFallbackQuerying } = useRelayDiscovery();

  // Fetch the author's relay list
  const { data: authorRelayList } = useUserRelays(authorPubkey);

  return useInfiniteQuery({
    queryKey: ['outbox-query-infinite', authorPubkey, filters, authorRelayList?.map(r => r.url)],
    queryFn: async ({ pageParam, signal: querySignal }) => {
      const signal = AbortSignal.any([querySignal, AbortSignal.timeout(10000)]);

      // Build relay list using outbox model
      const relayUrls = new Set<string>();

      // 1. Always include Spookstr relay for community content
      relayUrls.add(SPOOKSTR_RELAY);

      // 2. If we have the author's relay list, use their WRITE relays
      if (authorRelayList && authorRelayList.length > 0) {
        const writeRelays = authorRelayList
          .filter(r => r.mode === 'write' || r.mode === 'both')
          .map(r => r.url);

        writeRelays.forEach(url => relayUrls.add(url));

        console.log(`OutboxInfiniteQuery: Using author's write relays:`, writeRelays);
      }

      // 3. Add user's configured read relays as fallback
      if (config.relays && config.relays.length > 0) {
        const readRelays = config.relays
          .filter(r => r.mode === 'read' || r.mode === 'both')
          .map(r => r.url);

        readRelays.forEach(url => relayUrls.add(url));
      } else {
        // Legacy single relay support
        relayUrls.add(config.relayUrl);
      }

      // 4. Add a few preset relays for broader discovery (max 5 total)
      for (const preset of presetRelays) {
        if (relayUrls.size >= 5) break;
        relayUrls.add(preset.url);
      }

      const finalRelays = Array.from(relayUrls);

      console.log('OutboxInfiniteQuery: Querying relays:', finalRelays);
      console.log('OutboxInfiniteQuery: Page param:', pageParam ? new Date(pageParam * 1000).toISOString() : 'initial');

      let allEvents: NostrEvent[] = [];

      try {
        const relayGroup = nostr.group(finalRelays);

        // Apply pagination to filters
        const paginatedFilters = filters.map(filter => ({
          ...filter,
          limit: limit,
          until: pageParam
        }));

        const events = await relayGroup.query(paginatedFilters, { signal });

        console.log('OutboxInfiniteQuery: Found events:', events.length);

        // Deduplicate events by ID
        const uniqueEvents = new Map<string, NostrEvent>();
        for (const event of events) {
          if (!uniqueEvents.has(event.id)) {
            uniqueEvents.set(event.id, event);
          }
        }

        allEvents = Array.from(uniqueEvents.values());

        // Store relay hints from discovered events
        for (const event of allEvents) {
          relayHintCache.storeHints(event);
        }

        // Check if we should trigger fallback for potentially missing content
        const shouldTriggerFallback = pageParam === undefined && // Only for initial page
          authorPubkey &&
          allEvents.length < limit && // Less than expected results
          !isFallbackQuerying; // Not already running fallback

        if (shouldTriggerFallback) {
          console.log('OutboxInfiniteQuery: 🔄 Triggering fallback for potentially missing content');

          try {
            // Get additional relays from the relay hint cache and popular relays
            const additionalRelays = getAdditionalRelaysForFallback(finalRelays);

            if (additionalRelays.length > 0) {
              console.log('OutboxInfiniteQuery: 🎯 Querying additional relays:', additionalRelays);

              // Query the additional relays with the same filters
              const fallbackEvents = await queryWithFallbackRelays({
                filters: paginatedFilters,
                fallbackRelays: additionalRelays,
                signal
              });

              if (fallbackEvents.length > 0) {
                console.log('OutboxInfiniteQuery: 🎯 Fallback found additional events:', fallbackEvents.length);

                // Merge fallback events with original results
                for (const event of fallbackEvents) {
                  if (!uniqueEvents.has(event.id)) {
                    uniqueEvents.set(event.id, event);
                  }
                }

                allEvents = Array.from(uniqueEvents.values());

                // Store relay hints from fallback events too
                for (const event of fallbackEvents) {
                  relayHintCache.storeHints(event);
                }
              }
            }
          } catch (fallbackError) {
            console.warn('OutboxInfiniteQuery: ⚠️ Fallback failed:', fallbackError);
            // Continue with original results, don't fail the whole query
          }
        }

        // Sort by created_at (newest first)
        allEvents.sort((a, b) => b.created_at - a.created_at);

        return allEvents;
      } catch (error) {
        console.error('OutboxInfiniteQuery: Error:', error);

        // Fallback to default nostr instance
        const paginatedFilters = filters.map(filter => ({
          ...filter,
          limit: limit,
          until: pageParam
        }));

        const events = await nostr.query(paginatedFilters, { signal });
        console.log('OutboxInfiniteQuery: Found events from fallback:', events.length);

        // Sort by created_at (newest first)
        events.sort((a, b) => b.created_at - a.created_at);

        return events;
      }
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined;
      // Return the timestamp of the oldest event for pagination
      const oldestTimestamp = lastPage[lastPage.length - 1].created_at;
      console.log('OutboxInfiniteQuery: Next page param:', oldestTimestamp, new Date(oldestTimestamp * 1000).toISOString());
      return oldestTimestamp - 1; // Subtract 1 to avoid duplicates
    },
    enabled: enabled,
    staleTime,
    retry,
    onSuccess: (data) => {
      const totalEvents = data.pages.reduce((sum, page) => sum + page.length, 0);
      console.log('OutboxInfiniteQuery: ✅ Success, total events:', totalEvents, 'pages:', data.pages.length);
    },
    onError: (error) => {
      console.error('OutboxInfiniteQuery: ❌ Error:', error);
    }
  });
}
