import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppContext } from './useAppContext';
import type { NostrEvent, Filter } from '@nostrify/nostrify';
import type { HookResult } from '@/types';
import { relayHintCache, enhanceFiltersWithHints } from '@/lib/relayHints';
import { queryKeys } from '@/lib/queryKeys';

interface RelayQueryOptions {
  /** Nostr filters to apply */
  filters: Filter[];
  /** Whether the query is enabled */
  enabled?: boolean;
  /** How long data stays fresh */
  staleTime?: number;
  /** Number of retries */
  retry?: number;
  /** Maximum number of relays to use */
  maxRelays?: number;
  /** Whether to use relay hints for better discovery */
  useRelayHints?: boolean;
  /** Whether to use aggressive fallback strategies */
  useFallbacks?: boolean;
  /** Custom query key for cache invalidation */
  queryKey?: any[];
  /** Timeout for the query in milliseconds */
  timeout?: number;
}

interface RelayQueryResult {
  data: NostrEvent[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  isFetching: boolean;
}

/**
 * Unified Relay Query Hook - Consolidates all relay query strategies into one powerful hook.
 *
 * This hook combines the best features from:
 * - useMultiRelayQuery: Basic multi-relay support
 * - useRelayHintQuery: Advanced relay hint discovery
 * - useInteractions: Specialized interaction queries
 * - useRealtimeInteractions: Fallback strategies
 *
 * Features:
 * 1. **Smart Relay Selection**: Automatically chooses the best relay strategy
 * 2. **Relay Hint Integration**: Uses previously discovered relay locations
 * 3. **Graceful Fallbacks**: Multiple fallback strategies for reliability
 * 4. **Performance Optimized**: Intelligent caching and retry logic
 * 5. **Configurable**: Fine-tune behavior for different use cases
 */
export function useRelayQuery({
  filters,
  enabled = true,
  staleTime = 30000,
  retry = 1,
  maxRelays = 6,
  useRelayHints = true,
  useFallbacks = true,
  queryKey,
  timeout = 10000,
}: RelayQueryOptions): HookResult<NostrEvent[]> {
  const { nostr } = useNostr();
  const { config, presetRelays = [] } = useAppContext();
  const queryClient = useQueryClient();

  const result = useQuery({
    queryKey: queryKey || ['relay-query', filters, { useRelayHints, maxRelays }],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(timeout)]);

      try {
        // Step 1: Determine base relays
        const baseRelays = getBaseRelays(config, presetRelays);
        console.log('RelayQuery: Base relays:', baseRelays);

        // Step 2: Enhance with relay hints if enabled
        let finalRelays = baseRelays;
        let usedHints = false;

        if (useRelayHints) {
          const { enhancedRelays, shouldUseHints } = enhanceFiltersWithHints(
            filters,
            baseRelays,
            maxRelays
          );

          if (shouldUseHints && enhancedRelays.length > baseRelays.length) {
            finalRelays = enhancedRelays;
            usedHints = true;
            console.log('RelayQuery: Enhanced with hints:', {
              base: baseRelays.length,
              enhanced: finalRelays.length,
              hints: finalRelays.filter(r => !baseRelays.includes(r))
            });
          }
        }

        // Step 3: Ensure minimum relay coverage
        if (finalRelays.length < 2 && presetRelays.length > 0) {
          const additionalRelays = new Set(finalRelays);
          for (const preset of presetRelays) {
            if (additionalRelays.size >= Math.min(maxRelays, 3)) break;
            additionalRelays.add(preset.url);
          }
          finalRelays = Array.from(additionalRelays);
          console.log('RelayQuery: Added preset relays for coverage:', finalRelays);
        }

        // Step 4: Execute query with optimal strategy
        let events: NostrEvent[] = [];
        let queryStrategy = 'unknown';

        if (finalRelays.length === 1) {
          // Single relay strategy
          queryStrategy = 'single-relay';
          const relay = nostr.relay(finalRelays[0]);
          events = await relay.query(filters, { signal });
        } else {
          // Multi-relay strategy with fallback
          queryStrategy = 'multi-relay';
          try {
            const relayGroup = nostr.group(finalRelays.slice(0, maxRelays));
            events = await relayGroup.query(filters, { signal });
          } catch (groupError) {
            console.warn('RelayQuery: Multi-relay query failed, trying single relay fallback:', groupError);

            // Fallback to best single relay
            queryStrategy = 'single-relay-fallback';
            const relay = nostr.relay(finalRelays[0]);
            events = await relay.query(filters, { signal });
          }
        }

        console.log('RelayQuery: Query completed:', {
          strategy: queryStrategy,
          eventsFound: events.length,
          hintsUsed: usedHints,
          relaysUsed: finalRelays.length
        });

        // Step 5: Store relay hints from discovered events
        if (useRelayHints && events.length > 0) {
          for (const event of events) {
            relayHintCache.storeHints(event);
          }
        }

        // Step 6: Deduplicate events by ID
        const uniqueEvents = deduplicateEvents(events);
        console.log('RelayQuery: Unique events after deduplication:', uniqueEvents.length);

        return uniqueEvents;

      } catch (error) {
        console.error('RelayQuery: Primary query failed:', error);

        // Step 7: Fallback strategies if enabled
        if (useFallbacks) {
          return await executeFallbackQuery(nostr, config, filters, signal);
        }

        throw error;
      }
    },
    enabled,
    staleTime,
    retry,
    onError: (error) => {
      console.error('RelayQuery: Query failed:', error);
    },
  });

  return result;
}

/**
 * Specialized hook for fetching a single event by ID with enhanced discovery
 */
export function useRelayEvent(eventId: string, enabled = true): HookResult<NostrEvent[]> {
  return useRelayQuery({
    filters: [{ ids: [eventId], limit: 1 }],
    enabled: enabled && !!eventId,
    staleTime: 60000, // 1 minute for single events
    retry: 2, // More retries for single events
    maxRelays: 8, // More relays for single event discovery
    useRelayHints: true,
    useFallbacks: true,
    timeout: 8000,
    queryKey: queryKeys.post.details(eventId),
  });
}

/**
 * Specialized hook for fetching interactions (likes, reposts, zaps, comments)
 */
export function useRelayInteractions(
  eventIds: string[],
  kinds?: number[],
  enabled = true
): HookResult<NostrEvent[]> {
  return useRelayQuery({
    filters: [{
      kinds: kinds || [1, 6, 7, 9735, 16, 1111], // notes, reposts, likes, zaps, generic reposts, comments
      '#e': eventIds,
      limit: 100
    }],
    enabled: enabled && eventIds.length > 0,
    staleTime: 15000, // Interactions change frequently
    retry: 1,
    maxRelays: 6,
    useRelayHints: true,
    useFallbacks: true,
    queryKey: queryKeys.interactions.batch(eventIds),
  });
}

/**
 * Specialized hook for fetching user profile content
 */
export function useRelayProfile(pubkey: string, kinds?: number[], enabled = true): HookResult<NostrEvent[]> {
  return useRelayQuery({
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
    useFallbacks: true,
    queryKey: queryKeys.author.feed(pubkey),
  });
}

// Helper functions

function getBaseRelays(config: any, presetRelays: any[]): string[] {
  let baseRelays: string[];

  // Get relays from user config
  if (config.relays && config.relays.length > 0) {
    baseRelays = config.relays
      .filter((r: any) => r.mode === 'read' || r.mode === 'both')
      .map((r: any) => r.url);
  } else {
    baseRelays = [config.relayUrl];
  }

  // Always include Spookstr relay for better coverage
  const spookstrRelay = 'wss://spookstr2.nostr1.com';
  if (!baseRelays.includes(spookstrRelay)) {
    baseRelays.unshift(spookstrRelay);
  }

  return baseRelays;
}

function deduplicateEvents(events: NostrEvent[]): NostrEvent[] {
  const uniqueEvents = new Map<string, NostrEvent>();

  for (const event of events) {
    if (!uniqueEvents.has(event.id)) {
      uniqueEvents.set(event.id, event);
    }
  }

  return Array.from(uniqueEvents.values());
}

async function executeFallbackQuery(
  nostr: any,
  config: any,
  filters: Filter[],
  signal: AbortSignal
): Promise<NostrEvent[]> {
  console.log('RelayQuery: Executing fallback query');

  try {
    // Try default nostr instance first
    const events = await nostr.query(filters, { signal });
    console.log('RelayQuery: Fallback query found events:', events.length);

    // Store hints even from fallback
    for (const event of events) {
      relayHintCache.storeHints(event);
    }

    return events;
  } catch (fallbackError) {
    console.error('RelayQuery: Fallback query also failed:', fallbackError);

    // Return empty array rather than throwing to prevent UI errors
    return [];
  }
}

/**
 * Process interaction events to categorize and count them
 * (Moved from useInteractions for consolidation)
 */
import type { AllInteractions } from '@/types';

export function processInteractions(events: NostrEvent[], targetEventIds: string[]): AllInteractions {
  const interactions = {
    likes: [] as NostrEvent[],
    reposts: [] as NostrEvent[],
    zaps: [] as NostrEvent[],
    replies: [] as NostrEvent[],
    counts: {
      likes: 0,
      reposts: 0,
      zaps: 0,
      replies: 0,
    },
    byEvent: {} as Record<string, {
      likes: NostrEvent[];
      reposts: NostrEvent[];
      zaps: NostrEvent[];
      replies: NostrEvent[];
      counts: {
        likes: number;
        reposts: number;
        zaps: number;
        replies: number;
      }
    }>
  };

  // Initialize by-event tracking
  for (const eventId of targetEventIds) {
    interactions.byEvent[eventId] = {
      likes: [],
      reposts: [],
      zaps: [],
      replies: [],
      counts: { likes: 0, reposts: 0, zaps: 0, replies: 0 }
    };
  }

  // Process each interaction event
  for (const event of events) {
    // Find which target event this interaction references
    const referencedEventId = event.tags.find(([name, id]) =>
      name === 'e' && targetEventIds.includes(id)
    )?.[1];

    if (!referencedEventId) continue;

    const eventData = interactions.byEvent[referencedEventId];
    if (!eventData) continue;

    // Categorize by event kind
    switch (event.kind) {
      case 7: // Likes/reactions
        interactions.likes.push(event);
        eventData.likes.push(event);
        interactions.counts.likes++;
        eventData.counts.likes++;
        break;

      case 6: // Reposts
      case 16: // Generic reposts
        interactions.reposts.push(event);
        eventData.reposts.push(event);
        interactions.counts.reposts++;
        eventData.counts.reposts++;
        break;

      case 9735: // Zap receipts
        interactions.zaps.push(event);
        eventData.zaps.push(event);
        interactions.counts.zaps++;
        eventData.counts.zaps++;
        break;

      case 1: // Notes (replies)
      case 1111: // Community comments
        // Only count as reply if it has the referenced event as a reply target
        const isReply = event.tags.some(([name, id, , marker]) =>
          name === 'e' && id === referencedEventId &&
          (marker === 'reply' || (!marker && event.tags.filter(t => t[0] === 'e').length === 1))
        );

        if (isReply) {
          interactions.replies.push(event);
          eventData.replies.push(event);
          interactions.counts.replies++;
          eventData.counts.replies++;
        }
        break;
    }
  }

  return interactions;
}

/**
 * Combined hook that fetches and processes all interactions for an event
 */
import type { EventInteractions } from '@/types';

export function useEventInteractions(eventId: string, enabled = true): HookResult<EventInteractions> {
  const { data: events, ...queryResult } = useRelayInteractions([eventId], [1, 6, 7, 9735, 16, 1111], enabled);

  const processedInteractions = events ? processInteractions(events, [eventId]) : undefined;
  const eventInteractions = processedInteractions?.byEvent[eventId];

  return {
    ...queryResult,
    data: eventInteractions,
    allInteractions: processedInteractions,
  };
}