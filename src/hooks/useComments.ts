import { NKinds, NostrEvent, NostrFilter } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

export function useComments(root: NostrEvent | URL, limit?: number) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['comments', root instanceof URL ? root.toString() : root.id, limit],
    queryFn: async (c) => {
      const filter: NostrFilter = { kinds: [1111] };

      if (root instanceof URL) {
        filter['#i'] = [root.toString()];
      } else if (NKinds.addressable(root.kind)) {
        const d = root.tags.find(([name]) => name === 'd')?.[1] ?? '';
        filter['#a'] = [`${root.kind}:${root.pubkey}:${d}`];
      } else if (NKinds.replaceable(root.kind)) {
        filter['#a'] = [`${root.kind}:${root.pubkey}:`];
      } else {
        filter['#e'] = [root.id];
      }

      if (typeof limit === 'number') {
        filter.limit = limit;
      }

      console.log('🔍 [useComments] Query filter:', JSON.stringify(filter, null, 2));

      // Query for all kind 1111 comments that reference this addressable event regardless of depth
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([filter], { signal });

      console.log('📥 [useComments] Query returned events:', events.length);
      console.log('📋 [useComments] Root event:', {
        id: root instanceof URL ? root.toString() : root.id,
        kind: root instanceof URL ? 'URL' : root.kind,
        pubkey: root instanceof URL ? 'N/A' : root.pubkey
      });

      // Helper function to get tag value
      const getTagValue = (event: NostrEvent, tagName: string): string | undefined => {
        const tag = event.tags.find(([name]) => name === tagName);
        return tag?.[1];
      };

      // Log all events for debugging
      events.forEach((event, index) => {
        console.log(`📝 [useComments] Event ${index + 1}:`, {
          id: event.id,
          kind: event.kind,
          content: event.content.substring(0, 100) + '...',
          tags: event.tags,
          eTag: getTagValue(event, 'e'),
          aTag: getTagValue(event, 'a'),
          iTag: getTagValue(event, 'i')
        });
      });

      // Filter top-level comments (those with lowercase tag matching the root)
      const topLevelComments = events.filter(comment => {
        const matches = (() => {
          if (root instanceof URL) {
            return getTagValue(comment, 'i') === root.toString();
          } else if (NKinds.addressable(root.kind)) {
            const d = getTagValue(root, 'd') ?? '';
            return getTagValue(comment, 'a') === `${root.kind}:${root.pubkey}:${d}`;
          } else if (NKinds.replaceable(root.kind)) {
            return getTagValue(comment, 'a') === `${root.kind}:${root.pubkey}:`;
          } else {
            return getTagValue(comment, 'e') === root.id;
          }
        })();

        console.log(`🔍 [useComments] Comment ${comment.id} matches root:`, matches, {
          expectedE: root instanceof URL ? root.toString() : root.id,
          actualE: getTagValue(comment, 'e'),
          expectedA: root instanceof URL ? null : `${root.kind}:${root.pubkey}:${getTagValue(root, 'd') ?? ''}`,
          actualA: getTagValue(comment, 'a')
        });

        return matches;
      });

      console.log('✅ [useComments] Top-level comments after filtering:', topLevelComments.length);

      // Helper function to get all descendants of a comment
      const getDescendants = (parentId: string): NostrEvent[] => {
        const directReplies = events.filter(comment => {
          const eTag = getTagValue(comment, 'e');
          return eTag === parentId;
        });

        const allDescendants = [...directReplies];

        // Recursively get descendants of each direct reply
        for (const reply of directReplies) {
          allDescendants.push(...getDescendants(reply.id));
        }

        return allDescendants;
      };

      // Create a map of comment ID to its descendants
      const commentDescendants = new Map<string, NostrEvent[]>();
      for (const comment of events) {
        commentDescendants.set(comment.id, getDescendants(comment.id));
      }

      // Sort top-level comments by creation time (newest first)
      const sortedTopLevel = topLevelComments.sort((a, b) => b.created_at - a.created_at);

      return {
        allComments: events,
        topLevelComments: sortedTopLevel,
        getDescendants: (commentId: string) => {
          const descendants = commentDescendants.get(commentId) || [];
          // Sort descendants by creation time (oldest first for threaded display)
          return descendants.sort((a, b) => a.created_at - b.created_at);
        },
        getDirectReplies: (commentId: string) => {
          const directReplies = events.filter(comment => {
            const eTag = getTagValue(comment, 'e');
            return eTag === commentId;
          });
          // Sort direct replies by creation time (oldest first for threaded display)
          return directReplies.sort((a, b) => a.created_at - b.created_at);
        }
      };
    },
    enabled: !!root,
  });
}