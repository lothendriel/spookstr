import { useQuery } from '@tanstack/react-query';
import { useNostr } from './useNostr';
import { NostrEvent } from '@nostrify/nostrify';

export interface PendingPost {
  event: NostrEvent;
  isReply: boolean;
  parentEventId?: string;
}

export interface ModerationAction {
  event: NostrEvent;
  action: 'approve' | 'deny';
  timestamp: number;
  moderator: string;
}

/**
 * Hook to fetch all posts and replies that need moderation approval for a community
 */
export function usePendingPosts(communityId?: string, communityAuthor?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['pending-posts', communityId, communityAuthor],
    queryFn: async (context) => {
      if (!communityId || !communityAuthor) return [];

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);
      const communityTag = `34550:${communityAuthor}:${communityId}`;

      console.log('🔍 Fetching pending posts for community:', communityTag);

      // Query for all posts and replies (kind 1111) in this community
      const allPosts = await nostr.query([{
        kinds: [1111],
        '#A': [communityTag],
        limit: 200
      }], { signal });

      console.log(`📝 Found ${allPosts.length} total posts (kind 1111)`);

      // Query for all approval events (kind 4550) for this community
      const approvals = await nostr.query([
        {
          kinds: [4550],
          '#a': [communityTag],
          limit: 200
        }
      ], { signal });

      console.log(`✅ Found ${approvals.length} approval events (kind 4550)`);

      // Query for all denial events (kind 4551) for this community
      const denials = await nostr.query([
        {
          kinds: [4551],
          '#a': [communityTag],
          limit: 200
        }
      ], { signal });

      console.log(`❌ Found ${denials.length} denial events (kind 4551)`);

      // Create sets of approved and denied event IDs for quick lookup
      const approvedEventIds = new Set<string>();
      const deniedEventIds = new Set<string>();

      approvals.forEach(approval => {
        const eTags = approval.tags.filter(tag => tag[0] === 'e');
        console.log(`Approval event ${approval.id.slice(0, 8)}... tags:`, approval.tags);
        eTags.forEach(eTag => {
          if (eTag[1]) {
            approvedEventIds.add(eTag[1]);
            console.log(`  -> Approved event: ${eTag[1].slice(0, 8)}...`);
          }
        });
      });

      denials.forEach(denial => {
        const eTags = denial.tags.filter(tag => tag[0] === 'e');
        console.log(`Denial event ${denial.id.slice(0, 8)}... tags:`, denial.tags);
        eTags.forEach(eTag => {
          if (eTag[1]) {
            deniedEventIds.add(eTag[1]);
            console.log(`  -> Denied event: ${eTag[1].slice(0, 8)}...`);
          }
        });
      });

      console.log(`🎯 ${approvedEventIds.size} unique approved event IDs:`, Array.from(approvedEventIds).map(id => id.slice(0, 8) + '...'));
      console.log(`🚫 ${deniedEventIds.size} unique denied event IDs:`, Array.from(deniedEventIds).map(id => id.slice(0, 8) + '...'));

      // Filter out approved and denied posts - only show truly pending posts
      const pendingPosts = allPosts
        .filter(post => {
          const isApproved = approvedEventIds.has(post.id);
          const isDenied = deniedEventIds.has(post.id);
          console.log(`Post ${post.id.slice(0, 8)}... - Approved: ${isApproved}, Denied: ${isDenied}`);
          return !isApproved && !isDenied;
        })
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

      console.log(`⏳ ${pendingPosts.length} pending posts after filtering`);

      return pendingPosts as PendingPost[];
    },
    enabled: !!communityId && !!communityAuthor,
    refetchInterval: 15000, // Refetch every 15 seconds
    staleTime: 0, // Always consider data stale to ensure fresh queries
    gcTime: 30000 // Keep data in cache for 30 seconds only
  });
}

/**
 * Hook to fetch approved posts for a community
 */
export function useApprovedPosts(communityId?: string, communityAuthor?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['approved-posts', communityId, communityAuthor],
    queryFn: async (context) => {
      if (!communityId || !communityAuthor) return [];

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);
      const communityTag = `34550:${communityAuthor}:${communityId}`;

      console.log('🔍 Fetching approved posts for community:', communityTag);

      // Query for all approval events (kind 4550) for this community
      const approvals = await nostr.query([
        {
          kinds: [4550],
          '#a': [communityTag],
          limit: 200
        }
      ], { signal });

      console.log(`✅ Found ${approvals.length} approval events for approved posts`);

      // Extract approved event IDs with better logging
      const approvedEventIds = new Set<string>();

      approvals.forEach(approval => {
        const eTags = approval.tags.filter(tag => tag[0] === 'e');
        console.log(`Approval event ${approval.id.slice(0, 8)}... tags:`, approval.tags);
        eTags.forEach(eTag => {
          if (eTag[1]) {
            approvedEventIds.add(eTag[1]);
            console.log(`  -> Approved event: ${eTag[1].slice(0, 8)}...`);
          }
        });
      });

      const approvedEventIdsArray = Array.from(approvedEventIds);
      console.log(`📋 ${approvedEventIdsArray.length} unique approved event IDs:`, approvedEventIdsArray.map(id => id.slice(0, 8) + '...'));

      if (approvedEventIdsArray.length === 0) return [];

      // Query for the actual approved posts
      const approvedPosts = await nostr.query([{
        kinds: [1111],
        ids: approvedEventIdsArray,
        limit: 200
      }], { signal });

      console.log(`📝 Found ${approvedPosts.length} actual approved posts`);

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
    refetchInterval: 15000, // Refetch every 15 seconds
    staleTime: 0, // Always consider data stale to ensure fresh queries
    gcTime: 30000 // Keep data in cache for 30 seconds only
  });
}

/**
 * Hook to fetch all moderation actions (approvals and denials) for a community
 */
export function useModerationActions(communityId?: string, communityAuthor?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['moderation-actions', communityId, communityAuthor],
    queryFn: async (context) => {
      if (!communityId || !communityAuthor) return [];

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);
      const communityTag = `34550:${communityAuthor}:${communityId}`;

      console.log('🔍 Fetching moderation actions for community:', communityTag);

      // Query for both approval (4550) and denial (4551) events
      const [approvals, denials] = await Promise.all([
        nostr.query([{
          kinds: [4550],
          '#a': [communityTag],
          limit: 200
        }], { signal }),
        nostr.query([{
          kinds: [4551],
          '#a': [communityTag],
          limit: 200
        }], { signal })
      ]);

      console.log(`✅ Found ${approvals.length} approval events and ${denials.length} denial events`);

      // Combine and sort all moderation actions
      const allActions: ModerationAction[] = [];

      approvals.forEach(approval => {
        const eTags = approval.tags.filter(tag => tag[0] === 'e');
        eTags.forEach(eTag => {
          if (eTag[1]) {
            allActions.push({
              event: approval,
              action: 'approve',
              timestamp: approval.created_at,
              moderator: approval.pubkey
            });
          }
        });
      });

      denials.forEach(denial => {
        const eTags = denial.tags.filter(tag => tag[0] === 'e');
        eTags.forEach(eTag => {
          if (eTag[1]) {
            allActions.push({
              event: denial,
              action: 'deny',
              timestamp: denial.created_at,
              moderator: denial.pubkey
            });
          }
        });
      });

      // Sort by timestamp (newest first)
      return allActions.sort((a, b) => b.timestamp - a.timestamp);
    },
    enabled: !!communityId && !!communityAuthor,
    refetchInterval: 15000, // Refetch every 15 seconds
    staleTime: 0, // Always consider data stale to ensure fresh queries
    gcTime: 30000 // Keep data in cache for 30 seconds only
  });
}
