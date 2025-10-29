import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useMemo } from 'react';
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

  // Memoize current relays to prevent unnecessary re-renders
  const memoizedCurrentRelays = useMemo(() => currentRelays, [JSON.stringify(currentRelays)]);

  // Memoize follows to prevent infinite loops
  const memoizedFollowsPubkeys = useMemo(() =>
    follows.map(f => f.pubkey).sort(),
    [follows.length, follows.map(f => f.pubkey).join(',')]
  );

  const { data: discoveredRelays, isLoading: isDiscovering, error: discoveryError } = useQuery({
    queryKey: ['relay-discovery', memoizedFollowsPubkeys, memoizedCurrentRelays.length],
    queryFn: async (c) => {
      console.log(`[RelayDiscovery] Starting discovery with ${follows.length} follows`);

      if (follows.length === 0) {
        console.log('[RelayDiscovery] No follows found, returning empty array');
        return [];
      }

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(15000)]);
      const relayMap = new Map<string, DiscoveredRelay>();

      try {
        // Query relay lists for all followed users
        const followPubkeys = memoizedFollowsPubkeys;
        console.log(`[RelayDiscovery] Querying relay lists for ${followPubkeys.length} contacts`);

        // Simplified approach - query fewer contacts but more reliably
        const events = await nostr.query(
          [
            {
              kinds: [10002], // NIP-65 relay lists
              authors: followPubkeys.slice(0, 50), // Limit to first 50 follows for performance
              limit: 100, // Reasonable limit
            },
          ],
          { signal }
        );

        console.log(`[RelayDiscovery] Received ${events.length} relay list events`);

        // Process each relay list event
        for (const event of events) {
          const followData = follows.find(f => f.pubkey === event.pubkey);
          if (!followData) continue;

          // Parse r tags
          const rTags = event.tags.filter(([name]) => name === 'r');

          for (const [, url, marker] of rTags) {
            if (!url || typeof url !== 'string') continue;

            // Basic URL validation before processing
            if (!url.includes('.') || url.length < 10) {
              console.warn('[RelayDiscovery] Skipping invalid URL:', url);
              continue;
            }

            const mode = marker === 'read' ? 'read' : marker === 'write' ? 'write' : 'both';

            if (!relayMap.has(url)) {
              relayMap.set(url, {
                url,
                contactCount: 0,
                contacts: [],
                score: 0,
                isAlreadyAdded: memoizedCurrentRelays.some(r => r.url === url),
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

        const discoveredCount = Array.from(relayMap.values()).length;
        console.log(`[RelayDiscovery] Discovery complete: found ${discoveredCount} unique relays from ${events.length} events`);

        return Array.from(relayMap.values());
      } catch (error) {
        console.error('[RelayDiscovery] Discovery failed:', error);
        throw error;
      }
    },
    enabled: follows.length > 0 && !followsLoading,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1, // Only retry once to avoid spam
  });

  // Get health data for discovered relays - memoize to prevent unnecessary queries
  const healthConfigs = useMemo(() => {
    if (!discoveredRelays) return [];
    const allDiscoveredUrls = discoveredRelays.map(r => r.url);
    return allDiscoveredUrls.map(url => ({ url, mode: 'both' as const }));
  }, [discoveredRelays?.length, discoveredRelays?.map(r => r.url).join(',')]);

  const healthStatus = useRelayHealth(healthConfigs);

  // Calculate insights and recommendations - memoize expensive calculation
  const insights: RelayNetworkInsights | null = useMemo(() => {
    if (!discoveredRelays) return null;
    return calculateNetworkInsights(
      discoveredRelays,
      memoizedCurrentRelays,
      follows,
      healthStatus
    );
  }, [discoveredRelays, memoizedCurrentRelays, follows.length, Object.keys(healthStatus).length]);

  // Enrich discovered relays with health data and scores - memoize expensive calculation
  const enrichedRelays = useMemo(() => {
    if (!discoveredRelays) return [];

    return discoveredRelays.map((relay): DiscoveredRelay => {
      const health = healthStatus[relay.url];
      const score = calculateRelayScore(relay, health, memoizedCurrentRelays);
      const benefits = calculateRelayBenefits(relay, memoizedCurrentRelays, follows);

      return {
        ...relay,
        health,
        score,
        benefits,
        suggestedMode: calculateSuggestedMode(relay),
      };
    }).sort((a, b) => b.score - a.score);
  }, [discoveredRelays, healthStatus, memoizedCurrentRelays, follows.length]);

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
  try {
    const existingDomains = currentRelays
      .map(r => {
        try {
          return new URL(r.url).hostname;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as string[];

    const newDomain = new URL(relay.url).hostname;
    if (!existingDomains.some(domain => domain === newDomain)) {
      score += 10; // Diversity bonus
    }
  } catch (error) {
    console.warn('[RelayDiscovery] Invalid URL in diversity check:', relay.url, error);
    // Don't add diversity bonus for invalid URLs
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