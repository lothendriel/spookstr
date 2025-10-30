import type { NostrEvent, Filter } from '@nostrify/nostrify';

/**
 * Extract relay hints from event tags
 * 
 * Relay hints can be found in:
 * - 'e' tags: ["e", "event-id", "relay-url", "marker"]
 * - 'p' tags: ["p", "pubkey", "relay-url", "petname"]
 * - 'a' tags: ["a", "kind:pubkey:d-tag", "relay-url", "marker"]
 * - 'r' tags: ["r", "relay-url", "marker"] (NIP-65)
 */
export function extractRelayHints(event: NostrEvent): string[] {
  const hints = new Set<string>();

  for (const tag of event.tags) {
    const [tagName, ...rest] = tag;
    
    switch (tagName) {
      case 'e':
      case 'p':
      case 'a': {
        // Format: ["e/p/a", "id/pubkey/coordinate", "relay-url", "marker"]
        const relayUrl = rest[1];
        if (relayUrl && isValidRelayUrl(relayUrl)) {
          hints.add(relayUrl);
        }
        break;
      }
      case 'r': {
        // Format: ["r", "relay-url", "marker"]
        const relayUrl = rest[0];
        if (relayUrl && isValidRelayUrl(relayUrl)) {
          hints.add(relayUrl);
        }
        break;
      }
    }
  }
  
  return Array.from(hints);
}

/**
 * Extract event IDs that have relay hints from an event
 * Returns a map of event ID -> relay URLs
 */
export function extractEventRelayHints(event: NostrEvent): Map<string, string[]> {
  const eventHints = new Map<string, string[]>();

  for (const tag of event.tags) {
    const [tagName, eventId, relayUrl] = tag;
    
    if (tagName === 'e' && eventId && relayUrl && isValidRelayUrl(relayUrl)) {
      if (!eventHints.has(eventId)) {
        eventHints.set(eventId, []);
      }
      eventHints.get(eventId)!.push(relayUrl);
    }
  }
  
  return eventHints;
}

/**
 * Extract pubkey relay hints from an event
 * Returns a map of pubkey -> relay URLs
 */
export function extractPubkeyRelayHints(event: NostrEvent): Map<string, string[]> {
  const pubkeyHints = new Map<string, string[]>();

  for (const tag of event.tags) {
    const [tagName, pubkey, relayUrl] = tag;
    
    if (tagName === 'p' && pubkey && relayUrl && isValidRelayUrl(relayUrl)) {
      if (!pubkeyHints.has(pubkey)) {
        pubkeyHints.set(pubkey, []);
      }
      pubkeyHints.get(pubkey)!.push(relayUrl);
    }
  }
  
  return pubkeyHints;
}

/**
 * Extract addressable event coordinate relay hints
 * Returns a map of coordinate -> relay URLs
 */
export function extractAddressableRelayHints(event: NostrEvent): Map<string, string[]> {
  const addressHints = new Map<string, string[]>();

  for (const tag of event.tags) {
    const [tagName, coordinate, relayUrl] = tag;
    
    if (tagName === 'a' && coordinate && relayUrl && isValidRelayUrl(relayUrl)) {
      if (!addressHints.has(coordinate)) {
        addressHints.set(coordinate, []);
      }
      addressHints.get(coordinate)!.push(relayUrl);
    }
  }
  
  return addressHints;
}

/**
 * Basic validation for relay URLs
 */
function isValidRelayUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
  } catch {
    return false;
  }
}

/**
 * Merge relay hints with existing relay lists, ensuring no duplicates
 * and limiting total relay count for performance
 */
export function mergeRelayHints(
  baseRelays: string[], 
  hints: string[], 
  maxRelays: number = 5
): string[] {
  const relaySet = new Set(baseRelays);
  
  // Add hints until we reach the limit
  for (const hint of hints) {
    if (relaySet.size >= maxRelays) break;
    relaySet.add(hint);
  }
  
  return Array.from(relaySet);
}

/**
 * Create enhanced filters with relay hints for better content discovery
 * This helps when querying for specific events, profiles, or addressable events
 */
export interface RelayHintContext {
  /** Event IDs that need to be fetched with their relay hints */
  eventIds?: string[];
  /** Pubkeys that need to be fetched with their relay hints */  
  pubkeys?: string[];
  /** Addressable coordinates that need to be fetched with their relay hints */
  addresses?: string[];
  /** Base relays to always include */
  baseRelays?: string[];
  /** Maximum number of relays to use per query */
  maxRelays?: number;
}

/**
 * Storage for relay hints discovered during app usage
 * This creates a temporary cache of relay hints to improve subsequent queries
 */
class RelayHintCache {
  private eventHints = new Map<string, string[]>();
  private pubkeyHints = new Map<string, string[]>();
  private addressHints = new Map<string, string[]>();
  private maxCacheSize = 1000; // Prevent memory bloat

  /**
   * Store relay hints from a processed event
   */
  storeHints(event: NostrEvent): void {
    // Store event relay hints
    const eventHints = extractEventRelayHints(event);
    for (const [eventId, relays] of eventHints) {
      this.addEventHints(eventId, relays);
    }

    // Store pubkey relay hints
    const pubkeyHints = extractPubkeyRelayHints(event);
    for (const [pubkey, relays] of pubkeyHints) {
      this.addPubkeyHints(pubkey, relays);
    }

    // Store addressable relay hints
    const addressHints = extractAddressableRelayHints(event);
    for (const [address, relays] of addressHints) {
      this.addAddressHints(address, relays);
    }

    // Also store hints from the event itself (where it might be found)
    const generalHints = extractRelayHints(event);
    if (generalHints.length > 0) {
      this.addEventHints(event.id, generalHints);
    }
  }

  /**
   * Get relay hints for specific event IDs
   */
  getEventHints(eventIds: string[]): string[] {
    const hints = new Set<string>();
    for (const eventId of eventIds) {
      const relays = this.eventHints.get(eventId);
      if (relays) {
        relays.forEach(r => hints.add(r));
      }
    }
    return Array.from(hints);
  }

  /**
   * Get relay hints for specific pubkeys
   */
  getPubkeyHints(pubkeys: string[]): string[] {
    const hints = new Set<string>();
    for (const pubkey of pubkeys) {
      const relays = this.pubkeyHints.get(pubkey);
      if (relays) {
        relays.forEach(r => hints.add(r));
      }
    }
    return Array.from(hints);
  }

  /**
   * Get relay hints for specific addressable coordinates
   */
  getAddressHints(addresses: string[]): string[] {
    const hints = new Set<string>();
    for (const address of addresses) {
      const relays = this.addressHints.get(address);
      if (relays) {
        relays.forEach(r => hints.add(r));
      }
    }
    return Array.from(hints);
  }

  private addEventHints(eventId: string, relays: string[]): void {
    if (this.eventHints.size >= this.maxCacheSize) {
      // Remove oldest entry (simple FIFO)
      const firstKey = this.eventHints.keys().next().value;
      this.eventHints.delete(firstKey);
    }
    
    const existing = this.eventHints.get(eventId) || [];
    const merged = Array.from(new Set([...existing, ...relays]));
    this.eventHints.set(eventId, merged);
  }

  private addPubkeyHints(pubkey: string, relays: string[]): void {
    if (this.pubkeyHints.size >= this.maxCacheSize) {
      const firstKey = this.pubkeyHints.keys().next().value;
      this.pubkeyHints.delete(firstKey);
    }
    
    const existing = this.pubkeyHints.get(pubkey) || [];
    const merged = Array.from(new Set([...existing, ...relays]));
    this.pubkeyHints.set(pubkey, merged);
  }

  private addAddressHints(address: string, relays: string[]): void {
    if (this.addressHints.size >= this.maxCacheSize) {
      const firstKey = this.addressHints.keys().next().value;
      this.addressHints.delete(firstKey);
    }
    
    const existing = this.addressHints.get(address) || [];
    const merged = Array.from(new Set([...existing, ...relays]));
    this.addressHints.set(address, merged);
  }

  /**
   * Get enhanced relay list for a query context
   */
  getEnhancedRelays(context: RelayHintContext): string[] {
    const { eventIds, pubkeys, addresses, baseRelays = [], maxRelays = 5 } = context;
    
    const hints = new Set<string>();
    
    // Add base relays first
    baseRelays.forEach(r => hints.add(r));
    
    // Add hints from cache
    if (eventIds?.length) {
      this.getEventHints(eventIds).forEach(r => hints.add(r));
    }
    
    if (pubkeys?.length) {
      this.getPubkeyHints(pubkeys).forEach(r => hints.add(r));
    }
    
    if (addresses?.length) {
      this.getAddressHints(addresses).forEach(r => hints.add(r));
    }

    // Limit to maxRelays
    return Array.from(hints).slice(0, maxRelays);
  }

  /**
   * Clear the cache (useful for memory management)
   */
  clear(): void {
    this.eventHints.clear();
    this.pubkeyHints.clear();
    this.addressHints.clear();
  }
}

// Global instance for the app
export const relayHintCache = new RelayHintCache();

/**
 * Enhanced query function that automatically includes relay hints
 * This should be used for queries that reference specific events, pubkeys, or addresses
 */
export function enhanceFiltersWithHints(
  filters: Filter[], 
  baseRelays: string[], 
  maxRelays: number = 5
): { enhancedRelays: string[]; shouldUseHints: boolean } {
  // Collect all referenced IDs from filters
  const eventIds = new Set<string>();
  const pubkeys = new Set<string>();
  const addresses = new Set<string>();
  
  let shouldUseHints = false;
  
  for (const filter of filters) {
    // Collect event IDs
    if (filter.ids?.length) {
      filter.ids.forEach(id => eventIds.add(id));
      shouldUseHints = true;
    }
    
    if (filter['#e']?.length) {
      filter['#e'].forEach(id => eventIds.add(id));
      shouldUseHints = true;
    }
    
    // Collect pubkeys
    if (filter.authors?.length) {
      filter.authors.forEach(pk => pubkeys.add(pk));
      // Don't set shouldUseHints for authors - they have NIP-65 relay lists
    }
    
    if (filter['#p']?.length) {
      filter['#p'].forEach(pk => pubkeys.add(pk));
      shouldUseHints = true;
    }
    
    // Collect addressable coordinates
    if (filter['#a']?.length) {
      filter['#a'].forEach(addr => addresses.add(addr));
      shouldUseHints = true;
    }
  }
  
  if (!shouldUseHints) {
    return { enhancedRelays: baseRelays, shouldUseHints: false };
  }
  
  const enhancedRelays = relayHintCache.getEnhancedRelays({
    eventIds: Array.from(eventIds),
    pubkeys: Array.from(pubkeys),
    addresses: Array.from(addresses),
    baseRelays,
    maxRelays,
  });
  
  return { enhancedRelays, shouldUseHints: true };
}