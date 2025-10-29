import { nip19 } from 'nostr-tools';

export interface MentionedUser {
  pubkey: string;
  displayName: string;
  nprofile: string;
}

/**
 * Extract mentioned users from content and return p tags for the event
 */
export function extractMentions(content: string): Array<[string, string]> {
  const mentionRegex = /nostr:(nprofile1[a-z0-9]+|npub1[a-z0-9]+)/gi;
  const matches = content.match(mentionRegex);
  const pTags: Array<[string, string]> = [];
  
  if (!matches) return pTags;

  const seenPubkeys = new Set<string>();

  for (const match of matches) {
    try {
      const identifier = match.replace('nostr:', '');
      const decoded = nip19.decode(identifier);
      
      let pubkey: string;
      if (decoded.type === 'nprofile') {
        pubkey = decoded.data.pubkey;
      } else if (decoded.type === 'npub') {
        pubkey = decoded.data;
      } else {
        continue; // Skip non-profile mentions
      }

      // Avoid duplicate p tags
      if (!seenPubkeys.has(pubkey)) {
        seenPubkeys.add(pubkey);
        pTags.push(['p', pubkey]);
      }
    } catch {
      // Ignore invalid mentions
      continue;
    }
  }

  return pTags;
}

/**
 * Convert nostr: mentions back to readable format for display
 */
export function formatMentionsForDisplay(
  content: string, 
  getUserDisplayName: (pubkey: string) => string
): string {
  const mentionRegex = /nostr:(nprofile1[a-z0-9]+|npub1[a-z0-9]+)/gi;
  
  return content.replace(mentionRegex, (match) => {
    try {
      const identifier = match.replace('nostr:', '');
      const decoded = nip19.decode(identifier);
      
      let pubkey: string;
      if (decoded.type === 'nprofile') {
        pubkey = decoded.data.pubkey;
      } else if (decoded.type === 'npub') {
        pubkey = decoded.data;
      } else {
        return match; // Keep original if not a profile mention
      }

      const displayName = getUserDisplayName(pubkey);
      return `@${displayName}`;
    } catch {
      return match; // Keep original if parsing fails
    }
  });
}

/**
 * Check if content contains any mentions
 */
export function hasMentions(content: string): boolean {
  const mentionRegex = /nostr:(nprofile1[a-z0-9]+|npub1[a-z0-9]+)/i;
  return mentionRegex.test(content);
}

/**
 * Get all mentioned pubkeys from content
 */
export function getMentionedPubkeys(content: string): string[] {
  const mentionRegex = /nostr:(nprofile1[a-z0-9]+|npub1[a-z0-9]+)/gi;
  const matches = content.match(mentionRegex);
  const pubkeys: string[] = [];
  
  if (!matches) return pubkeys;

  for (const match of matches) {
    try {
      const identifier = match.replace('nostr:', '');
      const decoded = nip19.decode(identifier);
      
      let pubkey: string;
      if (decoded.type === 'nprofile') {
        pubkey = decoded.data.pubkey;
      } else if (decoded.type === 'npub') {
        pubkey = decoded.data;
      } else {
        continue;
      }

      if (!pubkeys.includes(pubkey)) {
        pubkeys.push(pubkey);
      }
    } catch {
      continue;
    }
  }

  return pubkeys;
}

/**
 * Validate that all mentioned users have corresponding p tags
 */
export function validateMentionTags(content: string, tags: string[][]): boolean {
  const mentionedPubkeys = getMentionedPubkeys(content);
  const pTagPubkeys = tags
    .filter(tag => tag[0] === 'p')
    .map(tag => tag[1]);

  // Every mentioned pubkey should have a corresponding p tag
  return mentionedPubkeys.every(pubkey => pTagPubkeys.includes(pubkey));
}