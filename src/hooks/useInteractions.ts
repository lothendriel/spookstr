import { useRelayInteractions, useEventInteractions as useRelayEventInteractions, processInteractions } from '@/hooks/useRelayQuery';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Hook for fetching all interactions (likes, reposts, zaps, comments) for specific events
 * Uses the unified relay query system with relay hints for much better discovery
 */
export function useInteractions(eventIds: string[], enabled = true) {
  return useRelayInteractions(
    eventIds,
    [1, 6, 7, 9735, 16, 1111], // notes, reposts, likes, zaps, generic reposts, comments
    enabled
  );
}

/**
 * Hook for fetching likes/reactions for specific events with relay hints
 */
export function useLikesWithHints(eventIds: string[], enabled = true) {
  return useRelayInteractions(
    eventIds,
    [7], // likes/reactions
    enabled
  );
}

/**
 * Hook for fetching reposts for specific events with relay hints
 */
export function useRepostsWithHints(eventIds: string[], enabled = true) {
  return useRelayInteractions(
    eventIds,
    [6, 16], // reposts and generic reposts
    enabled
  );
}

/**
 * Hook for fetching zaps for specific events with relay hints
 */
export function useZapsWithHints(eventIds: string[], enabled = true) {
  return useRelayInteractions(
    eventIds,
    [9735], // zap receipts
    enabled
  );
}

/**
 * Hook for fetching replies/comments for specific events with relay hints
 */
export function useRepliesWithHints(eventIds: string[], enabled = true) {
  return useRelayInteractions(
    eventIds,
    [1, 1111], // notes and community comments
    enabled
  );
}

/**
 * Combined hook that fetches and processes all interactions for an event
 * Now uses the unified relay query system
 */
export function useEventInteractions(eventId: string, enabled = true) {
  return useRelayEventInteractions(eventId, enabled);
}

// Re-export processInteractions for backward compatibility
export { processInteractions };