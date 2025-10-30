import { useQuery } from '@tanstack/react-query';
import { useNostr } from './useNostr';
import { NostrEvent } from '@nostrify/nostrify';
import { filterNSFWContent } from '@/lib/nsfwFilter';
import { useCurrentUser } from './useCurrentUser';

export interface CommunityFeedPost {
  id: string;
  pubkey: string;
  content: string;
  created_at: number;
  tags: string[][];
  kind: number;
}

/**
 * Hook to fetch approved community posts for display in the community feed
 * Only shows posts that have been approved by moderators (NIP-72 compliance)
 * Moderators see all posts, regular users see only approved posts
 */
export function useCommunityFeed(communityId?: string, communityAuthor?: string) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['community-feed', communityId, communityAuthor, user?.pubkey],
    queryFn: async (context) => {
      if (!communityId || !communityAuthor) return [];

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);
      const communityTag = `34550:${communityAuthor}:${communityId}`;

      // Check if current user is a moderator
      const isModerator = user?.pubkey === communityAuthor;

      console.log(`🏘️ Fetching community feed for: ${communityTag}`);
      console.log(`👤 User is moderator: ${isModerator}`);

      if (isModerator) {
        // Moderators see all posts (approved and pending)
        console.log('🛡️ Loading all posts for moderator');

        const allPosts = await nostr.query([
          {
            kinds: [1111],
            '#A': [communityTag],
            limit: 100
          }
        ], { signal });

        console.log(`📝 Found ${allPosts.length} total posts for moderator`);

        // Filter out NSFW content and sort
        const filteredPosts = filterNSFWContent(allPosts);
        const sortedPosts = filteredPosts.sort((a, b) => b.created_at - a.created_at);

        return sortedPosts.map(event => ({
          id: event.id,
          pubkey: event.pubkey,
          content: event.content,
          created_at: event.created_at,
          tags: event.tags,
          kind: event.kind
        })) as CommunityFeedPost[];

      } else {
        // Regular users see only approved posts (NIP-72 compliance)
        console.log('👁️ Loading approved posts for regular user');

        // First, get all approval events for this community
        const approvals = await nostr.query([
          {
            kinds: [4550],
            '#a': [communityTag],
            limit: 200
          }
        ], { signal });

        console.log(`✅ Found ${approvals.length} approval events`);

        // Extract approved post IDs
        const approvedEventIds = new Set<string>();
        
        approvals.forEach(approval => {
          const eTags = approval.tags.filter(tag => tag[0] === 'e');
          eTags.forEach(eTag => {
            if (eTag[1]) {
              approvedEventIds.add(eTag[1]);
            }
          });
        });

        const approvedEventIdsArray = Array.from(approvedEventIds);
        console.log(`🎯 Found ${approvedEventIdsArray.length} unique approved post IDs`);

        if (approvedEventIdsArray.length === 0) {
          console.log('📭 No approved posts found');
          return [];
        }

        // Fetch the actual approved posts
        const approvedPosts = await nostr.query([
          {
            kinds: [1111],
            ids: approvedEventIdsArray,
            limit: 200
          }
        ], { signal });

        console.log(`📝 Found ${approvedPosts.length} actual approved posts`);

        // Filter out NSFW content and sort
        const filteredPosts = filterNSFWContent(approvedPosts);
        const sortedPosts = filteredPosts.sort((a, b) => b.created_at - a.created_at);

        return sortedPosts.map(event => ({
          id: event.id,
          pubkey: event.pubkey,
          content: event.content,
          created_at: event.created_at,
          tags: event.tags,
          kind: event.kind
        })) as CommunityFeedPost[];
      }
    },
    enabled: !!communityId && !!communityAuthor,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}