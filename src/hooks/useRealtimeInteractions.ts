import { useQuery, useQueryClient } from '@tanstack/react-query';

interface InteractionCounts {
  likes: number;
  reposts: number;
  zaps: number;
  comments: number;
}

interface UseRealtimeInteractionsReturn {
  data: InteractionCounts | undefined;
  isLoading: boolean;
  optimisticUpdate: (kind: number, increment: number) => void;
}

/**
 * Optimized hook for fetching post interaction counts.
 * Note: Real-time subscriptions removed to improve performance.
 * Interactions are now updated via optimistic updates and manual refreshes.
 */
export function useRealtimeInteractions(eventId: string): UseRealtimeInteractionsReturn {
  const queryClient = useQueryClient();

  // Optimistic update function
  const optimisticUpdate = (kind: number, increment: number) => {
    queryClient.setQueryData(['post-interactions', eventId], (oldData: InteractionCounts | undefined) => {
      if (!oldData) {
        // If no old data, create initial counts
        return {
          likes: kind === 7 ? increment : 0,
          reposts: kind === 6 ? increment : 0,
          zaps: kind === 9735 ? increment : 0,
          comments: (kind === 1 || kind === 1111) ? increment : 0,
        };
      }

      // Update counts based on event kind
      const newCounts = { ...oldData };
      switch (kind) {
        case 7: // Like
          newCounts.likes += increment;
          break;
        case 6: // Repost
          newCounts.reposts += increment;
          break;
        case 9735: // Zap
          newCounts.zaps += increment;
          break;
        case 1: // Text note reply
        case 1111: // Comment
          newCounts.comments += increment;
          break;
      }

      return newCounts;
    });
  };

  // Base query for initial counts - reads from cache populated by batch query
  const { data: initialCounts, isLoading } = useQuery({
    queryKey: ['post-interactions', eventId],
    queryFn: () => {
      // This should never actually run since batch query populates the cache
      // But if it does, return empty counts as fallback
      return {
        likes: 0,
        reposts: 0,
        zaps: 0,
        comments: 0,
      };
    },
    enabled: !!eventId,
    staleTime: Infinity, // Never refetch - data comes from batch query and real-time updates
    gcTime: 300000, // 5 minutes
  });

  return {
    data: initialCounts,
    isLoading,
    optimisticUpdate,
  };
}