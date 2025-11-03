import { relayHintCache } from './relayHints';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Aggressively populate relay hint cache from events
 * This helps improve quoted event discovery by building a comprehensive
 * map of where events can be found
 */
export class RelayHintPopulator {
  /**
   * Process a single event to extract and store all relay hints
   */
  static processEvent(event: NostrEvent): void {
    try {
      relayHintCache.storeHints(event);
    } catch (error) {
      console.warn('Failed to process event for relay hints:', error);
    }
  }

  /**
   * Process multiple events to build a comprehensive relay hint map
   */
  static processEvents(events: NostrEvent[]): void {
    events.forEach(event => this.processEvent(event));
  }

  /**
   * Extract relay hints from event content (for nostr: URIs)
   */
  static extractContentRelayHints(event: NostrEvent): string[] {
    const hints = new Set<string>();
    
    try {
      // Look for relay URLs in content that might be part of nostr URIs
      const nostrRegex = /nostr:(note1|nevent1|naddr1|npub1|nprofile1)[0-9a-z]+/g;
      let match;
      
      while ((match = nostrRegex.exec(event.content)) !== null) {
        // For now, we can't extract relay hints from content without parsing the actual events
        // but we could potentially add known reliable relays for certain event types
        hints.add('wss://relay.damus.io');
        hints.add('wss://relay.nostr.band');
        hints.add('wss://nos.lol');
      }
    } catch (error) {
      console.warn('Failed to extract content relay hints:', error);
    }
    
    return Array.from(hints);
  }

  /**
   * Get popular relays to add as fallback hints
   */
  static getPopularRelays(): string[] {
    return [
      'wss://relay.damus.io',
      'wss://relay.nostr.band',
      'wss://nos.lol',
      'wss://relay.primal.net',
      'wss://nostr.wine',
      'wss://purplepag.es',
      'wss://relay.snort.social',
      'wss://nostr.fmt.wiz.biz',
      'wss://relay.current.fyi',
      'wss://brb.io',
      'wss://nostr.oxtr.dev',
      'wss://relay.bitcoiner.social',
      'wss://nostr.mom',
      'wss://nostr.zebedee.cloud',
      'wss://spookstr2.nostr1.com'
    ];
  }

  /**
   * Seed the relay hint cache with popular relays for common event patterns
   */
  static seedCache(): void {
    // Add some known reliable relays as fallbacks
    const popularRelays = this.getPopularRelays();
    
    // Create a synthetic event to store these relays as hints
    const syntheticEvent: NostrEvent = {
      id: 'seed-relay-hints',
      pubkey: 'seed',
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: popularRelays.map(relay => ['r', relay]),
      content: 'Seed relay hints',
      sig: ''
    };
    
    this.processEvent(syntheticEvent);
  }

  /**
   * Get cache statistics for debugging
   */
  static getCacheStats(): {
    totalSize: number;
    eventHints: number;
    pubkeyHints: number;
    addressHints: number;
  } {
    return {
      totalSize: relayHintCache.getCacheSize(),
      eventHints: (relayHintCache as any).eventHints?.size || 0,
      pubkeyHints: (relayHintCache as any).pubkeyHints?.size || 0,
      addressHints: (relayHintCache as any).addressHints?.size || 0
    };
  }

  /**
   * Clear the relay hint cache (useful for debugging or memory management)
   */
  static clearCache(): void {
    relayHintCache.clear();
  }
}

// Auto-seed the cache when the module is loaded
if (typeof window !== 'undefined') {
  // Only seed in browser environment
  setTimeout(() => {
    RelayHintPopulator.seedCache();
    console.log('🌱 Relay hint cache seeded with popular relays');
  }, 1000);
}

export default RelayHintPopulator;