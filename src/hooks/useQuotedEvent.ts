import { useRelayHintEvent } from './useRelayHintQuery';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Hook for fetching quoted events using relay hints
 * This provides much better success rates for finding quoted content
 * compared to querying only from configured relays
 */
export function useQuotedEvent(quotedEventId: string | undefined) {
  const { data: events, ...rest } = useRelayHintEvent(quotedEventId || '', !!quotedEventId);
  
  // Return the first (and should be only) event
  const quotedEvent: NostrEvent | undefined = events?.[0];
  
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