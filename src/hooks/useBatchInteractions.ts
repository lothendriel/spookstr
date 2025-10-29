import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMultiRelayQuery } from './useMultiRelayQuery';
import type { NostrEvent } from '@nostrify/nostrify';

interface InteractionCounts {
  likes: number;
  reposts: number;
  zaps: number;
  comments: number;
}

/**
 * Enhanced batch hook for fetching interactions using multi-relay approach.
 * Queries ALL configured relays to get comprehensive interaction counts.
 * This dramatically reduces network requests compared to individual queries per post.
 */
export function useBatchInteractions(eventIds: string[]) {
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useMultiRelayQuery({
    filters: eventIds.length === 0 ? [] : [{
      kinds: [6, 7, 9735, 1, 1111, 16], // reposts, likes, zaps, replies, comments, generic reposts
      '#e': eventIds,
      limit: 1500, // Higher limit to capture interactions from multiple relays
    }],
    enabled: eventIds.length > 0,
    staleTime: 30000, // 30 seconds - fresher data for better UX
    retry: 2, // More retries for critical interaction data
  });

  // Process events into interaction counts
  const batchData = useMemo(() => {
    if (!events || eventIds.length === 0) {
      console.log(`[Batch Interactions] No events or eventIds - events: ${!!events}, eventIds: ${eventIds.length}`);
      return {};
    }

    // Group interactions by event ID
    const countsMap: Record<string, InteractionCounts> = {};

    // Initialize counts for all requested events
    for (const eventId of eventIds) {
      countsMap[eventId] = {
        likes: 0,
        reposts: 0,
        zaps: 0,
        comments: 0,
      };
    }

    // Deduplicate events by ID (multiple relays may return same event)
    const uniqueEvents = Array.from(
      new Map(events.map(event => [event.id, event])).values()
    );

    console.log(`[Batch Interactions] Processing ${uniqueEvents.length} unique interactions (from ${events.length} total) for ${eventIds.length} posts`);

    // Count interactions for each event
    let processedCount = 0;
    for (const event of uniqueEvents) {
      const referencedEventId = event.tags.find(([tag]) => tag === 'e')?.[1];
      if (!referencedEventId) {
        console.log(`[Batch Interactions] Event ${event.id.slice(0, 8)} has no 'e' tag`);
        continue;
      }

      if (!countsMap[referencedEventId]) {
        console.log(`[Batch Interactions] Event ${event.id.slice(0, 8)} references unknown post ${referencedEventId.slice(0, 8)}`);
        continue;
      }

      processedCount++;
      switch (event.kind) {
        case 7: // Like
          countsMap[referencedEventId].likes++;
          break;
        case 6: // Repost
        case 16: // Generic repost
          countsMap[referencedEventId].reposts++;
          break;
        case 9735: // Zap
          countsMap[referencedEventId].zaps++;
          break;
        case 1: // Text note reply
        case 1111: // Comment
          countsMap[referencedEventId].comments++;
          break;
        default:
          console.log(`[Batch Interactions] Unknown interaction kind: ${event.kind}`);
      }
    }

    // Log interaction summary for debugging
    const totalInteractions = Object.values(countsMap).reduce((acc, counts) =>
      acc + counts.likes + counts.reposts + counts.zaps + counts.comments, 0
    );

    console.log(`[Batch Interactions] Processed ${processedCount} interactions, total counts: ${totalInteractions} across ${eventIds.length} posts`);

    // Log individual post counts
    Object.entries(countsMap).forEach(([eventId, counts]) => {
      const total = counts.likes + counts.reposts + counts.zaps + counts.comments;
      if (total > 0) {
        console.log(`[Batch Interactions] Post ${eventId.slice(0, 8)}: ${counts.likes}❤️ ${counts.reposts}🔄 ${counts.zaps}⚡ ${counts.comments}💬`);
      }
    });

    return countsMap;
  }, [events, eventIds]);

  // Update individual post interaction caches
  useEffect(() => {
    if (!batchData) return;

    // Log zap counts for debugging
    const zapCounts = Object.entries(batchData).filter(([_, counts]) => counts.zaps > 0);
    if (zapCounts.length > 0) {
      console.log('[Batch Interactions] Updating caches with zap counts:',
        zapCounts.map(([id, counts]) => ({ id: id.slice(0, 8), zaps: counts.zaps }))
      );
    }

    for (const [eventId, counts] of Object.entries(batchData)) {
      queryClient.setQueryData(['post-interactions', eventId], counts);
    }
  }, [batchData, queryClient]);

  return {
    data: batchData,
    isLoading,
  };
}


