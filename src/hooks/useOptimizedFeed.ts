import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useSmartRelayRouter } from './useSmartRelayRouter';
import type { NostrEvent, NostrFilter } from '@nostrify/nostrify';

interface FeedOptions {
  /** Maximum number of events to fetch */
  limit?: number;
  /** Authors to fetch from (if specified, uses their write relays) */
  authors?: string[];
  /** Event kinds to fetch */
  kinds?: number[];
  /** Additional filters */
  filters?: Partial<NostrFilter>;
  /** Whether to use smart author-specific routing */
  useAuthorRouting?: boolean;
}

/**
 * Optimized feed hook that uses smart relay routing for better performance
 */
export function useOptimizedFeed(options: FeedOptions = {}) {
  const { nostr } = useNostr();
  const relayRouter = useSmartRelayRouter();

  const {
    limit = 20,
    authors,
    kinds = [1], // Default to text notes
    filters = {},
    useAuthorRouting = false,
  } = options;

  return useQuery({
    queryKey: ['optimized-feed', { limit, authors, kinds, filters, useAuthorRouting }],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Base filter
      const baseFilter: NostrFilter = {
        kinds,
        limit,
        ...filters,
      };

      if (authors && useAuthorRouting) {
        // Use author-specific routing for better content discovery
        const eventsByAuthor = new Map<string, NostrEvent[]>();

        // Query each author's write relays
        const authorQueries = authors.map(async (author) => {
          const authorRelays = relayRouter.getUserContentRelays(author);
          if (authorRelays.length === 0) return [];

          try {
            const authorGroup = nostr.group(authorRelays);
            const events = await authorGroup.query([
              { ...baseFilter, authors: [author], limit: Math.ceil(limit / authors.length) }
            ], { signal });

            eventsByAuthor.set(author, events);
            return events;
          } catch (error) {
            console.warn(`Failed to query relays for author ${author}:`, error);
            return [];
          }
        });

        const results = await Promise.all(authorQueries);
        const allEvents = results.flat();

        // Sort by created_at and deduplicate
        const uniqueEvents = new Map<string, NostrEvent>();
        allEvents.forEach(event => {
          uniqueEvents.set(event.id, event);
        });

        return Array.from(uniqueEvents.values())
          .sort((a, b) => b.created_at - a.created_at)
          .slice(0, limit);
      } else {
        // Use fast feed relays for general queries
        const feedRelays = relayRouter.getFeedRelays();

        if (authors) {
          baseFilter.authors = authors;
        }

        if (feedRelays.length === 0) {
          // Fallback to default nostr query if no feed relays available
          console.warn('[OptimizedFeed] No feed relays available, using default nostr query');
          return await nostr.query([baseFilter], { signal });
        }

        // Query optimized feed relays
        console.log(`[OptimizedFeed] Querying ${feedRelays.length} feed relays:`, feedRelays);
        const feedGroup = nostr.group(feedRelays);
        const events = await feedGroup.query([baseFilter], { signal });
        console.log(`[OptimizedFeed] Found ${events.length} events from feed relays`);
        return events;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for querying user-specific content using their write relays
 */
export function useUserContent(pubkey: string, options: Omit<FeedOptions, 'authors'> = {}) {
  return useOptimizedFeed({
    ...options,
    authors: [pubkey],
    useAuthorRouting: true,
  });
}

/**
 * Hook for querying multiple users' content using their individual write relays
 */
export function useMultiUserContent(pubkeys: string[], options: Omit<FeedOptions, 'authors'> = {}) {
  return useOptimizedFeed({
    ...options,
    authors: pubkeys,
    useAuthorRouting: true,
  });
}

/**
 * Hook for fast general feed (uses only fast, reliable relays)
 */
export function useFastFeed(options: Omit<FeedOptions, 'useAuthorRouting'> = {}) {
  return useOptimizedFeed({
    ...options,
    useAuthorRouting: false,
  });
}

/**
 * Hook for notifications/mentions using your read relays
 */
export function useNotifications(pubkey: string) {
  const { nostr } = useNostr();
  const relayRouter = useSmartRelayRouter();

  return useQuery({
    queryKey: ['notifications', pubkey],
    queryFn: async (c) => {
      if (!pubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const notificationRelays = relayRouter.getNotificationRelays();

      if (notificationRelays.length === 0) {
        return await nostr.query([
          {
            kinds: [1, 7, 9735], // Text notes, reactions, zaps
            '#p': [pubkey],
            limit: 50,
          }
        ], { signal });
      }

      const notificationGroup = nostr.group(notificationRelays);
      return await notificationGroup.query([
        {
          kinds: [1, 7, 9735], // Text notes, reactions, zaps
          '#p': [pubkey],
          limit: 50,
        }
      ], { signal });
    },
    enabled: !!pubkey,
    staleTime: 60 * 1000, // 1 minute
  });
}