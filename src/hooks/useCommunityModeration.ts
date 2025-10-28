import { useQuery } from '@tanstack/react-query';
import { useNostr } from './useNostr';
import { NostrEvent } from '@nostrify/nostrify';

export interface PendingPost {
  event: NostrEvent;
  isReply: boolean;
  parentEventId?: string;
}

/**
 * Hook to fetch all posts and replies that need moderation approval for a community
 */
export function usePendingPosts(communityId?: string, communityAuthor?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['pending-posts', communityId, communityAuthor],
    queryFn: async () => {
      if (!communityId || !communityAuthor) return [];

      const signal = AbortSignal.timeout(5000);
      const communityTag = `34550:${communityAuthor}:${communityId}`;

      // Query for all posts and replies (kind 1111) in this community
      const allPosts = await nostr.query([{
        kinds: [1111],
        '#A': [communityTag],
        limit: 200
      }], { signal });

      // Query for all approval events (kind 4550) for this community
      const approvals = await nostr.query([{
        kinds: [4550],
        '#a': [communityTag],
        limit: 200
      }], { signal });

      // Create a set of approved event IDs for quick lookup
      const approvedEventIds = new Set(
        approvals.flatMap(approval => 
          approval.tags
            .filter(tag => tag[0] === 'e')
            .map(tag => tag[1])
        )
      );

      // Filter out already approved posts
      const pendingPosts = allPosts
        .filter(post => !approvedEventIds.has(post.id))
        .map(post => {
          // Check if this is a reply by looking for 'e' tags (parent event)
          const parentEventTag = post.tags.find(tag => 
            tag[0] === 'e' && tag[1] !== post.id
          );
          
          return {
            event: post,
            isReply: !!parentEventTag,
            parentEventId: parentEventTag?.[1]
          };
        })
        .sort((a, b) => b.event.created_at - a.event.created_at); // Newest first

      return pendingPosts as PendingPost[];
    },
    enabled: !!communityId && !!communityAuthor,
    refetchInterval: 30000 // Refetch every 30 seconds
  });
}

/**
 * Hook to fetch approved posts for a community
 */
export function useApprovedPosts(communityId?: string, communityAuthor?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['approved-posts', communityId, communityAuthor],
    queryFn: async () => {
      if (!communityId || !communityAuthor) return [];

      const signal = AbortSignal.timeout(5000);
      const communityTag = `34550:${communityAuthor}:${communityId}`;

      // Query for all approval events (kind 4550) for this community
      const approvals = await nostr.query([{
        kinds: [4550],
        '#a': [communityTag],
        limit: 200
      }], { signal });

      // Extract approved event IDs
      const approvedEventIds = approvals.flatMap(approval => 
        approval.tags
          .filter(tag => tag[0] === 'e')
          .map(tag => tag[1])
      );

      if (approvedEventIds.length === 0) return [];

      // Query for the actual approved posts
      const approvedPosts = await nostr.query([{
        kinds: [1111],
        ids: approvedEventIds,
        limit: 200
      }], { signal });

      return approvedPosts
        .map(post => {
          const parentEventTag = post.tags.find(tag => 
            tag[0] === 'e' && tag[1] !== post.id
          );
          
          return {
            event: post,
            isReply: !!parentEventTag,
            parentEventId: parentEventTag?.[1]
          };
        })
        .sort((a, b) => b.event.created_at - a.event.created_at);
    },
    enabled: !!communityId && !!communityAuthor,
    refetchInterval: 30000
  });
}
