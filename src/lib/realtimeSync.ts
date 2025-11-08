/**
 * Real-time Data Synchronization
 * Manages real-time updates from Nostr relays with intelligent caching
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent, Filter } from '@nostrify/nostrify';
import { queryKeys } from './queryKeys';

interface SyncOptions {
  enabled?: boolean;
  filters: Filter[];
  onEvent?: (event: NostrEvent) => void;
  onError?: (error: Error) => void;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

/**
 * Real-time event subscription with automatic reconnection
 */
export function useRealtimeSubscription(options: SyncOptions) {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();
  const {
    enabled = true,
    filters,
    onEvent,
    onError,
    reconnectDelay = 5000,
    maxReconnectAttempts = 5
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const subscriptionRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const cleanup = useCallback(() => {
    if (subscriptionRef.current) {
      try {
        subscriptionRef.current.close?.();
      } catch (error) {
        console.error('Failed to close subscription:', error);
      }
      subscriptionRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!enabled) return;

    cleanup();

    try {
      setIsConnected(false);

      const subscription = nostr.req(filters);
      subscriptionRef.current = subscription;

      for await (const event of subscription) {
        setIsConnected(true);
        setReconnectAttempts(0);

        // Handle new event
        onEvent?.(event);

        // Update query cache based on event kind
        updateCacheForEvent(event, queryClient);
      }
    } catch (error) {
      console.error('Realtime subscription error:', error);
      setIsConnected(false);
      onError?.(error as Error);

      // Attempt reconnection
      if (reconnectAttempts < maxReconnectAttempts) {
        setReconnectAttempts(prev => prev + 1);
        reconnectTimeoutRef.current = setTimeout(connect, reconnectDelay);
      }
    }
  }, [enabled, filters, onEvent, onError, reconnectDelay, maxReconnectAttempts, reconnectAttempts, nostr, queryClient, cleanup]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  return {
    isConnected,
    reconnectAttempts,
    reconnect: connect
  };
}

/**
 * Update query cache based on incoming event
 */
function updateCacheForEvent(event: NostrEvent, queryClient: any) {
  // Update author cache for kind 0 (profile metadata)
  if (event.kind === 0) {
    const authorKey = queryKeys.author.details(event.pubkey);
    queryClient.invalidateQueries({ queryKey: authorKey });
  }

  // Update interactions for kind 7 (likes)
  if (event.kind === 7) {
    const eTag = event.tags.find(([name]) => name === 'e')?.[1];
    if (eTag) {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.interactions.byEvent(eTag) 
      });
    }
  }

  // Update interactions for kind 6 (reposts)
  if (event.kind === 6) {
    const eTag = event.tags.find(([name]) => name === 'e')?.[1];
    if (eTag) {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.interactions.byEvent(eTag) 
      });
    }
  }

  // Update feed for kind 1 (notes)
  if (event.kind === 1) {
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.feed.main() 
    });
  }

  // Update comments for replies
  const isReply = event.tags.some(([name]) => name === 'e');
  if (isReply && (event.kind === 1 || event.kind === 1111)) {
    const rootTag = event.tags.find(([name, _, marker]) => 
      name === 'e' && marker === 'root'
    )?.[1];
    
    if (rootTag) {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.comment.byRoot(rootTag) 
      });
    }
  }

  // Update zaps for kind 9735
  if (event.kind === 9735) {
    const eTag = event.tags.find(([name]) => name === 'e')?.[1];
    if (eTag) {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.post.zaps(eTag) 
      });
    }
  }
}

/**
 * Hook for feed real-time updates
 */
export function useFeedRealtimeUpdates(options: {
  kinds?: number[];
  enabled?: boolean;
  onNewPost?: (event: NostrEvent) => void;
}) {
  const { kinds = [1], enabled = true, onNewPost } = options;
  const [newPostCount, setNewPostCount] = useState(0);
  const [latestEvent, setLatestEvent] = useState<NostrEvent | null>(null);

  const handleEvent = useCallback((event: NostrEvent) => {
    setLatestEvent(event);
    setNewPostCount(prev => prev + 1);
    onNewPost?.(event);
  }, [onNewPost]);

  const { isConnected } = useRealtimeSubscription({
    enabled,
    filters: [{ kinds, limit: 0 }], // limit: 0 means only new events
    onEvent: handleEvent
  });

  const resetNewPostCount = useCallback(() => {
    setNewPostCount(0);
  }, []);

  return {
    isConnected,
    newPostCount,
    latestEvent,
    resetNewPostCount
  };
}

/**
 * Hook for user activity tracking
 */
export function useUserActivitySync(pubkey: string | undefined, enabled: boolean = true) {
  const { isConnected } = useRealtimeSubscription({
    enabled: enabled && !!pubkey,
    filters: pubkey ? [
      { kinds: [0, 3], authors: [pubkey], limit: 0 }
    ] : [],
    onEvent: (event) => {
      console.log(`User activity update:`, event);
    }
  });

  return { isConnected };
}

/**
 * Hook for interaction real-time updates
 */
export function useInteractionRealtimeUpdates(
  eventId: string,
  enabled: boolean = true
) {
  const [updates, setUpdates] = useState({
    likes: 0,
    reposts: 0,
    zaps: 0,
    comments: 0
  });

  const handleEvent = useCallback((event: NostrEvent) => {
    if (event.kind === 7) {
      setUpdates(prev => ({ ...prev, likes: prev.likes + 1 }));
    } else if (event.kind === 6) {
      setUpdates(prev => ({ ...prev, reposts: prev.reposts + 1 }));
    } else if (event.kind === 9735) {
      setUpdates(prev => ({ ...prev, zaps: prev.zaps + 1 }));
    } else if (event.kind === 1 || event.kind === 1111) {
      const isReply = event.tags.some(([name, value]) => 
        name === 'e' && value === eventId
      );
      if (isReply) {
        setUpdates(prev => ({ ...prev, comments: prev.comments + 1 }));
      }
    }
  }, [eventId]);

  const { isConnected } = useRealtimeSubscription({
    enabled: enabled && !!eventId,
    filters: [
      { kinds: [1, 6, 7, 9735, 1111], '#e': [eventId], limit: 0 }
    ],
    onEvent: handleEvent
  });

  return {
    isConnected,
    updates
  };
}

/**
 * Sync status indicator
 */
export function useSyncStatus() {
  const [status, setStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [syncCount, setSyncCount] = useState(0);

  const updateStatus = useCallback((newStatus: typeof status) => {
    setStatus(newStatus);
    
    if (newStatus === 'synced') {
      setLastSyncTime(new Date());
      setSyncCount(prev => prev + 1);
    }
  }, []);

  return {
    status,
    lastSyncTime,
    syncCount,
    updateStatus,
    isSyncing: status === 'syncing',
    isOffline: status === 'offline',
    hasError: status === 'error'
  };
}

export default {
  useRealtimeSubscription,
  useFeedRealtimeUpdates,
  useUserActivitySync,
  useInteractionRealtimeUpdates,
  useSyncStatus
};