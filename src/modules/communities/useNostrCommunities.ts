import { useNostr } from '@/hooks/useNostr';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';
import { nip19 } from 'nostr-tools';

export interface CommunityDefinition {
  id: string;
  name: string;
  description: string;
  image?: string;
  moderators: string[];
  author: string;
  created_at: number;
  preferredRelays?: {
    author?: string;
    requests?: string;
    approvals?: string;
  };
}

export interface CommunityTopic {
  id: string;
  pubkey: string;
  content: string;
  created_at: number;
  tags: string[][];
  kind: number;
  title?: string;
  approved: boolean;
  approvalCount: number;
}

export interface CommunityComment {
  id: string;
  pubkey: string;
  content: string;
  created_at: number;
  tags: string[][];
  kind: number;
  parentId: string;
  depth: number;
  replies: CommunityComment[];
}

export function useNostrCommunities() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  // Get all communities
  const getCommunities = useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      const signal = AbortSignal.timeout(5000);

      const events = await nostr.query([{
        kinds: [34550],
        limit: 100
      }], { signal });

      return events.map(event => {
        const nameTag = event.tags.find(tag => tag[0] === 'name');
        const descriptionTag = event.tags.find(tag => tag[0] === 'description');
        const imageTag = event.tags.find(tag => tag[0] === 'image');
        const moderators = event.tags
          .filter(tag => tag[0] === 'p' && tag[3] === 'moderator')
          .map(tag => tag[1]);

        const preferredRelays: CommunityDefinition['preferredRelays'] = {};
        event.tags.forEach(tag => {
          if (tag[0] === 'relay' && tag[2]) {
            switch (tag[2]) {
              case 'author':
                preferredRelays.author = tag[1];
                break;
              case 'requests':
                preferredRelays.requests = tag[1];
                break;
              case 'approvals':
                preferredRelays.approvals = tag[1];
                break;
            }
          }
        });

        return {
          id: event.tags.find(tag => tag[0] === 'd')?.[1] || '',
          name: nameTag?.[1] || '',
          description: descriptionTag?.[1] || '',
          image: imageTag?.[1],
          moderators,
          author: event.pubkey,
          created_at: event.created_at,
          preferredRelays
        } as CommunityDefinition;
      }).filter(community => community.id);
    }
  });

  // Get topics for a community (main feed)
  const getCommunityTopics = (communityId?: string, communityAuthor?: string) => {
    return useQuery({
      queryKey: ['community-topics', communityId, communityAuthor],
      queryFn: async (context) => {
        if (!communityId || !communityAuthor) return [];

        const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);
        const communityTag = `34550:${communityAuthor}:${communityId}`;

        // Check if current user is a moderator
        const isModerator = user?.pubkey === communityAuthor ||
                          (user && getCommunities.data?.find(c => c.id === communityId)?.moderators.includes(user.pubkey));

        if (isModerator) {
          // Moderators see all posts (approved and pending)
          const allPosts = await nostr.query([{
            kinds: [1111],
            '#A': [communityTag],
            limit: 100
          }], { signal });

          // Get approval events to determine approval status
          const approvals = await nostr.query([{
            kinds: [4550],
            '#a': [communityTag],
            limit: 200
          }], { signal });

          // Get denial events to determine denial status
          const denials = await nostr.query([{
            kinds: [4551],
            '#a': [communityTag],
            limit: 200
          }], { signal });

          const approvedEventIds = new Set<string>();
          const deniedEventIds = new Set<string>();

          approvals.forEach(approval => {
            const eTags = approval.tags.filter(tag => tag[0] === 'e');
            eTags.forEach(eTag => {
              if (eTag[1]) approvedEventIds.add(eTag[1]);
            });
          });

          denials.forEach(denial => {
            const eTags = denial.tags.filter(tag => tag[0] === 'e');
            eTags.forEach(eTag => {
              if (eTag[1]) deniedEventIds.add(eTag[1]);
            });
          });

          return allPosts.map(event => {
            const titleTag = event.tags.find(tag => tag[0] === 'title');
            const isApproved = approvedEventIds.has(event.id);
            const isDenied = deniedEventIds.has(event.id);

            return {
              id: event.id,
              pubkey: event.pubkey,
              content: event.content,
              created_at: event.created_at,
              tags: event.tags,
              kind: event.kind,
              title: titleTag?.[1],
              approved: isApproved && !isDenied, // Only approved if not denied
              approvalCount: Array.from(approvals).filter(a =>
                a.tags.some(t => t[0] === 'e' && t[1] === event.id)
              ).length
            } as CommunityTopic;
          }).sort((a, b) => b.created_at - a.created_at);

        } else {
          // Regular users see only approved posts (not denied)
          const approvals = await nostr.query([{
            kinds: [4550],
            '#a': [communityTag],
            limit: 200
          }], { signal });

          // Also get denial events to exclude denied posts
          const denials = await nostr.query([{
            kinds: [4551],
            '#a': [communityTag],
            limit: 200
          }], { signal });

          const approvedEventIds = new Set<string>();
          const deniedEventIds = new Set<string>();

          approvals.forEach(approval => {
            const eTags = approval.tags.filter(tag => tag[0] === 'e');
            eTags.forEach(eTag => {
              if (eTag[1]) approvedEventIds.add(eTag[1]);
            });
          });

          denials.forEach(denial => {
            const eTags = denial.tags.filter(tag => tag[0] === 'e');
            eTags.forEach(eTag => {
              if (eTag[1]) deniedEventIds.add(eTag[1]);
            });
          });

          // Filter out denied posts from approved list
          const finalApprovedEventIds = Array.from(approvedEventIds).filter(id => !deniedEventIds.has(id));

          if (finalApprovedEventIds.length === 0) return [];

          const approvedPosts = await nostr.query([{
            kinds: [1111],
            ids: finalApprovedEventIds,
            limit: 200
          }], { signal });

          return approvedPosts.map(event => {
            const titleTag = event.tags.find(tag => tag[0] === 'title');
            return {
              id: event.id,
              pubkey: event.pubkey,
              content: event.content,
              created_at: event.created_at,
              tags: event.tags,
              kind: event.kind,
              title: titleTag?.[1],
              approved: true,
              approvalCount: Array.from(approvals).filter(a =>
                a.tags.some(t => t[0] === 'e' && t[1] === event.id)
              ).length
            } as CommunityTopic;
          }).sort((a, b) => b.created_at - a.created_at);
        }
      },
      enabled: !!communityId && !!communityAuthor,
      refetchInterval: 30000
    });
  };

  // Get nested comments for a topic
  const getTopicComments = (topicId?: string) => {
    return useQuery({
      queryKey: ['topic-comments', topicId],
      queryFn: async (context) => {
        if (!topicId) return [];

        const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);

        // Get all replies to this topic
        const events = await nostr.query([{
          kinds: [1111],
          '#e': [topicId],
          limit: 200
        }], { signal });

        // Build nested comment structure
        const comments: CommunityComment[] = events.map(event => ({
          id: event.id,
          pubkey: event.pubkey,
          content: event.content,
          created_at: event.created_at,
          tags: event.tags,
          kind: event.kind,
          parentId: topicId,
          depth: 0,
          replies: []
        }));

        // Organize into nested structure
        const commentMap = new Map<string, CommunityComment>();
        comments.forEach(comment => {
          commentMap.set(comment.id, { ...comment, replies: [] });
        });

        const rootComments: CommunityComment[] = [];

        comments.forEach(comment => {
          const parentETag = comment.tags.find(tag => tag[0] === 'e' && tag[1] !== topicId);
          if (parentETag && parentETag[1]) {
            const parent = commentMap.get(parentETag[1]);
            if (parent) {
              parent.replies.push(commentMap.get(comment.id)!);
            } else {
              rootComments.push(commentMap.get(comment.id)!);
            }
          } else {
            rootComments.push(commentMap.get(comment.id)!);
          }
        });

        return rootComments;
      },
      enabled: !!topicId,
      refetchInterval: 15000
    });
  };

  // Verify user NIP-05
  const verifyUser = (pubkey: string) => {
    return useQuery({
      queryKey: ['user-nip05', pubkey],
      queryFn: async () => {
        const signal = AbortSignal.timeout(5000);

        const events = await nostr.query([{
          kinds: [0],
          authors: [pubkey],
          limit: 1
        }], { signal });

        if (events.length === 0) return false;

        const metadata = JSON.parse(events[0].content);
        return !!metadata.nip05;
      },
      staleTime: 300000 // 5 minutes
    });
  };

  // Publish a new topic/post
  const publishPost = useMutation({
    mutationFn: async ({
      communityId,
      communityAuthor,
      content,
      title
    }: {
      communityId: string;
      communityAuthor: string;
      content: string;
      title?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const communityTag = `34550:${communityAuthor}:${communityId}`;

      const tags = [
        ['A', communityTag],
        ['a', communityTag],
        ['P', communityAuthor],
        ['p', communityAuthor],
        ['K', '34550'],
        ['k', '34550'],
      ];

      if (title) {
        tags.push(['title', title]);
      }

      const event = await user.signer.signEvent({
        kind: 1111,
        content,
        tags,
        created_at: Math.floor(Date.now() / 1000)
      });

      await nostr.event(event);
      return event;
    },
    onSuccess: () => {
      toast({
        title: 'Post published',
        description: 'Your post has been submitted to the community.',
      });
      queryClient.invalidateQueries({ queryKey: ['community-topics'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to publish',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Publish a comment/reply
  const publishComment = useMutation({
    mutationFn: async ({
      topicId,
      topicAuthor,
      communityId,
      communityAuthor,
      content,
      parentEventId
    }: {
      topicId: string;
      topicAuthor: string;
      communityId: string;
      communityAuthor: string;
      content: string;
      parentEventId?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const communityTag = `34550:${communityAuthor}:${communityId}`;

      const tags = [
        ['A', communityTag],
        ['P', communityAuthor],
        ['K', '34550'],
        ['e', topicId],
        ['p', topicAuthor],
        ['k', '1111'],
      ];

      if (parentEventId) {
        tags.push(['e', parentEventId]);
      }

      const event = await user.signer.signEvent({
        kind: 1111,
        content,
        tags,
        created_at: Math.floor(Date.now() / 1000)
      });

      await nostr.event(event);
      return event;
    },
    onSuccess: () => {
      toast({
        title: 'Comment published',
        description: 'Your comment has been posted.',
      });
      queryClient.invalidateQueries({ queryKey: ['topic-comments'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to publish comment',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Moderate post (approve/deny)
  const moderatePost = useMutation({
    mutationFn: async ({
      communityId,
      communityAuthor,
      postId,
      postAuthor,
      postKind,
      postEvent,
      action
    }: {
      communityId: string;
      communityAuthor: string;
      postId: string;
      postAuthor: string;
      postKind: number;
      postEvent: any;
      action: 'approve' | 'deny';
    }) => {
      if (!user) throw new Error('User not authenticated');

      const communityTag = `34550:${communityAuthor}:${communityId}`;

      if (action === 'approve') {
        const event = await user.signer.signEvent({
          kind: 4550,
          content: JSON.stringify(postEvent),
          tags: [
            ['a', communityTag],
            ['e', postId],
            ['p', postAuthor],
            ['k', postKind.toString()],
          ],
          created_at: Math.floor(Date.now() / 1000)
        });

        await nostr.event(event);
        return event;
      } else {
        // For denial, use kind 4551 to be consistent with the moderation logic
        const event = await user.signer.signEvent({
          kind: 4551,
          content: JSON.stringify({
            deniedEventId: postId,
            deniedEventPubkey: postAuthor,
            reason: 'Denied by moderator',
            timestamp: Math.floor(Date.now() / 1000)
          }),
          tags: [
            ['a', communityTag],
            ['e', postId],
            ['p', postAuthor],
            ['k', postKind.toString()],
          ],
          created_at: Math.floor(Date.now() / 1000)
        });

        await nostr.event(event);
        return event;
      }
    },
    onMutate: async (variables) => {
      // Optimistic update - remove the post from pending list immediately
      const queryKey = ['community-topics', variables.communityId, variables.communityAuthor];
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData(queryKey);

      if (previousData) {
        queryClient.setQueryData(queryKey, (old: any[]) => {
          if (!old) return old;
          return old.filter(topic => topic.id !== variables.postId);
        });
      }

      return { previousData, queryKey };
    },
    onSuccess: (data, variables, context) => {
      toast({
        title: `Post ${variables.action === 'approve' ? 'Approved' : 'Denied'}`,
        description: `The post has been ${variables.action === 'approve' ? 'approved and is now visible' : 'denied and hidden'} from the community.`,
      });

      // Invalidate the specific query to ensure fresh data
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }

      // Also invalidate any related queries
      queryClient.invalidateQueries({ queryKey: ['pending-posts'] });
      queryClient.invalidateQueries({ queryKey: ['approved-posts'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-actions'] });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }

      toast({
        title: 'Moderation failed',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: (data, error, variables, context) => {
      // Always refetch after settlement to ensure consistency
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
    }
  });

  return {
    getCommunities,
    getCommunityTopics,
    getTopicComments,
    verifyUser,
    publishPost,
    publishComment,
    moderatePost
  };
}