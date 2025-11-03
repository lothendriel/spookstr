import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from './useCurrentUser';
import { useAppContext } from './useAppContext';
import { useRelayHintQuery } from './useRelayHintQuery';
import { relayHintCache } from '@/lib/relayHints';
import type { NostrEvent, Filter } from '@nostrify/nostrify';

export type DiscoveryContext =
  | 'feed'
  | 'post-detail'
  | 'profile'
  | 'interactions'
  | 'notifications'
  | 'replies'
  | 'zaps'
  | 'reposts';

interface ContextualDiscoveryOptions {
  context: DiscoveryContext;
  targetEventId?: string;
  targetPubkey?: string;
  enabled?: boolean;
  autoDiscover?: boolean;
}

/**
 * Hook that applies relay discovery contextually across different parts of the app.
 * This ensures that relay discovery enhances content visibility in feeds, post details,
 * profiles, interactions, notifications, and more.
 */
export function useContextualRelayDiscovery({
  context,
  targetEventId,
  targetPubkey,
  enabled = true,
  autoDiscover = true,
}: ContextualDiscoveryOptions) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const queryClient = useQueryClient();

  // Get the appropriate filters based on context
  const getContextFilters = useCallback((): Filter[] => {
    const baseTime = Math.floor(Date.now() / 1000);

    switch (context) {
      case 'feed':
        return [
          {
            kinds: [1, 6, 16], // Notes, reposts, generic reposts
            limit: 50,
            since: baseTime - (6 * 60 * 60), // Last 6 hours
          }
        ];

      case 'post-detail':
        if (!targetEventId) return [];
        return [
          // The target event
          { ids: [targetEventId], limit: 1 },
          // Replies to the event
          { kinds: [1], '#e': [targetEventId], limit: 50 },
          // Reactions (likes, reposts, zaps)
          { kinds: [7, 6, 9735], '#e': [targetEventId], limit: 100 },
        ];

      case 'profile':
        if (!targetPubkey) return [];
        return [
          // User's notes and reposts
          { kinds: [1, 6], authors: [targetPubkey], limit: 20 },
          // Replies to the user
          { kinds: [1], '#p': [targetPubkey], limit: 30 },
        ];

      case 'interactions':
        if (!targetEventId) return [];
        return [
          // All interactions with the event
          { kinds: [1, 6, 7, 9735, 16], '#e': [targetEventId], limit: 100 },
        ];

      case 'notifications':
        if (!user?.pubkey) return [];
        return [
          // Mentions
          { kinds: [1], '#p': [user.pubkey], limit: 50, since: baseTime - (24 * 60 * 60) },
          // Replies to user's events
          { kinds: [1], '#p': [user.pubkey], limit: 30, since: baseTime - (12 * 60 * 60) },
          // Reactions to user's content
          { kinds: [7, 9735], '#p': [user.pubkey], limit: 50, since: baseTime - (24 * 60 * 60) },
          // Reposts of user's content
          { kinds: [6, 16], '#e': [], limit: 20, since: baseTime - (12 * 60 * 60) }, // Will be enhanced with user's event IDs
        ];

      case 'replies':
        if (!targetEventId) return [];
        return [
          { kinds: [1], '#e': [targetEventId], limit: 50 },
        ];

      case 'zaps':
        if (!targetEventId && !targetPubkey) return [];
        return [
          {
            kinds: [9735],
            ...(targetEventId ? { '#e': [targetEventId] } : {}),
            ...(targetPubkey ? { '#p': [targetPubkey] } : {}),
            limit: 100,
          }
        ];

      case 'reposts':
        if (!targetEventId) return [];
        return [
          { kinds: [6, 16], '#e': [targetEventId], limit: 50 },
        ];

      default:
        return [];
    }
  }, [context, targetEventId, targetPubkey, user?.pubkey]);

  // Use relay hint query for enhanced discovery
  const {
    data: events,
    isLoading,
    error,
    refetch,
  } = useRelayHintQuery({
    filters: getContextFilters(),
    enabled: enabled && getContextFilters().length > 0,
    useRelayHints: autoDiscover,
    maxRelays: getMaxRelaysForContext(context),
    staleTime: getStaleTimeForContext(context),
    retry: 1,
  });

  // Specific hook for notifications that handles user's event IDs
  const enhanceNotificationFilters = useCallback(async () => {
    if (context !== 'notifications' || !user?.pubkey) return;

    try {
      // Fetch user's recent events to find reposts
      const userEvents = await nostr.query([
        { kinds: [1], authors: [user.pubkey], limit: 20, since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) }
      ], { signal: AbortSignal.timeout(3000) });

      const userEventIds = userEvents.map(e => e.id);

      if (userEventIds.length > 0) {
        // Invalidate and refetch with enhanced filters
        queryClient.invalidateQueries({
          queryKey: ['relay-hint-query', getContextFilters(), autoDiscover]
        });
      }
    } catch (error) {
      console.error('Failed to enhance notification filters:', error);
    }
  }, [context, user?.pubkey, nostr, queryClient, autoDiscover]);

  // Auto-enhance notification filters
  useEffect(() => {
    if (context === 'notifications' && autoDiscover) {
      enhanceNotificationFilters();
    }
  }, [context, autoDiscover, enhanceNotificationFilters]);

  // Store relay hints from discovered events
  useEffect(() => {
    if (events && autoDiscover) {
      for (const event of events) {
        relayHintCache.storeHints(event);
      }
    }
  }, [events, autoDiscover]);

  // Contextual refresh function
  const refresh = useCallback(async () => {
    if (context === 'notifications') {
      await enhanceNotificationFilters();
    }
    return refetch();
  }, [context, enhanceNotificationFilters, refetch]);

  // Get discovery stats for this context
  const getDiscoveryStats = useCallback(() => {
    const baseRelays = config.relays?.length || 1;
    const eventsFound = events?.length || 0;
    const hintsUsed = eventsFound > 0; // Simplified - would need more detailed tracking

    return {
      context,
      baseRelays,
      eventsFound,
      hintsUsed,
      targetId: targetEventId || targetPubkey,
    };
  }, [context, config.relays, events, targetEventId, targetPubkey]);

  return {
    events: events || [],
    isLoading,
    error,
    refresh,
    stats: getDiscoveryStats(),
  };
}

/**
 * Get maximum relays to use based on context
 */
function getMaxRelaysForContext(context: DiscoveryContext): number {
  switch (context) {
    case 'feed':
      return 5; // Standard feed queries
    case 'post-detail':
    case 'interactions':
      return 8; // More relays for specific content discovery
    case 'notifications':
      return 6; // Important for finding mentions
    case 'profile':
      return 7; // User content discovery
    case 'replies':
    case 'zaps':
    case 'reposts':
      return 6; // Interaction discovery
    default:
      return 5;
  }
}

/**
 * Get cache time based on context
 */
function getStaleTimeForContext(context: DiscoveryContext): number {
  switch (context) {
    case 'feed':
      return 30000; // 30 seconds - feeds change frequently
    case 'notifications':
      return 60000; // 1 minute - notifications are important but not as frequent
    case 'interactions':
    case 'replies':
    case 'zaps':
    case 'reposts':
      return 45000; // 45 seconds - interactions update regularly
    case 'post-detail':
      return 90000; // 1.5 minutes - post content is relatively stable
    case 'profile':
      return 120000; // 2 minutes - profile content changes slowly
    default:
      return 60000; // 1 minute default
  }
}

/**
 * Hook for feed-specific relay discovery
 */
export function useFeedDiscovery(enabled = true) {
  return useContextualRelayDiscovery({
    context: 'feed',
    enabled,
    autoDiscover: true,
  });
}

/**
 * Hook for post detail relay discovery
 */
export function usePostDetailDiscovery(eventId: string, enabled = true) {
  return useContextualRelayDiscovery({
    context: 'post-detail',
    targetEventId: eventId,
    enabled: enabled && !!eventId,
    autoDiscover: true,
  });
}

/**
 * Hook for profile-specific relay discovery
 */
export function useProfileDiscovery(pubkey: string, enabled = true) {
  return useContextualRelayDiscovery({
    context: 'profile',
    targetPubkey: pubkey,
    enabled: enabled && !!pubkey,
    autoDiscover: true,
  });
}

/**
 * Hook for notification relay discovery
 */
export function useNotificationDiscovery(enabled = true) {
  const { user } = useCurrentUser();

  return useContextualRelayDiscovery({
    context: 'notifications',
    enabled: enabled && !!user?.pubkey,
    autoDiscover: true,
  });
}

/**
 * Hook for interaction discovery (likes, reposts, zaps, replies)
 */
export function useInteractionDiscovery(eventId: string, enabled = true) {
  return useContextualRelayDiscovery({
    context: 'interactions',
    targetEventId: eventId,
    enabled: enabled && !!eventId,
    autoDiscover: true,
  });
}

/**
 * Hook that provides relay discovery status across all contexts
 */
export function useGlobalRelayDiscoveryStatus() {
  const { config } = useAppContext();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['relay-discovery-status', config.relays?.length, user?.pubkey],
    queryFn: () => {
      const baseRelayCount = config.relays?.length || 1;
      const hasSearchRelays = (config.searchRelays?.length || 0) > 0;
      const cacheSize = relayHintCache.getCacheSize();

      return {
        baseRelayCount,
        hasSearchRelays,
        cacheSize,
        isOptimized: baseRelayCount >= 3 && hasSearchRelays,
        recommendations: generateRecommendations(baseRelayCount, hasSearchRelays),
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Generate optimization recommendations
 */
function generateRecommendations(baseRelayCount: number, hasSearchRelays: boolean): string[] {
  const recommendations: string[] = [];

  if (baseRelayCount < 3) {
    recommendations.push('Add more relays for better content discovery');
  }

  if (!hasSearchRelays) {
    recommendations.push('Configure search relays for hashtag and keyword discovery');
  }

  if (baseRelayCount > 6) {
    recommendations.push('Consider reducing relays to improve performance');
  }

  return recommendations;
}