import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useFollow } from './useFollow';
import { useUserRelays } from './useUserRelays';
import { useRelayHealth } from './useRelayHealth';
import { useAppContext } from './useAppContext';
import type { RelayConfig } from '@/contexts/AppContext';

interface RelayDiscoveryResult {
  discoveredRelays: DiscoveredRelay[];
  insights: RelayNetworkInsights | null;
  isLoading: boolean;
  error?: Error;
}

export interface DiscoveredRelay {
  url: string;
  name?: string;
  contactCount: number;
  contacts: Array<{
    pubkey: string;
    petname?: string;
    mode: 'read' | 'write' | 'both';
  }>;
  health?: {
    status: 'connected' | 'connecting' | 'error' | 'disconnected';
    latency?: number;
    error?: string;
  };
  score: number; // Calculated importance score
  isAlreadyAdded: boolean;
  suggestedMode: 'read' | 'write' | 'both';
  benefits: {
    newContactsReached: number;
    coverageImprovement: number;
    networkOverlap: number;
  };
}

export interface RelayNetworkInsights {
  totalDiscovered: number;
  contentCoverage: number; // % of contacts we can read from
  publishingReach: number; // % of contacts that can read from us
  missingContacts: number;
  suggestedActions: Array<{
    type: 'add_relay' | 'remove_relay' | 'change_mode';
    relay: string;
    reason: string;
    impact: string;
    contactsAffected: number;
  }>;
  networkMap: {
    yourRelays: RelayConfig[];
    contactRelays: DiscoveredRelay[];
    sharedRelays: string[];
    coverageGaps: string[];
  };
}

/**
 * Discover relays used by your network and provide intelligent recommendations
 */
export function useRelayDiscovery(): RelayDiscoveryResult {
  const { nostr } = useNostr();
  const { follows, isLoading: followsLoading } = useFollow();
  const { config } = useAppContext();
  const currentRelays = config.relays || [];

  console.log(`[RelayDiscovery] Hook called with:`, {
    followsCount: follows.length,
    followsLoading,
    currentRelaysCount: currentRelays.length
  });

  // Get relay health for all known relays
  const allRelayUrls = Array.from(
    new Set([
      ...currentRelays.map(r => r.url),
      // We'll add discovered relay URLs here after the first query
    ])
  );

  const { data: discoveredRelays, isLoading: isDiscovering, error: discoveryError } = useQuery({
    queryKey: ['relay-discovery', follows.map(f => f.pubkey).sort()],
    queryFn: async (c) => {
      console.log(`[RelayDiscovery] Starting discovery with ${follows.length} follows`);

      if (follows.length === 0) {
        console.log('[RelayDiscovery] No follows found, returning empty array');
        return [];
      }

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);
      const relayMap = new Map<string, DiscoveredRelay>();

      // Query relay lists for all followed users
      const followPubkeys = follows.map(f => f.pubkey);
      console.log(`[RelayDiscovery] Querying relay lists for ${followPubkeys.length} contacts`);

      // Batch query in chunks to avoid overwhelming relays
      const CHUNK_SIZE = 20;
      const chunks = [];
      for (let i = 0; i < followPubkeys.length; i += CHUNK_SIZE) {
        chunks.push(followPubkeys.slice(i, i + CHUNK_SIZE));
      }

      for (const chunk of chunks) {
        try {
          const events = await nostr.query(
            [
              {
                kinds: [10002], // NIP-65 relay lists
                authors: chunk,
                limit: chunk.length * 2, // Allow for multiple events per author
              },
            ],
            { signal }
          );

          // Process each relay list event
          for (const event of events) {
            const followData = follows.find(f => f.pubkey === event.pubkey);
            if (!followData) continue;

            // Parse r tags
            const rTags = event.tags.filter(([name]) => name === 'r');

            for (const [, url, marker] of rTags) {
              if (!url) continue;

              const mode = marker === 'read' ? 'read' : marker === 'write' ? 'write' : 'both';

              if (!relayMap.has(url)) {
                relayMap.set(url, {
                  url,
                  contactCount: 0,
                  contacts: [],
                  score: 0,
                  isAlreadyAdded: currentRelays.some(r => r.url === url),
                  suggestedMode: 'both',
                  benefits: {
                    newContactsReached: 0,
                    coverageImprovement: 0,
                    networkOverlap: 0,
                  },
                });
              }

              const discoveredRelay = relayMap.get(url)!;

              // Add contact if not already present
              if (!discoveredRelay.contacts.some(c => c.pubkey === event.pubkey)) {
                discoveredRelay.contacts.push({
                  pubkey: event.pubkey,
                  petname: followData.petname,
                  mode,
                });
                discoveredRelay.contactCount++;
              }
            }
          }
        } catch (error) {
          console.warn('Failed to query relay lists for chunk:', error);
        }
      }

      const discoveredCount = Array.from(relayMap.values()).length;
      console.log(`[RelayDiscovery] Discovery complete: found ${discoveredCount} unique relays`);

      return Array.from(relayMap.values());
    },
    enabled: follows.length > 0 && !followsLoading,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Get health data for discovered relays
  const allDiscoveredUrls = discoveredRelays?.map(r => r.url) || [];
  const healthConfigs = allDiscoveredUrls.map(url => ({ url, mode: 'both' as const }));
  const healthStatus = useRelayHealth(healthConfigs);

  // Calculate insights and recommendations
  const insights: RelayNetworkInsights | null = discoveredRelays ? calculateNetworkInsights(
    discoveredRelays,
    currentRelays,
    follows,
    healthStatus
  ) : null;

  // Enrich discovered relays with health data and scores
  const enrichedRelays = discoveredRelays?.map((relay): DiscoveredRelay => {
    const health = healthStatus[relay.url];
    const score = calculateRelayScore(relay, health, currentRelays);
    const benefits = calculateRelayBenefits(relay, currentRelays, follows);

    return {
      ...relay,
      health,
      score,
      benefits,
      suggestedMode: calculateSuggestedMode(relay),
    };
  }).sort((a, b) => b.score - a.score) || [];

  console.log(`[RelayDiscovery] Returning:`, {
    discoveredRelaysCount: enrichedRelays.length,
    hasInsights: !!insights,
    isLoading: isDiscovering,
    discoveryError: discoveryError?.message
  });

  return {
    discoveredRelays: enrichedRelays,
    insights,
    isLoading: isDiscovering,
    error: discoveryError,
  };
}

/**
 * Calculate a score for how valuable a relay would be to add
 */
function calculateRelayScore(
  relay: DiscoveredRelay,
  health: any,
  currentRelays: RelayConfig[]
): number {
  let score = 0;

  // Base score from contact count (0-40 points)
  score += Math.min(relay.contactCount * 4, 40);

  // Health bonus/penalty (-20 to +20 points)
  if (health?.status === 'connected') {
    score += 20;
    // Latency bonus (faster = better)
    if (health.latency) {
      score += Math.max(0, 10 - health.latency / 100); // Up to 10 points for <100ms
    }
  } else if (health?.status === 'error') {
    score -= 20;
  } else if (health?.status === 'connecting') {
    score -= 5; // Slight penalty for slow connections
  }

  // Penalty for already added relays
  if (relay.isAlreadyAdded) {
    score = 0;
  }

  // Diversity bonus - prefer relays not similar to existing ones
  const existingDomains = currentRelays.map(r => new URL(r.url).hostname);
  const newDomain = new URL(relay.url).hostname;
  if (!existingDomains.some(domain => domain === newDomain)) {
    score += 10; // Diversity bonus
  }

  return Math.max(0, score);
}

/**
 * Calculate the benefits of adding a specific relay
 */
function calculateRelayBenefits(
  relay: DiscoveredRelay,
  currentRelays: RelayConfig[],
  follows: Array<{ pubkey: string }>
): DiscoveredRelay['benefits'] {
  const currentlyReachable = new Set<string>();

  // This is a simplified calculation - in reality, we'd need to cross-reference
  // which contacts are reachable through current relays
  const newContactsReached = relay.contactCount; // Simplified
  const coverageImprovement = (newContactsReached / follows.length) * 100;
  const networkOverlap = currentRelays.length > 0 ?
    relay.contactCount / currentRelays.length : relay.contactCount;

  return {
    newContactsReached,
    coverageImprovement: Math.min(coverageImprovement, 100),
    networkOverlap,
  };
}

/**
 * Calculate the suggested mode for a relay based on contact usage patterns
 */
function calculateSuggestedMode(relay: DiscoveredRelay): 'read' | 'write' | 'both' {
  const modes = relay.contacts.map(c => c.mode);
  const readCount = modes.filter(m => m === 'read' || m === 'both').length;
  const writeCount = modes.filter(m => m === 'write' || m === 'both').length;

  // If significantly more people use it for one purpose, suggest that
  if (writeCount > readCount * 1.5) return 'write';
  if (readCount > writeCount * 1.5) return 'read';

  return 'both'; // Default to both if balanced
}

/**
 * Calculate comprehensive network insights and recommendations
 */
function calculateNetworkInsights(
  discoveredRelays: DiscoveredRelay[],
  currentRelays: RelayConfig[],
  follows: Array<{ pubkey: string }>,
  healthStatus: Record<string, any>
): RelayNetworkInsights {
  const totalDiscovered = discoveredRelays.length;

  // Calculate coverage metrics
  const contactsWithKnownRelays = new Set(
    discoveredRelays.flatMap(r => r.contacts.map(c => c.pubkey))
  ).size;

  const contentCoverage = follows.length > 0 ?
    (contactsWithKnownRelays / follows.length) * 100 : 0;

  // Simplified reach calculation
  const publishingReach = Math.min(contentCoverage + 10, 100); // Simplified

  const missingContacts = follows.length - contactsWithKnownRelays;

  // Generate suggested actions
  const suggestedActions = [];

  // Top 3 relay additions
  const topRelays = discoveredRelays
    .filter(r => !r.isAlreadyAdded && r.score > 20)
    .slice(0, 3);

  for (const relay of topRelays) {
    suggestedActions.push({
      type: 'add_relay' as const,
      relay: relay.url,
      reason: `Reaches ${relay.contactCount} of your contacts`,
      impact: `+${relay.benefits.coverageImprovement.toFixed(1)}% coverage`,
      contactsAffected: relay.contactCount,
    });
  }

  // Suggest removing poor performing relays
  const poorRelays = currentRelays.filter(r => {
    const health = healthStatus[r.url];
    return health?.status === 'error' || health?.latency > 2000;
  });

  for (const relay of poorRelays.slice(0, 2)) {
    suggestedActions.push({
      type: 'remove_relay' as const,
      relay: relay.url,
      reason: 'Poor performance or connectivity issues',
      impact: 'Improve overall reliability',
      contactsAffected: 0,
    });
  }

  // Build network map
  const sharedRelays = discoveredRelays
    .filter(r => r.isAlreadyAdded)
    .map(r => r.url);

  const coverageGaps = discoveredRelays
    .filter(r => !r.isAlreadyAdded && r.contactCount >= 3)
    .map(r => r.url);

  return {
    totalDiscovered,
    contentCoverage,
    publishingReach,
    missingContacts,
    suggestedActions,
    networkMap: {
      yourRelays: currentRelays,
      contactRelays: discoveredRelays,
      sharedRelays,
      coverageGaps,
    },
  };
}