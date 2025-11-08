import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface ModerationDecision {
  action: 'approve' | 'deny';
  eventId: string;
  eventPubkey: string;
  moderator: string;
  timestamp: number;
  communityId: string;
  communityAuthor: string;
}

/**
 * Hook for managing local moderation state persistence
 * Provides utilities to save, load, and clean up moderation decisions
 */
export function useModerationPersistence() {
  const queryClient = useQueryClient();

  /**
   * Save a moderation decision to localStorage for immediate persistence
   */
  const saveModerationDecision = useCallback((decision: ModerationDecision) => {
    const key = `moderation-${decision.communityId}-${decision.eventId}`;
    
    try {
      localStorage.setItem(key, JSON.stringify(decision));
      console.log('💾 Saved moderation decision to localStorage:', {
        action: decision.action,
        eventId: decision.eventId.slice(0, 8) + '...',
        communityId: decision.communityId
      });
    } catch (error) {
      console.error('❌ Failed to save moderation decision to localStorage:', error);
    }
  }, []);

  /**
   * Load all local moderation decisions for a specific community
   */
  const loadLocalModerationDecisions = useCallback((communityId: string): Map<string, 'approve' | 'deny'> => {
    const decisions = new Map<string, 'approve' | 'deny'>();
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`moderation-${communityId}-`)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.eventId && data.action) {
            decisions.set(data.eventId, data.action);
            console.log('📱 Loaded local moderation:', {
              action: data.action,
              eventId: data.eventId.slice(0, 8) + '...'
            });
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse local moderation data:', key, error);
          // Remove corrupted data
          localStorage.removeItem(key);
        }
      }
    }
    
    console.log(`📱 Loaded ${decisions.size} local moderation decisions for community ${communityId}`);
    return decisions;
  }, []);

  /**
   * Remove a specific local moderation decision
   */
  const removeLocalModerationDecision = useCallback((communityId: string, eventId: string) => {
    const key = `moderation-${communityId}-${eventId}`;
    
    try {
      localStorage.removeItem(key);
      console.log('🗑️ Removed local moderation decision:', {
        eventId: eventId.slice(0, 8) + '...',
        communityId
      });
    } catch (error) {
      console.error('❌ Failed to remove local moderation decision:', error);
    }
  }, []);

  /**
   * Clean up old local moderation decisions (older than specified days)
   */
  const cleanupOldModerationDecisions = useCallback((daysOld: number = 7) => {
    const cutoffTime = Math.floor(Date.now() / 1000) - (daysOld * 24 * 60 * 60);
    let cleanedCount = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('moderation-')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.timestamp && data.timestamp < cutoffTime) {
            localStorage.removeItem(key);
            cleanedCount++;
            console.log('🧹 Cleaned up old moderation decision:', {
              action: data.action,
              eventId: data.eventId?.slice(0, 8) + '...',
              age: `${Math.floor((cutoffTime - data.timestamp) / (24 * 60 * 60))} days old`
            });
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse old moderation data:', key, error);
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old moderation decisions`);
    }
    
    return cleanedCount;
  }, []);

  /**
   * Apply optimistic updates to the query cache
   */
  const applyOptimisticUpdates = useCallback((
    decision: ModerationDecision,
    originalEvent: any
  ) => {
    const { communityId, communityAuthor, action, eventId } = decision;
    
    console.log('⚡ Applying optimistic updates for:', {
      action,
      eventId: eventId.slice(0, 8) + '...',
      communityId
    });

    // Update pending posts cache to remove the moderated post
    queryClient.setQueryData(['pending-posts', communityId, communityAuthor], (oldData: any) => {
      if (!oldData) return oldData;
      
      if (Array.isArray(oldData)) {
        return oldData.filter((post: any) => post.event.id !== eventId);
      }
      
      if (oldData.data) {
        return {
          ...oldData,
          data: oldData.data.filter((post: any) => post.event.id !== eventId)
        };
      }
      
      if (oldData.pages) {
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data: page.data?.filter((post: any) => post.event.id !== eventId) || []
          }))
        };
      }
      
      return oldData;
    });

    // If approved, add to approved posts cache
    if (action === 'approve') {
      const newApprovedPost = {
        event: originalEvent,
        isReply: originalEvent.tags.some((tag: string[]) => tag[0] === 'e' && tag[1] !== originalEvent.id)
      };
      
      queryClient.setQueryData(['approved-posts', communityId, communityAuthor], (oldData: any) => {
        if (!oldData) return [newApprovedPost];
        
        if (Array.isArray(oldData)) {
          return [newApprovedPost, ...oldData].sort((a, b) => b.event.created_at - a.event.created_at);
        }
        
        if (oldData.data) {
          return {
            ...oldData,
            data: [newApprovedPost, ...oldData.data].sort((a, b) => b.event.created_at - a.event.created_at)
          };
        }
        
        return oldData;
      });
    }

    console.log('✅ Optimistic updates applied successfully');
  }, [queryClient]);

  /**
   * Invalidate all moderation-related queries to trigger refetch
   */
  const invalidateModerationQueries = useCallback((communityId: string, communityAuthor: string) => {
    console.log('🔄 Invalidating moderation queries for community:', communityId);
    
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pending-posts'] }),
      queryClient.invalidateQueries({ queryKey: ['approved-posts'] }),
      queryClient.invalidateQueries({ queryKey: ['moderation-actions'] }),
      queryClient.invalidateQueries({ queryKey: ['community-feed'] }),
      queryClient.invalidateQueries({ queryKey: ['community-feed', communityId] })
    ]);
  }, [queryClient]);

  return {
    saveModerationDecision,
    loadLocalModerationDecisions,
    removeLocalModerationDecision,
    cleanupOldModerationDecisions,
    applyOptimisticUpdates,
    invalidateModerationQueries
  };
}