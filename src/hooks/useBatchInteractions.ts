import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRelayQuery, processInteractions } from './useRelayQuery';
import type { NostrEvent } from '@nostrify/nostrify';

interface InteractionCounts {
  likes: number;
  reposts: number;
  zaps: number;
  comments: number;
}

/**
 * Enhanced batch hook for fetching interactions for multiple posts at once.
 * Now uses the unified relay query system for better performance and reliability.
 *
 * Features:
 * - Leverages advanced relay hint discovery
 * - Uses intelligent fallback strategies
 * - Provides consistent caching and error handling
 * - Maintains batch processing efficiency
 */
export function useBatchInteractions(eventIds: string[]) {
  const queryClient = useQueryClient();

  // Debug logging only in development
  if (import.meta.env.DEV) {
    console.log('[Batch Interactions] Hook called with eventIds:', eventIds.map(id => id.slice(0, 8)));
  }

  // Use unified relay query system with batch-optimized settings
  const { data: interactionEvents, isLoading, error } = useRelayQuery({
    filters: [{
      kinds: [6, 7, 9735, 1, 1111], // reposts, likes, zaps, replies, comments
      '#e': eventIds,
      limit: 500, // Reduced limit to save memory
    }],
    enabled: eventIds.length > 0,
    staleTime: 180000, // 3 minutes - reduced frequency for better memory management
    retry: 2,
    useRelayHints: true, // Enable relay hints for better discovery
    useFallbacks: true, // Use fallback strategies
    maxRelays: 4, // Limit relays for batch efficiency
    timeout: 10000,
    queryKey: ['batch-interactions', eventIds.sort().join(',')],
  });

  // Process interaction events into counts map
  const { data: batchData } = useQuery({
    queryKey: ['batch-interactions-processed', eventIds.sort().join(',')],
    queryFn: () => {
      if (!interactionEvents || interactionEvents.length === 0) {
        if (import.meta.env.DEV) {
          console.log('[Batch Interactions] No interaction events found');
        }
        
        // Initialize empty counts for all requested event IDs
        const emptyCounts: Record<string, InteractionCounts> = {};
        for (const eventId of eventIds) {
          emptyCounts[eventId] = {
            likes: 0,
            reposts: 0,
            zaps: 0,
            comments: 0,
          };
        }
        return emptyCounts;
      }

      if (import.meta.env.DEV) {
        console.log('[Batch Interactions] Processing', interactionEvents.length, 'interactions for', eventIds.length, 'posts');
      }

      // Use the unified processInteractions function from useRelayQuery
      const processed = processInteractions(interactionEvents, eventIds);
      
      if (import.meta.env.DEV) {
        console.log('[Batch Interactions] Summary:', {
          totalEvents: interactionEvents.length,
          likes: processed.counts.likes,
          reposts: processed.counts.reposts,
          zaps: processed.counts.zaps,
          comments: processed.counts.comments,
          postsWithInteractions: Object.values(processed.byEvent).filter(c =>
            c.likes > 0 || c.reposts > 0 || c.zaps > 0 || c.comments > 0
          ).length
        });
      }

      // Convert byEvent structure to simple counts map
      const countsMap: Record<string, InteractionCounts> = {};
      for (const eventId of eventIds) {
        const eventData = processed.byEvent[eventId];
        countsMap[eventId] = eventData ? {
          likes: eventData.counts.likes,
          reposts: eventData.counts.reposts,
          zaps: eventData.counts.zaps,
          comments: eventData.counts.comments,
        } : {
          likes: 0,
          reposts: 0,
          zaps: 0,
          comments: 0,
        };
      }

      return countsMap;
    },
    enabled: !!interactionEvents && eventIds.length > 0,
    staleTime: 180000,
    gcTime: 240000, // 4 minutes - reduced cache time to save memory
  });

  // Update individual post interaction caches
  useEffect(() => {
    if (!batchData) return;

    if (import.meta.env.DEV) {
      console.log('[Batch Interactions] Updating individual caches for', Object.keys(batchData).length, 'posts');
      
      // Log detailed counts for debugging (development only)
      const postsWithInteractions = Object.entries(batchData).filter(([_, counts]) =>
        counts.likes > 0 || counts.reposts > 0 || counts.zaps > 0 || counts.comments > 0
      );

      if (postsWithInteractions.length > 0) {
        console.log('[Batch Interactions] Posts with interactions:',
          postsWithInteractions.map(([id, counts]) => ({
            id: id.slice(0, 8),
            likes: counts.likes,
            reposts: counts.reposts,
            zaps: counts.zaps,
            comments: counts.comments
          }))
        );
      }
    }

    for (const [eventId, counts] of Object.entries(batchData)) {
      queryClient.setQueryData(['post-interactions', eventId], counts);
      if (import.meta.env.DEV) {
        console.log(`[Batch Interactions] Set cache for ${eventId.slice(0, 8)}:`, counts);
      }
    }
  }, [batchData, queryClient]);

  // Log errors for debugging
  useEffect(() => {
    if (error) {
      if (import.meta.env.DEV) {
        console.error('[Batch Interactions] Error fetching interactions:', error);
      }
    }
  }, [error]);

  return {
    data: batchData,
    isLoading,
    error,
  };
}