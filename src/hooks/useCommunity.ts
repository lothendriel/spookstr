import { useQuery } from '@tanstack/react-query';
import { useNostr } from './useNostr';
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

export interface CommunityPost {
  id: string;
  pubkey: string;
  content: string;
  created_at: number;
  tags: string[][];
}

export function useCommunity(communityId?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['community', communityId],
    queryFn: async () => {
      if (!communityId) throw new Error('No community ID provided');
      
      const signal = AbortSignal.timeout(5000);
      
      // Query for community definition (kind 34550)
      const events = await nostr.query([{
        kinds: [34550],
        '#d': [communityId],
        limit: 1
      }], { signal });

      if (events.length === 0) {
        throw new Error('Community not found');
      }

      const event = events[0];
      const nameTag = event.tags.find(tag => tag[0] === 'name');
      const descriptionTag = event.tags.find(tag => tag[0] === 'description');
      const imageTag = event.tags.find(tag => tag[0] === 'image');
      const moderators = event.tags
        .filter(tag => tag[0] === 'p' && tag[3] === 'moderator')
        .map(tag => tag[1]);

      // Parse preferred relays
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
        id: communityId,
        name: nameTag?.[1] || communityId,
        description: descriptionTag?.[1] || '',
        image: imageTag?.[1],
        moderators,
        author: event.pubkey,
        created_at: event.created_at,
        preferredRelays
      } as CommunityDefinition;
    },
    enabled: !!communityId
  });
}

export function useCommunityPosts(communityId?: string, communityAuthor?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['community-posts', communityId, communityAuthor],
    queryFn: async () => {
      if (!communityId || !communityAuthor) return [];

      const signal = AbortSignal.timeout(5000);
      
      // Query for community posts (kind 1111 with community a tag)
      const events = await nostr.query([{
        kinds: [1111],
        '#a': [`34550:${communityAuthor}:${communityId}`],
        limit: 50
      }], { signal });

      return events.map(event => ({
        id: event.id,
        pubkey: event.pubkey,
        content: event.content,
        created_at: event.created_at,
        tags: event.tags
      })) as CommunityPost[];
    },
    enabled: !!communityId && !!communityAuthor
  });
}

export function useCommunityComments(parentEventId?: string, parentEventAuthor?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['community-comments', parentEventId, parentEventAuthor],
    queryFn: async () => {
      if (!parentEventId) return [];

      const signal = AbortSignal.timeout(5000);
      
      // Query for comments/replies (kind 1111 with e tag pointing to parent)
      const events = await nostr.query([{
        kinds: [1111],
        '#e': [parentEventId],
        limit: 100
      }], { signal });

      return events.map(event => ({
        id: event.id,
        pubkey: event.pubkey,
        content: event.content,
        created_at: event.created_at,
        tags: event.tags
      })) as CommunityPost[];
    },
    enabled: !!parentEventId
  });
}