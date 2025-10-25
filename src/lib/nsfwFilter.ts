import { NostrEvent } from '@nostrify/nostrify';

/**
 * NSFW-related keywords and tags to filter out
 */
const NSFW_KEYWORDS = [
  'nsfw',
  'not safe for work',
  'adult',
  'explicit',
  'mature',
  '18+',
  'porn',
  'xxx',
  'nude',
  'naked',
  'sexual',
  'erotic',
  'fetish',
  'kink',
  'bdsm',
  'horny',
  'lewds',
  'lewd',
];

const NSFW_TAGS = [
  'nsfw',
  'adult',
  'explicit',
  'mature',
  'porn',
  'xxx',
  'nude',
  'sexual',
  'erotic',
  'fetish',
  'kink',
  'bdsm',
  'lewds',
  'lewd',
];

/**
 * Checks if a Nostr event contains NSFW content
 * @param event The Nostr event to check
 * @returns true if the event contains NSFW content, false otherwise
 */
export function isNSFWContent(event: NostrEvent): boolean {
  // Check content for NSFW keywords (case insensitive)
  const contentLower = event.content.toLowerCase();
  const hasNSFWKeyword = NSFW_KEYWORDS.some(keyword => 
    contentLower.includes(keyword.toLowerCase())
  );

  if (hasNSFWKeyword) {
    return true;
  }

  // Check tags for NSFW tags
  const hasNSFWTag = event.tags.some(tag => {
    if (tag.length >= 2 && tag[0] === 't') {
      const tagValue = tag[1].toLowerCase();
      return NSFW_TAGS.some(nsfwTag => 
        tagValue.includes(nsfwTag.toLowerCase())
      );
    }
    return false;
  });

  if (hasNSFWTag) {
    return true;
  }

  // Check for NSFW in subject or title tags if they exist
  const hasNSFWInMetadata = event.tags.some(tag => {
    if (tag.length >= 2) {
      const tagName = tag[0].toLowerCase();
      const tagValue = tag[1].toLowerCase();
      
      // Check common metadata fields that might contain NSFW indicators
      if (['subject', 'title', 'description', 'summary', 'alt'].includes(tagName)) {
        return NSFW_KEYWORDS.some(keyword => 
          tagValue.includes(keyword.toLowerCase())
        );
      }
    }
    return false;
  });

  return hasNSFWInMetadata;
}

/**
 * Filters out NSFW content from an array of Nostr events
 * @param events Array of Nostr events to filter
 * @returns Array of events that don't contain NSFW content
 */
export function filterNSFWContent(events: NostrEvent[]): NostrEvent[] {
  return events.filter(event => !isNSFWContent(event));
}