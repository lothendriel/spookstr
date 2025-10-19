import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from './useCurrentUser';
import { useNostrPublish } from './useNostrPublish';
import { useToast } from './useToast';
import type { NostrEvent } from '@nostrify/nostrify';

interface FollowData {
  pubkey: string;
  petname?: string;
  relay?: string;
}

interface FollowList {
  follows: FollowData[];
  isLoading: boolean;
  isFollowing: (pubkey: string) => boolean;
  follow: (pubkey: string, petname?: string) => Promise<void>;
  unfollow: (pubkey: string) => Promise<void>;
  isPending: boolean;
}

export function useFollow(targetPubkey?: string): FollowList {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query current user's follow list
  const { data: followList, isLoading } = useQuery({
    queryKey: ['follow-list', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query(
        [{ kinds: [3], authors: [user.pubkey], limit: 1 }],
        { signal }
      );

      if (events.length === 0) return [];

      // Parse the follow list from the most recent kind 3 event
      const followEvent = events[0];
      return followEvent.tags
        .filter((tag): tag is [string, string, string?, string?] => tag[0] === 'p' && tag[1])
        .map(([_, pubkey, relay, petname]) => ({
          pubkey,
          relay,
          petname,
        }));
    },
    enabled: !!user?.pubkey,
  });

  // Check if following a specific user
  const isFollowing = (pubkey: string) => {
    return followList?.some(follow => follow.pubkey === pubkey) ?? false;
  };

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async ({ pubkey, petname }: { pubkey: string; petname?: string }) => {
      if (!user?.pubkey) {
        throw new Error('You must be logged in to follow users');
      }

      // Create new follow list by adding the new follow
      const newFollows = [
        ...(followList || []),
        { pubkey, petname },
      ];

      // Publish new kind 3 event
      const tags = newFollows.map(follow => 
        follow.relay || follow.petname
          ? ['p', follow.pubkey, follow.relay, follow.petname].filter(Boolean)
          : ['p', follow.pubkey]
      );

      await publishEvent({
        kind: 3,
        content: '',
        tags,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-list', user?.pubkey] });
      toast({
        title: 'Followed successfully',
        description: 'You are now following this user',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to follow',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: async (pubkey: string) => {
      if (!user?.pubkey) {
        throw new Error('You must be logged in to unfollow users');
      }

      // Create new follow list by removing the unfollowed user
      const newFollows = (followList || []).filter(follow => follow.pubkey !== pubkey);

      // Publish new kind 3 event
      const tags = newFollows.map(follow => 
        follow.relay || follow.petname
          ? ['p', follow.pubkey, follow.relay, follow.petname].filter(Boolean)
          : ['p', follow.pubkey]
      );

      await publishEvent({
        kind: 3,
        content: '',
        tags,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-list', user?.pubkey] });
      toast({
        title: 'Unfollowed successfully',
        description: 'You are no longer following this user',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to unfollow',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  return {
    follows: followList || [],
    isLoading,
    isFollowing,
    follow: (pubkey: string, petname?: string) => followMutation.mutateAsync({ pubkey, petname }),
    unfollow: (pubkey: string) => unfollowMutation.mutateAsync(pubkey),
    isPending: followMutation.isPending || unfollowMutation.isPending,
  };
}