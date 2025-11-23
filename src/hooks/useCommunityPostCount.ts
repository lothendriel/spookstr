import { useQuery } from '@tanstack/react-query';
import { useNostr } from './useNostr';
import { useCommunity } from './useCommunity';

interface UseCommunityPostCountOptions {
  communityId?: string;
  communityAuthor?: string;
}

export function useCommunityPostCount({ communityId, communityAuthor }: UseCommunityPostCountOptions) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['community-post-count', communityId, communityAuthor],
    queryFn: async () => {
      if (!communityId || !communityAuthor) {
        return 0;
      }

      const signal = AbortSignal.timeout(3000);

      try {
        // Query for main community posts (kind 1111) that are not replies
        // We filter out replies by checking that they don't have an 'e' tag (reply root)
        const events = await nostr.query([{
          kinds: [1111],
          '#a': [`34550:${communityAuthor}:${communityId}`],
          limit: 1000 // Get up to 1000 posts to count
        }], { signal });

        // Filter out replies - main posts don't have an 'e' tag (reply root)
        const mainPosts = events.filter(event => {
          // Check if this is a reply (has 'e' tag for reply root)
          const isReply = event.tags.some(tag => tag[0] === 'e');
          return !isReply;
        });

        console.log(`📊 Community ${communityId} post count:`, {
          totalEvents: events.length,
          mainPosts: mainPosts.length,
          replies: events.length - mainPosts.length
        });

        return mainPosts.length;
      } catch (error) {
        console.error(`Failed to fetch post count for community ${communityId}:`, error);
        return 0;
      }
    },
    enabled: !!communityId && !!communityAuthor,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}