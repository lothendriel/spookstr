/**
 * Centralized relay configuration for Spookstr
 * All relay URLs should be defined here to avoid duplication
 */

export interface RelayConfig {
  /** Relay WebSocket URL */
  url: string;
  /** Display name for the relay */
  name: string;
  /** Relay priority (lower number = higher priority) */
  priority?: number;
  /** Whether this relay is recommended for general use */
  recommended?: boolean;
  /** Relay categories */
  categories?: ('general' | 'search' | 'spookstr' | 'popular')[];
}

/**
 * Core relays for the Spookstr application
 * These are the primary relays used for feed display and general operations
 */
export const CORE_RELAYS: RelayConfig[] = [
  {
    url: 'wss://spookstr2.nostr1.com',
    name: 'Spookstr2',
    priority: 1,
    recommended: true,
    categories: ['spookstr', 'general']
  },
  {
    url: 'wss://relay.nostr.band',
    name: 'Nostr.Band',
    priority: 2,
    recommended: true,
    categories: ['general', 'search']
  },
  {
    url: 'wss://relay.damus.io',
    name: 'Damus',
    priority: 3,
    recommended: true,
    categories: ['general']
  },
  {
    url: 'wss://relay.primal.net',
    name: 'Primal',
    priority: 4,
    recommended: true,
    categories: ['general']
  },
  {
    url: 'wss://relay.mostr.pub',
    name: 'Mostr',
    priority: 5,
    recommended: true,
    categories: ['general']
  }
];

/**
 * Extended list of popular and reliable relays
 * Used for content discovery, relay hint strategies, and fallback operations
 */
export const POPULAR_RELAYS: RelayConfig[] = [
  ...CORE_RELAYS,
  {
    url: 'wss://nos.lol',
    name: 'Nos.lol',
    priority: 6,
    recommended: true,
    categories: ['general']
  },
  {
    url: 'wss://nostr.wine',
    name: 'Nostr.wine',
    priority: 7,
    categories: ['general']
  },
  {
    url: 'wss://purplepag.es',
    name: 'Purple Pages',
    priority: 8,
    categories: ['general']
  },
  {
    url: 'wss://relay.snort.social',
    name: 'Snort',
    priority: 9,
    categories: ['general']
  },
  {
    url: 'wss://nostr.fmt.wiz.biz',
    name: 'Wiz',
    priority: 10,
    categories: ['general']
  },
  {
    url: 'wss://relay.current.fyi',
    name: 'Current.fyi',
    priority: 11,
    categories: ['general']
  },
  {
    url: 'wss://brb.io',
    name: 'BRB',
    priority: 12,
    categories: ['general']
  },
  {
    url: 'wss://nostr.oxtr.dev',
    name: 'oxtr',
    priority: 13,
    categories: ['general']
  },
  {
    url: 'wss://relay.bitcoiner.social',
    name: 'Bitcoiner Social',
    priority: 14,
    categories: ['general']
  },
  {
    url: 'wss://nostr.mom',
    name: 'Nostr.mom',
    priority: 15,
    categories: ['general']
  },
  {
    url: 'wss://nostr.zebedee.cloud',
    name: 'Zebedee',
    priority: 16,
    categories: ['general']
  }
];

/**
 * High-priority relays for critical operations
 * Used for sequential query strategies and important fetches
 */
export const HIGH_PRIORITY_RELAYS: RelayConfig[] = [
  {
    url: 'wss://spookstr2.nostr1.com',
    name: 'Spookstr2',
    priority: 1
  },
  {
    url: 'wss://relay.damus.io',
    name: 'Damus',
    priority: 2
  },
  {
    url: 'wss://relay.nostr.band',
    name: 'Nostr.Band',
    priority: 3
  },
  {
    url: 'wss://nos.lol',
    name: 'Nos.lol',
    priority: 4
  },
  {
    url: 'wss://relay.primal.net',
    name: 'Primal',
    priority: 5
  }
];

/**
 * Search-optimized relays for content discovery
 * These relays are particularly good for hashtag queries and content search
 */
export const SEARCH_RELAYS: RelayConfig[] = [
  {
    url: 'wss://relay.nostr.band',
    name: 'Nostr.Band',
    priority: 1,
    categories: ['search']
  },
  {
    url: 'wss://relay.damus.io',
    name: 'Damus',
    priority: 2,
    categories: ['search']
  },
  {
    url: 'wss://nos.lol',
    name: 'Nos.lol',
    priority: 3,
    categories: ['search']
  }
];

/**
 * Utility functions for working with relay configurations
 */

/**
 * Get relay URLs from a configuration array
 */
export function getRelayUrls(relays: RelayConfig[]): string[] {
  return relays.map(relay => relay.url);
}

/**
 * Get recommended relays (core relays marked as recommended)
 */
export function getRecommendedRelays(): RelayConfig[] {
  return CORE_RELAYS.filter(relay => relay.recommended);
}

/**
 * Get popular relays for content discovery and fallback operations
 */
export function getPopularRelays(): RelayConfig[] {
  return POPULAR_RELAYS;
}

/**
 * Get high-priority relays for critical operations
 */
export function getHighPriorityRelays(): RelayConfig[] {
  return HIGH_PRIORITY_RELAYS;
}

/**
 * Get search-optimized relays
 */
export function getSearchRelays(): RelayConfig[] {
  return SEARCH_RELAYS;
}

/**
 * Get relays by category
 */
export function getRelaysByCategory(category: RelayConfig['categories'][0]): RelayConfig[] {
  return POPULAR_RELAYS.filter(relay => relay.categories?.includes(category));
}

/**
 * Get relay URLs for App.tsx preset configuration
 */
export function getPresetRelaysForApp(): { name: string; url: string }[] {
  return CORE_RELAYS.map(({ name, url }) => ({ name, url }));
}

/**
 * Get base relays for quoted event strategies
 */
export function getBaseRelaysForQuotedEvents(): string[] {
  return getRelayUrls(HIGH_PRIORITY_RELAYS.slice(0, 5));
}

/**
 * Get expanded relays for quoted event strategies
 */
export function getExpandedRelaysForQuotedEvents(): string[] {
  return getRelayUrls(POPULAR_RELAYS.slice(0, 15));
}