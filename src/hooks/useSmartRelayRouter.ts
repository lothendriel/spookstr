import { useMemo } from 'react';
import { useAppContext } from './useAppContext';
import { useUserRelays } from './useUserRelays';
import { useRelayHealth } from './useRelayHealth';
import type { RelayConfig, RelayPriority } from '@/contexts/AppContext';

export interface SmartRelayRouting {
  /** Get relays for feed queries (fast, reliable relays only) */
  getFeedRelays: () => string[];
  
  /** Get relays for querying a specific user's content (their write relays) */
  getUserContentRelays: (pubkey: string) => string[];
  
  /** Get relays for sending mentions to a user (their read relays) */
  getUserMentionRelays: (pubkey: string) => string[];
  
  /** Get relays for publishing your content (your write relays) */
  getPublishRelays: () => string[];
  
  /** Get relays for receiving mentions (your read relays) */
  getNotificationRelays: () => string[];
  
  /** Get relays for search and discovery */
  getSearchRelays: () => string[];
  
  /** Get relays with performance scores for optimization */
  getRelayPerformance: () => Array<RelayConfig & { score: number }>;
}

/**
 * Smart relay router implementing NIP-65 outbox model with performance optimization
 */
export function useSmartRelayRouter(): SmartRelayRouting {
  const { config } = useAppContext();
  const relayConfigs = config.relays || [];
  
  // Get health data for all configured relays
  const healthStatus = useRelayHealth(relayConfigs);

  // Calculate performance scores for each relay
  const relayPerformance = useMemo(() => {
    return relayConfigs.map(relay => {
      const health = healthStatus[relay.url];
      let score = 50; // Base score
      
      // Health status impact
      if (health?.status === 'connected') score += 30;
      else if (health?.status === 'connecting') score += 10;
      else if (health?.status === 'error') score -= 40;
      
      // Latency impact (lower latency = higher score)
      if (health?.latency) {
        if (health.latency < 100) score += 20;
        else if (health.latency < 300) score += 10;
        else if (health.latency < 1000) score -= 10;
        else score -= 30;
      }
      
      // Reliability score impact
      if (relay.reliabilityScore) {
        score += (relay.reliabilityScore - 50) * 0.4; // -20 to +20 points
      }
      
      // Priority impact
      if (relay.priority === 'primary') score += 15;
      else if (relay.priority === 'backup') score -= 10;
      
      return { ...relay, score: Math.max(0, Math.min(100, score)) };
    }).sort((a, b) => b.score - a.score);
  }, [relayConfigs, healthStatus]);

  // Get fast, reliable relays for feed queries (max 3)
  const getFeedRelays = (): string[] => {
    const primaryRelays = relayPerformance
      .filter(r => (r.mode === 'read' || r.mode === 'both') && r.score >= 60)
      .slice(0, 3)
      .map(r => r.url);
    
    // Fallback to any read relays if no good ones found
    if (primaryRelays.length === 0) {
      return relayConfigs
        .filter(r => r.mode === 'read' || r.mode === 'both')
        .slice(0, 2)
        .map(r => r.url);
    }
    
    return primaryRelays;
  };

  // Get relays for publishing (all write relays, prioritized by performance)
  const getPublishRelays = (): string[] => {
    return relayPerformance
      .filter(r => r.mode === 'write' || r.mode === 'both')
      .map(r => r.url);
  };

  // Get your read relays for notifications
  const getNotificationRelays = (): string[] => {
    return relayPerformance
      .filter(r => r.mode === 'read' || r.mode === 'both')
      .map(r => r.url);
  };

  // Get search relays
  const getSearchRelays = (): string[] => {
    return config.searchRelays || [];
  };

  // Cache for user relay lookups
  const userRelayCache = useMemo(() => new Map<string, { write: string[], read: string[] }>(), []);

  const getUserContentRelays = (pubkey: string): string[] => {
    // Check cache first
    const cached = userRelayCache.get(pubkey);
    if (cached) return cached.write;

    // For now, return fallback relays (this would be enhanced with actual NIP-65 queries)
    // In a full implementation, this would query the user's relay list
    return getFeedRelays(); // Fallback to feed relays
  };

  const getUserMentionRelays = (pubkey: string): string[] => {
    // Check cache first  
    const cached = userRelayCache.get(pubkey);
    if (cached) return cached.read;

    // For now, return fallback relays
    return getNotificationRelays(); // Fallback to notification relays
  };

  return {
    getFeedRelays,
    getUserContentRelays,
    getUserMentionRelays,
    getPublishRelays,
    getNotificationRelays,
    getSearchRelays,
    getRelayPerformance: () => relayPerformance,
  };
}

/**
 * Hook for querying a specific user's relay preferences
 * This would be used to populate the cache in getUserContentRelays/getUserMentionRelays
 */
export function useUserRelayPreferences(pubkey: string) {
  const { data: userRelays } = useUserRelays(pubkey);
  
  return useMemo(() => {
    if (!userRelays) return { write: [], read: [] };
    
    const write = userRelays
      .filter(r => r.mode === 'write' || r.mode === 'both')
      .map(r => r.url);
      
    const read = userRelays
      .filter(r => r.mode === 'read' || r.mode === 'both')
      .map(r => r.url);
    
    return { write, read };
  }, [userRelays]);
}