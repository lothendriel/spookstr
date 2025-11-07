import { useRobustQuotedEvent } from './useRobustQuotedEvent';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Hook for fetching quoted events using ultra-robust multi-strategy discovery
 * This provides maximum success rates for finding quoted content by trying
 * multiple relay sets, hints, and fallback strategies in parallel
 */
export function useQuotedEvent(quotedEventId: string | undefined) {
  const { data: quotedEvent, ...rest } = useRobustQuotedEvent(quotedEventId);

  return {
    data: quotedEvent,
    ...rest,
  };
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
  return useQuotedEvent(quotedEventId);
}