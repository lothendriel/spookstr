import { useRelayEvent } from './useRelayQuery';
import { useQueryClient } from '@tanstack/react-query';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';

interface QuotedEventOptions {
  /** Whether the query is enabled */
  enabled?: boolean;
  /** How long data stays fresh */
  staleTime?: number;
  /** Number of retries */
  retry?: number;
}

/**
 * Enhanced quoted event discovery using the unified relay query system.
 *
 * This hook leverages the advanced relay hint and fallback strategies
 * built into the unified useRelayQuery hook, providing robust event
 * discovery with much simpler code.
 */
export function useQuotedEvent(
  eventId: string | undefined,
  options: QuotedEventOptions = {}
) {
  const { enabled = true, staleTime = 120000, retry = 1 } = options;

  console.log('🔍 useQuotedEvent: Fetching event:', eventId?.substring(0, 20) + '...', {
    enabled,
    staleTime,
    retry
  });

  // Use the unified relay event hook with enhanced settings for quoted events
  const result = useRelayEvent(eventId || '', enabled && !!eventId);

  // Add additional logging for debugging
  console.log('🔍 useQuotedEvent: Result:', {
    eventId: eventId?.substring(0, 20) + '...',
    isLoading: result.isLoading,
    error: result.error?.message,
    dataLength: result.data?.length || 0,
    hasData: !!result.data && result.data.length > 0
  });

  return {
    ...result,
    // Transform the data to handle the case where eventId might be undefined
    data: eventId ? result.data : null,
  };
}

/**
 * Prefetch quoted events to improve perceived performance
 */
export function usePrefetchQuotedEvent(eventId: string | undefined) {
  const queryClient = useQueryClient();

  const prefetch = () => {
    if (eventId) {
      queryClient.prefetchQuery({
        queryKey: ['relay-event', eventId],
        queryFn: async () => {
          // Prefetch will use the unified relay query system
          const { useRelayEvent } = await import('./useRelayQuery');
          const { data } = useRelayEvent(eventId, { enabled: true });
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
          queryKey: ['relay-event', eventId],
          queryFn: async () => {
            // Simplified prefetch - will be fetched on demand
            return null;
          },
          staleTime: 300000,
        });
      }
    });
  };

  return { prefetchAll };
}

/**
 * Extract quoted event ID from a Nostr event
 * Looks for 'q' tags first (NIP-18), then falls back to 'e' tags with "mention" marker
 */
export function extractQuotedEventId(event: NostrEvent): string | undefined {
  // First check for 'q' tags (NIP-18 quotes)
  const qTag = event.tags.find(([name]) => name === 'q');
  if (qTag && qTag[1]) {
    return qTag[1];
  }

  // Fallback to 'e' tags with "mention" marker
  const mentionTag = event.tags.find(([name, , , marker]) =>
    name === 'e' && marker === 'mention'
  );
  if (mentionTag && mentionTag[1]) {
    return mentionTag[1];
  }

  // Last resort: look for any 'e' tag that's not a reply
  const replyTag = event.tags.find(([name, , , marker]) =>
    name === 'e' && (marker === 'reply' || marker === 'root')
  );

  const nonReplyETag = event.tags.find(([name, eventId]) =>
    name === 'e' && eventId && eventId !== replyTag?.[1]
  );

  return nonReplyETag?.[1];
}

/**
 * Hook that automatically extracts and fetches quoted events from a post
 */
export function useAutoQuotedEvent(event: NostrEvent | undefined) {
  const quotedEventId = event ? extractQuotedEventId(event) : undefined;

  // Handle the case where quotedEventId might be a hex string or NIP-19
  const normalizedEventId = quotedEventId ? normalizeEventId(quotedEventId) : undefined;

  return useQuotedEvent(normalizedEventId);
}

/**
 * Normalize event ID to ensure it's in the correct format for querying
 * Converts hex IDs to note1 NIP-19 format for consistency
 */
function normalizeEventId(eventId: string): string {
  // If it's already a NIP-19 identifier, return as-is
  if (eventId.startsWith('note1') || eventId.startsWith('nevent1') || eventId.startsWith('naddr1')) {
    return eventId;
  }

  // If it's a hex string (64 characters), try to encode as note1
  if (eventId.match(/^[0-9a-fA-F]{64}$/)) {
    try {
      const note1Id = nip19.noteEncode(eventId);
      console.log('🔄 Normalized hex ID to note1:', {
        hex: eventId.substring(0, 8) + '...',
        note1: note1Id.substring(0, 12) + '...'
      });
      return note1Id;
    } catch (error) {
      console.warn('Failed to encode hex event ID as note1:', error);
      return eventId; // Return original if encoding fails
    }
  }

  // Return as-is if we can't normalize it
  return eventId;
}