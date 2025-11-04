/**
 * Offline-enabled Nostr Hook
 *
 * Extends the standard useNostr hook with offline capabilities:
 * - Automatic caching of query results
 * - Offline-first data retrieval
 * - Queue publishing actions when offline
 * - Seamless online/offline transitions
 */

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';
import { useOfflineSync, type SyncStatus } from '@/lib/offlineSync';
import { useOfflineStorage } from '@/lib/offlineStorage';

interface OfflineNostrQuery {
  queryKey: any[];
  filters: any[];
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
    refetchInterval?: number | false;
    signal?: AbortSignal;
  };
}

interface OfflineQueryResult<T = NostrEvent[]> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isOnline: boolean;
  isCached: boolean;
  refetch: () => Promise<any>;
}

/**
 * Enhanced Nostr query hook with offline support
 */
export function useOfflineNostrQuery<T = NostrEvent[]>({
  queryKey,
  filters,
  options = {}
}: OfflineNostrQuery): OfflineQueryResult<T> {
  const { nostr } = useNostr();
  const { getCachedEvents, cacheEvents } = useOfflineSync();
  const queryClient = useQueryClient();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSync: null,
    pendingActions: 0,
    failedActions: 0,
    syncProgress: 0
  });

  // Subscribe to sync status changes
  useEffect(() => {
    const { sync } = useOfflineSync();
    const unsubscribe = sync.onSyncStatusChange(setSyncStatus);
    return unsubscribe;
  }, []);

  const query = useQuery({
    queryKey: ['offline-nostr', ...queryKey],
    queryFn: async ({ signal: querySignal }) => {
      const signal = AbortSignal.any([
        querySignal,
        options.signal || new AbortController().signal,
        AbortSignal.timeout(10000)
      ]);

      try {
        if (syncStatus.isOnline) {
          // Online: Query from network and cache results
          const events = await nostr.query(filters, { signal });

          // Cache events for offline access
          if (events.length > 0) {
            await cacheEvents(events);
          }

          return events as T;
        } else {
          // Offline: Return cached data

          // Convert filters to offline storage format
          const offlineFilters = filters.reduce((acc, filter) => {
            return {
              ...acc,
              kinds: [...(acc.kinds || []), ...(filter.kinds || [])],
              authors: [...(acc.authors || []), ...(filter.authors || [])],
              ids: [...(acc.ids || []), ...(filter.ids || [])],
              since: Math.min(acc.since || Infinity, filter.since || Infinity),
              until: Math.max(acc.until || 0, filter.until || 0),
              limit: Math.max(acc.limit || 0, filter.limit || 0),
              tags: { ...acc.tags, ...filter }
            };
          }, {});

          const cachedEvents = await getCachedEvents(offlineFilters);

          return cachedEvents as T;
        }
      } catch (error) {

        // On error, try to return cached data
        const offlineFilters = filters.reduce((acc, filter) => {
          return {
            ...acc,
            kinds: [...(acc.kinds || []), ...(filter.kinds || [])],
            authors: [...(acc.authors || []), ...(filter.authors || [])],
            limit: Math.max(acc.limit || 0, filter.limit || 0)
          };
        }, {});

        const cachedEvents = await getCachedEvents(offlineFilters);
        if (cachedEvents.length > 0) {
          return cachedEvents as T;
        }

        throw error;
      }
    },
    enabled: options.enabled !== false,
    staleTime: options.staleTime || (syncStatus.isOnline ? 60000 : Infinity), // Never stale when offline
    gcTime: options.gcTime || 600000, // 10 minutes
    refetchInterval: syncStatus.isOnline ? options.refetchInterval : false, // No refetch when offline
    retry: syncStatus.isOnline ? 1 : 0, // No retry when offline
  });

  return {
    ...query,
    isOnline: syncStatus.isOnline,
    isCached: !syncStatus.isOnline || query.data !== undefined,
  };
}

/**
 * Enhanced Nostr publish hook with offline support
 */
export function useOfflineNostrPublish() {
  const { nostr } = useNostr();
  const { queueAction } = useOfflineSync();
  const queryClient = useQueryClient();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSync: null,
    pendingActions: 0,
    failedActions: 0,
    syncProgress: 0
  });

  // Subscribe to sync status changes
  useEffect(() => {
    const { sync } = useOfflineSync();
    const unsubscribe = sync.onSyncStatusChange(setSyncStatus);
    return unsubscribe;
  }, []);

  return useMutation({
    mutationFn: async (eventData: Partial<NostrEvent>) => {
      if (syncStatus.isOnline) {
        // Online: Publish immediately
        const result = await nostr.event(eventData);

        // Cache the published event
        if (result) {
          const { sync } = useOfflineSync();
          await sync.cacheEvents([result]);
        }

        return result;
      } else {
        // Offline: Queue for later
        const actionId = await queueAction('publish', eventData);

        // Create a temporary event with offline ID for immediate UI update
        const tempEvent: NostrEvent = {
          id: `offline-${actionId}`,
          pubkey: eventData.pubkey || '',
          created_at: eventData.created_at || Math.floor(Date.now() / 1000),
          kind: eventData.kind || 1,
          tags: eventData.tags || [],
          content: eventData.content || '',
          sig: 'offline-signature'
        };

        // Update relevant queries with optimistic update
        queryClient.setQueryData(['offline-nostr', 'feed'], (oldData: NostrEvent[] | undefined) => {
          if (!oldData) return [tempEvent];
          return [tempEvent, ...oldData];
        });

        return tempEvent;
      }
    },
    onSuccess: (data) => {
      // Invalidate relevant queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['offline-nostr'] });
    },
  });
}

/**
 * Enhanced interaction hook (likes, reposts, etc.) with offline support
 */
export function useOfflineNostrInteraction() {
  const { nostr } = useNostr();
  const { queueAction } = useOfflineSync();
  const queryClient = useQueryClient();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSync: null,
    pendingActions: 0,
    failedActions: 0,
    syncProgress: 0
  });

  // Subscribe to sync status changes
  useEffect(() => {
    const { sync } = useOfflineSync();
    const unsubscribe = sync.onSyncStatusChange(setSyncStatus);
    return unsubscribe;
  }, []);

  return useMutation({
    mutationFn: async ({ type, targetEvent, content = '' }: {
      type: 'like' | 'repost' | 'comment';
      targetEvent: NostrEvent;
      content?: string;
    }) => {
      let kind: number;
      let tags: string[][];

      switch (type) {
        case 'like':
          kind = 7;
          tags = [['e', targetEvent.id], ['p', targetEvent.pubkey]];
          break;
        case 'repost':
          kind = 6;
          tags = [['e', targetEvent.id], ['p', targetEvent.pubkey]];
          break;
        case 'comment':
          kind = 1111;
          tags = [['e', targetEvent.id], ['p', targetEvent.pubkey]];
          break;
        default:
          throw new Error(`Unknown interaction type: ${type}`);
      }

      const eventData = {
        kind,
        content,
        tags,
        created_at: Math.floor(Date.now() / 1000),
      };

      if (syncStatus.isOnline) {
        // Online: Publish immediately
        return await nostr.event(eventData);
      } else {
        // Offline: Queue for later
        const actionId = await queueAction('interaction', eventData);

        // Optimistic update - increment interaction count in UI
        queryClient.setQueryData(['post-interactions', targetEvent.id], (oldData: any) => {
          if (!oldData) return { likes: 0, reposts: 0, comments: 0, zaps: 0 };

          const newData = { ...oldData };
          switch (type) {
            case 'like':
              newData.likes++;
              break;
            case 'repost':
              newData.reposts++;
              break;
            case 'comment':
              newData.comments++;
              break;
          }
          return newData;
        });

        return { id: `offline-${actionId}`, offline: true };
      }
    },
    onSuccess: (data, variables) => {
      // Success handled by UI updates
    },
    onError: (error, variables) => {
      // Revert optimistic update on error
      if (!syncStatus.isOnline) {
        queryClient.setQueryData(['post-interactions', variables.targetEvent.id], (oldData: any) => {
          if (!oldData) return { likes: 0, reposts: 0, comments: 0, zaps: 0 };

          const newData = { ...oldData };
          switch (variables.type) {
            case 'like':
              newData.likes = Math.max(0, newData.likes - 1);
              break;
            case 'repost':
              newData.reposts = Math.max(0, newData.reposts - 1);
              break;
            case 'comment':
              newData.comments = Math.max(0, newData.comments - 1);
              break;
          }
          return newData;
        });
      }
    },
  });
}

/**
 * Hook to get current offline status and sync information
 */
export function useOfflineStatus() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSync: null,
    pendingActions: 0,
    failedActions: 0,
    syncProgress: 0
  });

  useEffect(() => {
    const { sync } = useOfflineSync();
    const unsubscribe = sync.onSyncStatusChange(setSyncStatus);
    return unsubscribe;
  }, []);

  return {
    ...syncStatus,
    hasOfflineData: syncStatus.pendingActions > 0,
  };
}

/**
 * Hook for offline storage statistics
 */
export function useOfflineStats() {
  const { storage } = useOfflineStorage();
  const [stats, setStats] = useState({
    events: 0,
    actions: 0,
    profiles: 0,
    totalSize: 0,
    lastSync: 0
  });

  useEffect(() => {
    const updateStats = async () => {
      try {
        const newStats = await storage.getStats();
        setStats(newStats);
      } catch (error) {
        // Silent error handling for stats
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [storage]);

  return stats;
}