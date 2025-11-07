import { useRelayHintInteractions } from '@/hooks/useRelayHintQuery';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Hook for fetching all interactions (likes, reposts, zaps, comments) for specific events
 * Uses relay hints for much better discovery of interactions across the network
 */
export function useInteractionsWithHints(eventIds: string[], enabled = true) {
  return useRelayHintInteractions(
    eventIds, 
    [1, 6, 7, 9735, 16, 1111], // notes, reposts, likes, zaps, generic reposts, comments
    enabled
  );
}

/**
 * Hook for fetching likes/reactions for specific events with relay hints
 */
export function useLikesWithHints(eventIds: string[], enabled = true) {
  return useRelayHintInteractions(
    eventIds,
    [7], // likes/reactions
    enabled
  );
}

/**
 * Hook for fetching reposts for specific events with relay hints
 */
export function useRepostsWithHints(eventIds: string[], enabled = true) {
  return useRelayHintInteractions(
    eventIds,
    [6, 16], // reposts and generic reposts
    enabled
  );
}

/**
 * Hook for fetching zaps for specific events with relay hints
 */
export function useZapsWithHints(eventIds: string[], enabled = true) {
  return useRelayHintInteractions(
    eventIds,
    [9735], // zap receipts
    enabled
  );
}

/**
 * Hook for fetching replies/comments for specific events with relay hints
 */
export function useRepliesWithHints(eventIds: string[], enabled = true) {
  return useRelayHintInteractions(
    eventIds,
    [1, 1111], // notes and community comments
    enabled
  );
}

/**
 * Process interaction events to categorize and count them
 */
export function processInteractions(events: NostrEvent[], targetEventIds: string[]) {
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
      likes: NostrEvent[],
      reposts: NostrEvent[],
      zaps: NostrEvent[],
      replies: NostrEvent[],
      counts: {
        likes: number,
        reposts: number,
        zaps: number,
        replies: number,
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
export function useEventInteractions(eventId: string, enabled = true) {
  const { data: events, ...queryResult } = useInteractionsWithHints([eventId], enabled);
  
  const processedInteractions = events ? processInteractions(events, [eventId]) : undefined;
  const eventInteractions = processedInteractions?.byEvent[eventId];
  
  return {
    ...queryResult,
    data: eventInteractions,
    allInteractions: processedInteractions,
  };
}