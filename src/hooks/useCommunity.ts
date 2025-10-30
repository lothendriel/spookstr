import { useQuery } from '@tanstack/react-query';
import { useNostr } from './useNostr';
import { nip19 } from 'nostr-tools';
import { filterNSFWContent } from '@/lib/nsfwFilter';

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
      const communityTag = `34550:${communityAuthor}:${communityId}`;

      // Query for community posts (kind 1111 with uppercase A tag for NIP-72, and kind 1 for backwards compatibility)
      const events = await nostr.query([
        {
          kinds: [1111],
          '#A': [communityTag], // NIP-72 standard uppercase A tag
          limit: 50
        },
        {
          kinds: [1],
          '#a': [communityTag], // Legacy lowercase a tag for backwards compatibility
          limit: 50
        }
      ], { signal });

      // Filter out NSFW content from community posts
      const filteredEvents = filterNSFWContent(events);

      // Remove duplicates and sort by created_at
      const uniqueEvents = Array.from(
        new Map(filteredEvents.map(e => [e.id, e])).values()
      ).sort((a, b) => b.created_at - a.created_at);

      return uniqueEvents.map(event => ({
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
    queryFn: async (context) => {
      if (!parentEventId) return [];

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);

      console.log(`💬 Fetching comments for post: ${parentEventId.slice(0, 8)}...`);

      // Query for all replies to this post (both community-aware and legacy replies)
      const events = await nostr.query([
        {
          kinds: [1111], // NIP-22 community comments
          '#e': [parentEventId],
          limit: 100
        },
        {
          kinds: [1], // Legacy replies (like the one you found)
          '#e': [parentEventId],
          limit: 100
        }
      ], { signal });

      console.log(`💬 Found ${events.length} total replies (kind 1111 + kind 1)`);

      // Filter out NSFW content from community comments
      const filteredEvents = filterNSFWContent(events);

      console.log(`💬 ${filteredEvents.length} replies after NSFW filter`);

      // Remove duplicates and sort by created_at
      const uniqueEvents = Array.from(
        new Map(filteredEvents.map(e => [e.id, e])).values()
      ).sort((a, b) => a.created_at - b.created_at); // Oldest first for comments

      console.log(`💬 ${uniqueEvents.length} unique replies after deduplication`);

      // Log each reply for debugging
      uniqueEvents.forEach((event, index) => {
        console.log(`💬 Reply ${index + 1}: ${event.id.slice(0, 8)}... (kind ${event.kind}) by ${event.pubkey.slice(0, 8)}...`);
        console.log(`    Content: "${event.content.slice(0, 50)}${event.content.length > 50 ? '...' : ''}"`);
        console.log(`    Tags:`, event.tags);
      });

      return uniqueEvents.map(event => ({
        id: event.id,
        pubkey: event.pubkey,
        content: event.content,
        created_at: event.created_at,
        tags: event.tags
      })) as CommunityPost[];
    },
    enabled: !!parentEventId,
    staleTime: 0, // Always fetch fresh comment data
    refetchInterval: 15000 // Check for new comments every 15 seconds
  });
}