import { NostrEvent } from '@nostrify/nostrify';

/**
 * Get the value of a specific tag from a Nostr event
 * @param event Nostr event
 * @param tagName Tag name to lookup
 * @param defaultValue Default value if tag is not found
 * @returns The value of the tag or defaultValue if not found
 */
export function getTagValue(event: NostrEvent | undefined, tagName: string, defaultValue = ''): string {
  if (!event) return defaultValue;
  const tag = event.tags.find(t => t[0] === tagName);
  return tag ? tag[1] : defaultValue;
}

/**
 * Check if a Nostr event has a specific tag with a specific value
 * @param event Nostr event
 * @param tagName Tag name to check
 * @param tagValue Tag value to check
 * @returns True if the event has the specified tag and value
 */
export function hasTag(event: NostrEvent, tagName: string, tagValue: string): boolean {
  return event.tags.some(tag => tag[0] === tagName && tag[1] === tagValue);
}

/**
 * Get all values of a specific tag from a Nostr event
 * @param event Nostr event
 * @param tagName Tag name to lookup
 * @returns Array of tag values
 */
export function getTagValues(event: NostrEvent | undefined, tagName: string): string[] {
  if (!event) return [];
  return event.tags
    .filter(tag => tag[0] === tagName)
    .map(tag => tag[1]);
}

/**
 * Creates a unique d-tag identifier for articles
 */
export function generateUniqueIdentifier(prefix = 'article'): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${randomStr}`;
}