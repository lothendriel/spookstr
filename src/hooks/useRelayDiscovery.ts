import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from './useCurrentUser';
import { useUserRelays } from './useUserRelays';
import { useFollow } from './useFollow';
import { useAppContext } from './useAppContext';
import { relayHintCache, extractRelayHints } from '@/lib/relayHints';
import type { NostrEvent, Filter } from '@nostrify/nostrify';
import type { RelayConfig } from '@/contexts/AppContext';

export interface DiscoveredRelay {
  url: string;
  name?: string;
  source: 'nip02-contact' | 'nip65-outbox' | 'event-hint' | 'recent-note' | 'mutual-contact';
  score: number;
  contactCount: number;
  isReachable?: boolean;
  latency?: number;
  lastSeen?: number;
  mutualContacts?: string[];
}

export interface RelayDiscoveryStats {
  totalDiscovered: number;
  reachableCount: number;
  unreachableCount: number;
  contactsAnalyzed: number;
  eventsScanned: number;
  hintsFound: number;
  discoveryProgress: number;
}

export interface RelayDiscoveryState {
  isDiscovering: boolean;
  discoveredRelays: DiscoveredRelay[];
  stats: RelayDiscoveryStats;
  error?: string;
}

/**
 * Advanced relay discovery hook that implements the full discovery pipeline:
 * 1. Fetch user's existing relays and contacts (NIP-02)
 * 2. Analyze contacts' relay preferences (NIP-65)  
 * 3. Scan recent notes for relay hints
 * 4. Test discovered relays for connectivity
 * 5. Rank relays by relevance and reliability
 */
export function useRelayDiscovery() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { follows } = useFollow();
  const { data: userRelays } = useUserRelays(user?.pubkey);
  const queryClient = useQueryClient();

  const [discoveryState, setDiscoveryState] = useState<RelayDiscoveryState>({
    isDiscovering: false,
    discoveredRelays: [],
    stats: {
      totalDiscovered: 0,
      reachableCount: 0,
      unreachableCount: 0,
      contactsAnalyzed: 0,
      eventsScanned: 0,
      hintsFound: 0,
      discoveryProgress: 0,
    },
  });

  // Get user's current relay URLs for filtering
  const getCurrentRelayUrls = useCallback((): string[] => {
    const relayUrls = new Set<string>();
    
    // Add configured relays
    if (config.relays?.length) {
      config.relays.forEach(relay => relayUrls.add(relay.url));
    }
    
    // Add main relay URL
    if (config.relayUrl) {
      relayUrls.add(config.relayUrl);
    }
    
    // Add NIP-65 relays
    if (userRelays?.length) {
      userRelays.forEach(relay => relayUrls.add(relay.url));
    }
    
    // Always include Spookstr relay
    relayUrls.add('wss://spookstr2.nostr1.com');
    
    return Array.from(relayUrls);
  }, [config.relays, config.relayUrl, userRelays]);

  // Test relay connectivity
  const testRelayConnectivity = async (url: string): Promise<{ reachable: boolean; latency?: number; error?: string }> => {
    try {
      const startTime = Date.now();
      const relay = nostr.relay(url);
      
      // Try a simple query with short timeout
      const signal = AbortSignal.timeout(3000);
      await relay.query([{ kinds: [1], limit: 1 }], { signal });
      
      const latency = Date.now() - startTime;
      return { reachable: true, latency };
    } catch (error) {
      return { 
        reachable: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      };
    }
  };

  // Discover relays from contacts' NIP-65 relay lists
  const discoverFromContactRelays = async (contactPubkeys: string[]): Promise<DiscoveredRelay[]> => {
    if (contactPubkeys.length === 0) return [];

    try {
      const signal = AbortSignal.timeout(10000);
      
      // Fetch NIP-65 relay lists for contacts
      const relayListEvents = await nostr.query([
        {
          kinds: [10002],
          authors: contactPubkeys,
          limit: contactPubkeys.length * 2, // Allow for multiple versions per user
        }
      ], { signal });

      const relayCount = new Map<string, { count: number; contacts: Set<string> }>();

      // Count relay usage across contacts
      for (const event of relayListEvents) {
        const relayTags = event.tags.filter(([name]) => name === 'r');
        
        for (const [, relayUrl] of relayTags) {
          if (!relayUrl) continue;
          
          if (!relayCount.has(relayUrl)) {
            relayCount.set(relayUrl, { count: 0, contacts: new Set() });
          }
          
          const entry = relayCount.get(relayUrl)!;
          entry.contacts.add(event.pubkey);
          entry.count = entry.contacts.size;
        }
      }

      // Convert to DiscoveredRelay format
      const discovered: DiscoveredRelay[] = Array.from(relayCount.entries()).map(([url, data]) => ({
        url,
        source: 'nip65-outbox' as const,
        score: data.count * 10, // Higher score for more contacts using this relay
        contactCount: data.count,
        mutualContacts: Array.from(data.contacts),
      }));

      return discovered;
    } catch (error) {
      console.error('Failed to discover relays from contacts:', error);
      return [];
    }
  };

  // Discover relays from recent notes and their hints
  const discoverFromRecentNotes = async (): Promise<DiscoveredRelay[]> => {
    try {
      const signal = AbortSignal.timeout(8000);
      
      // Fetch recent notes from current relays
      const recentEvents = await nostr.query([
        {
          kinds: [1, 6, 16], // Notes, reposts, generic reposts
          limit: 200,
          since: Math.floor(Date.now() / 1000) - (24 * 60 * 60), // Last 24 hours
        }
      ], { signal });

      const relayHints = new Map<string, { count: number; lastSeen: number }>();

      // Extract hints from events
      for (const event of recentEvents) {
        const hints = extractRelayHints(event);
        const eventTime = event.created_at * 1000;
        
        for (const hint of hints) {
          if (!relayHints.has(hint)) {
            relayHints.set(hint, { count: 0, lastSeen: 0 });
          }
          
          const entry = relayHints.get(hint)!;
          entry.count += 1;
          entry.lastSeen = Math.max(entry.lastSeen, eventTime);
        }
        
        // Store hints for future use
        relayHintCache.storeHints(event);
      }

      // Convert to DiscoveredRelay format
      const discovered: DiscoveredRelay[] = Array.from(relayHints.entries()).map(([url, data]) => ({
        url,
        source: 'event-hint' as const,
        score: data.count * 2, // Moderate score for event hints
        contactCount: 0,
        lastSeen: data.lastSeen,
      }));

      return discovered;
    } catch (error) {
      console.error('Failed to discover relays from recent notes:', error);
      return [];
    }
  };

  // Main discovery function
  const discoverRelays = useMutation({
    mutationFn: async (): Promise<DiscoveredRelay[]> => {
      if (!user?.pubkey) {
        throw new Error('You must be logged in to discover relays');
      }

      setDiscoveryState(prev => ({
        ...prev,
        isDiscovering: true,
        error: undefined,
        stats: {
          totalDiscovered: 0,
          reachableCount: 0,
          unreachableCount: 0,
          contactsAnalyzed: 0,
          eventsScanned: 0,
          hintsFound: 0,
          discoveryProgress: 0,
        },
      }));

      const currentRelays = getCurrentRelayUrls();
      const allDiscovered = new Map<string, DiscoveredRelay>();

      try {
        // Step 1: Discover from contacts (25% progress)
        setDiscoveryState(prev => ({
          ...prev,
          stats: { ...prev.stats, discoveryProgress: 10 },
        }));

        const contactPubkeys = follows.map(f => f.pubkey);
        const contactRelays = await discoverFromContactRelays(contactPubkeys);
        
        for (const relay of contactRelays) {
          if (!currentRelays.includes(relay.url)) {
            allDiscovered.set(relay.url, relay);
          }
        }

        setDiscoveryState(prev => ({
          ...prev,
          stats: { 
            ...prev.stats, 
            discoveryProgress: 25,
            contactsAnalyzed: contactPubkeys.length,
          },
        }));

        // Step 2: Discover from recent notes (50% progress)
        const recentNoteRelays = await discoverFromRecentNotes();
        
        for (const relay of recentNoteRelays) {
          if (!currentRelays.includes(relay.url)) {
            if (allDiscovered.has(relay.url)) {
              // Merge with existing entry
              const existing = allDiscovered.get(relay.url)!;
              existing.score += relay.score;
              existing.lastSeen = Math.max(existing.lastSeen || 0, relay.lastSeen || 0);
            } else {
              allDiscovered.set(relay.url, relay);
            }
          }
        }

        setDiscoveryState(prev => ({
          ...prev,
          stats: { 
            ...prev.stats, 
            discoveryProgress: 50,
            eventsScanned: 200,
            hintsFound: recentNoteRelays.length,
          },
        }));

        // Step 3: Test connectivity for top relays (75% progress)
        const sortedRelays = Array.from(allDiscovered.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, 20); // Test top 20 only

        let testedCount = 0;
        for (const relay of sortedRelays) {
          const connectivity = await testRelayConnectivity(relay.url);
          relay.isReachable = connectivity.reachable;
          relay.latency = connectivity.latency;
          
          testedCount++;
          setDiscoveryState(prev => ({
            ...prev,
            stats: { 
              ...prev.stats, 
              discoveryProgress: 50 + (testedCount / sortedRelays.length) * 25,
            },
          }));
        }

        // Step 4: Final ranking and filtering (100% progress)
        const finalRelays = sortedRelays
          .filter(relay => relay.isReachable !== false) // Include untested and reachable
          .sort((a, b) => {
            // Prioritize reachable relays
            if (a.isReachable && !b.isReachable) return -1;
            if (!a.isReachable && b.isReachable) return 1;
            
            // Then by score
            return b.score - a.score;
          })
          .slice(0, 10); // Top 10 results

        const reachableCount = finalRelays.filter(r => r.isReachable === true).length;
        const unreachableCount = finalRelays.filter(r => r.isReachable === false).length;

        setDiscoveryState(prev => ({
          ...prev,
          isDiscovering: false,
          discoveredRelays: finalRelays,
          stats: {
            ...prev.stats,
            totalDiscovered: finalRelays.length,
            reachableCount,
            unreachableCount,
            discoveryProgress: 100,
          },
        }));

        return finalRelays;
      } catch (error) {
        setDiscoveryState(prev => ({
          ...prev,
          isDiscovering: false,
          error: error instanceof Error ? error.message : 'Discovery failed',
        }));
        throw error;
      }
    },
  });

  // Add discovered relay to user's config temporarily
  const addTempRelay = useCallback((relay: DiscoveredRelay, mode: 'read' | 'write' | 'both' = 'both') => {
    // This could update the app config with temporary relays
    // Implementation depends on how you want to handle temporary connections
    console.log('Adding temporary relay:', relay.url, mode);
  }, []);

  // Connect to discovered relays temporarily to fetch missed content
  const connectTemporarily = useMutation({
    mutationFn: async (relayUrls: string[]): Promise<NostrEvent[]> => {
      if (relayUrls.length === 0) return [];

      try {
        const signal = AbortSignal.timeout(15000);
        
        // Create temporary relay group
        const tempGroup = nostr.group(relayUrls);
        
        // Fetch recent content that might have been missed
        const filters: Filter[] = [
          // Recent notes
          {
            kinds: [1],
            limit: 50,
            since: Math.floor(Date.now() / 1000) - (6 * 60 * 60), // Last 6 hours
          },
          // Follow list updates if user is logged in
          ...(user?.pubkey ? [{
            kinds: [3],
            '#p': [user.pubkey],
            limit: 20,
            since: Math.floor(Date.now() / 1000) - (24 * 60 * 60), // Last 24 hours
          }] : []),
        ];

        const events = await tempGroup.query(filters, { signal });
        
        console.log(`Found ${events.length} events from temporary relay connections`);
        
        // Store hints from discovered events
        for (const event of events) {
          relayHintCache.storeHints(event);
        }
        
        return events;
      } catch (error) {
        console.error('Failed to connect temporarily:', error);
        return [];
      }
    },
  });

  return {
    discoveryState,
    discoverRelays: discoverRelays.mutateAsync,
    isDiscovering: discoveryState.isDiscovering || discoverRelays.isPending,
    connectTemporarily: connectTemporarily.mutateAsync,
    isConnecting: connectTemporarily.isPending,
    addTempRelay,
    getCurrentRelayUrls,
  };
}

/**
 * Hook for getting relay discovery recommendations based on current context
 */
export function useRelayRecommendations() {
  const { config } = useAppContext();
  const { follows } = useFollow();
  
  return useQuery({
    queryKey: ['relay-recommendations', config.relays?.length, follows.length],
    queryFn: async () => {
      // Simple recommendations based on app state
      const recommendations: string[] = [];
      
      if (!config.relays || config.relays.length < 3) {
        recommendations.push('Consider adding more relays for better content discovery');
      }
      
      if (follows.length > 50 && (!config.relays || config.relays.length < 5)) {
        recommendations.push('With many follows, additional relays will improve content visibility');
      }
      
      if (!config.searchRelays || config.searchRelays.length === 0) {
        recommendations.push('Add search relays for better hashtag and content discovery');
      }
      
      return recommendations;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}