import type { NostrMetadata } from '@nostrify/nostrify';
import { genUserName } from './genUserName';

/**
 * Get the display name for a user with the correct priority:
 * 1. display_name (if available)
 * 2. name (if available)
 * 3. Generated fallback name based on pubkey
 *
 * @param metadata - The user's Nostr metadata (kind 0)
 * @param pubkey - The user's public key (used for fallback generation)
 * @returns The display name to show for the user
 */
export function getDisplayName(metadata: NostrMetadata | undefined, pubkey: string): string {
  // Validate pubkey input
  if (!pubkey || typeof pubkey !== 'string') {
    return 'Unknown User';
  }

  if (metadata?.display_name) {
    return metadata.display_name;
  }

  if (metadata?.name) {
    return metadata.name;
  }

  return genUserName(pubkey);
}
