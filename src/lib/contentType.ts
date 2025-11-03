import { NostrEvent } from '@nostrify/nostrify';

/**
 * Content type validation utilities for Spookstr
 * Ensures proper separation between different types of content
 */

/**
 * Check if an event is a community post or reply
 * @param event The Nostr event to check
 * @returns True if the event belongs to a community (has 'A' tag with 34550)
 */
export function isCommunityContent(event: NostrEvent): boolean {
  return event.tags.some(tag =>
    tag[0] === 'A' && tag[1]?.startsWith('34550:')
  );
}

/**
 * Check if an event is a reply to another event
 * @param event The Nostr event to check
 * @returns True if the event is a reply (has 'e' tags referencing other events)
 */
export function isReply(event: NostrEvent): boolean {
  // Check for 'e' tags with explicit reply/root markers (NIP-10 style)
  const hasExplicitReplyMarkers = event.tags.some(tag =>
    tag[0] === 'e' && (tag[3] === 'reply' || tag[3] === 'root')
  );

  // Also check for any 'e' tags that reference other events (basic reply detection)
  // This covers cases where reply markers might not be explicitly set
  const hasEventReferences = event.tags.some(tag =>
    tag[0] === 'e' && tag[1] && tag[1].length > 0
  );

  return hasExplicitReplyMarkers || hasEventReferences;
}

/**
 * Check if an event should appear in the main paranormal feed
 * @param event The Nostr event to check
 * @returns True if the event should appear in main feed (not community content, not a reply)
 */
export function shouldAppearInMainFeed(event: NostrEvent): boolean {
  return !isCommunityContent(event) && !isReply(event);
}

/**
 * Check if an event should appear in community feeds
 * @param event The Nostr event to check
 * @returns True if the event is community content
 */
export function shouldAppearInCommunityFeed(event: NostrEvent): boolean {
  return isCommunityContent(event);
}

/**
 * Get community information from an event
 * @param event The Nostr event to check
 * @returns Community tag string or null if not a community event
 */
export function getCommunityTag(event: NostrEvent): string | null {
  const communityTag = event.tags.find(tag =>
    tag[0] === 'A' && tag[1]?.startsWith('34550:')
  );
  return communityTag?.[1] || null;
}

/**
 * Validate that community content uses the correct event kind
 * @param event The Nostr event to validate
 * @returns True if the event follows community content rules
 */
export function validateCommunityEvent(event: NostrEvent): boolean {
  const isCommunity = isCommunityContent(event);

  // Community content should use kind 1111
  if (isCommunity && event.kind !== 1111) {
    console.warn('Community content should use kind 1111, found:', event.kind);
    return false;
  }

  return true;
}

/**
 * Filter events to only include those appropriate for the main feed
 * @param events Array of Nostr events to filter
 * @returns Filtered array containing only main feed appropriate events
 */
export function filterForMainFeed(events: NostrEvent[]): NostrEvent[] {
  return events.filter(event => shouldAppearInMainFeed(event));
}

/**
 * Filter events to only include community content
 * @param events Array of Nostr events to filter
 * @returns Filtered array containing only community events
 */
export function filterForCommunityFeed(events: NostrEvent[]): NostrEvent[] {
  return events.filter(event => shouldAppearInCommunityFeed(event));
}

/**
 * Get the content type description for logging/debugging
 * @param event The Nostr event to analyze
 * @returns String describing the content type
 */
export function getContentType(event: NostrEvent): string {
  if (isCommunityContent(event) && isReply(event)) {
    return 'community_reply';
  } else if (isCommunityContent(event)) {
    return 'community_post';
  } else if (isReply(event)) {
    return 'regular_reply';
  } else {
    return 'top_level_post';
  }
}