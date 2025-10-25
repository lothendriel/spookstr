import { NostrEvent, NostrFilter } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { filterNSFWContent } from '@/lib/nsfwFilter';

interface ThreadNode {
  event: NostrEvent;
  children: ThreadNode[];
  depth: number;
}

export function useComments(root: NostrEvent | URL, limit?: number) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['comments', root instanceof URL ? root.toString() : root.id, limit],
    queryFn: async (c) => {
      const filter: NostrFilter = { kinds: [1] }; // Only kind 1 events for NIP-10 comments

      if (root instanceof URL) {
        filter['#r'] = [root.toString()];
      } else {
        filter['#e'] = [root.id];
      }

      if (typeof limit === 'number') {
        filter.limit = limit;
      }

      console.log('🔍 [useComments] Query filter:', JSON.stringify(filter, null, 2));

      // Query for all kind 1 comments that reference this root event
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query([filter], { signal });

      // Filter out NSFW content from comments
      const filteredEvents = filterNSFWContent(events);

      console.log('📥 [useComments] Query returned events:', filteredEvents.length);
      console.log('📋 [useComments] Root event:', {
        id: root instanceof URL ? root.toString() : root.id,
        kind: root instanceof URL ? 'URL' : root.kind,
        pubkey: root instanceof URL ? 'N/A' : root.pubkey
      });

      // Helper function to get e tags with their marker (root, reply, mention)
      const getETags = (event: NostrEvent): Array<{ id: string; marker?: string }> => {
        return event.tags
          .filter(([name]) => name === 'e')
          .map(([, id, , marker]) => ({ id, marker }));
      };

      // Build thread tree structure
      const buildThreadTree = (events: NostrEvent[]): ThreadNode[] => {
        const eventMap = new Map<string, NostrEvent>();
        const childMap = new Map<string, NostrEvent[]>();

        // Create event map and initialize child map
        events.forEach(event => {
          eventMap.set(event.id, event);
          childMap.set(event.id, []);
        });

        // Build parent-child relationships
        filteredEvents.forEach(event => {
          const eTags = getETags(event);

          // Find the parent based on NIP-10 rules
          let parentId: string | null = null;

          // First, look for a 'reply' marker
          const replyTag = eTags.find(tag => tag.marker === 'reply');
          if (replyTag) {
            parentId = replyTag.id;
          } else {
            // If no 'reply' marker, look for a 'root' marker
            const rootTag = eTags.find(tag => tag.marker === 'root');
            if (rootTag) {
              parentId = rootTag.id;
            } else {
              // If no markers, use the first e tag that references another event in the thread
              const parentTag = eTags.find(tag =>
                tag.id !== (root instanceof URL ? undefined : root.id) &&
                eventMap.has(tag.id)
              );
              if (parentTag) {
                parentId = parentTag.id;
              }
            }
          }

          // If we found a parent that exists in our event set, add this event as its child
          if (parentId && childMap.has(parentId)) {
            childMap.get(parentId)!.push(event);
          }
        });

        // Find root nodes (events that don't have a parent in the thread or are direct replies to the root)
        const rootNodes: ThreadNode[] = [];
        const processed = new Set<string>();

        const buildNode = (event: NostrEvent, depth: number): ThreadNode => {
          const children = childMap.get(event.id) || [];
          return {
            event,
            children: children.map(child => buildNode(child, depth + 1)),
            depth
          };
        };

        filteredEvents.forEach(event => {
          if (processed.has(event.id)) return;

          const eTags = getETags(event);
          const isDirectReply = root instanceof URL
            ? eTags.some(tag => tag.marker === 'root')
            : eTags.some(tag => tag.id === root.id && (tag.marker === 'root' || !tag.marker));

          if (isDirectReply) {
            const node = buildNode(event, 0);
            rootNodes.push(node);
            processed.add(event.id);

            // Mark all descendants as processed
            const markDescendants = (node: ThreadNode) => {
              processed.add(node.event.id);
              node.children.forEach(markDescendants);
            };
            markDescendants(node);
          }
        });

        // Sort root nodes by creation time (newest first)
        return rootNodes.sort((a, b) => b.event.created_at - a.event.created_at);
      };

      // Build the thread tree
      const threadTree = buildThreadTree(events);

      // Helper function to flatten the tree for legacy compatibility
      const flattenTree = (nodes: ThreadNode[]): NostrEvent[] => {
        const result: NostrEvent[] = [];
        nodes.forEach(node => {
          result.push(node.event);
          result.push(...flattenTree(node.children));
        });
        return result;
      };

      // Helper function to get direct replies to a specific comment
      const getDirectReplies = (commentId: string): NostrEvent[] => {
        const replies = filteredEvents.filter(event => {
          const eTags = getETags(event);
          return eTags.some(tag =>
            tag.id === commentId &&
            (tag.marker === 'reply' || (!tag.marker && tag.id !== (root instanceof URL ? undefined : root.id)))
          );
        });
        // Sort direct replies by creation time (oldest first for threaded display)
        return replies.sort((a, b) => a.created_at - b.created_at);
      };

      // Get top-level comments (for backward compatibility)
      const topLevelComments = threadTree.map(node => node.event);

      console.log('✅ [useComments] Thread tree built:', {
        totalEvents: filteredEvents.length,
        rootNodes: threadTree.length,
        topLevelComments: topLevelComments.length
      });

      return {
        allComments: filteredEvents,
        topLevelComments,
        threadTree,
        getDirectReplies,
        flattenTree
      };
    },
    enabled: !!root,
  });
}