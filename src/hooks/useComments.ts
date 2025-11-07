import { NostrEvent, NostrFilter } from '@nostrify/nostrify';
import { useRelayHintQuery } from '@/hooks/useRelayHintQuery';
import { filterNSFWContent } from '@/lib/nsfwFilter';
import { useHiddenUsers } from '@/hooks/useHiddenUsers';
import { useHiddenHashtags } from '@/hooks/useHiddenHashtags';
import {
  isCommunityContent,
  getContentType,
  getCommunityTag
} from '@/lib/contentType';

interface ThreadNode {
  event: NostrEvent;
  children: ThreadNode[];
  depth: number;
}

export function useComments(root: NostrEvent | URL, limit?: number) {
  const { isUserHidden } = useHiddenUsers();
  const { hasHiddenHashtag } = useHiddenHashtags();

  const filter: NostrFilter = { kinds: [1, 1111] }; // Kind 1 for regular comments, kind 1111 for community comments

  if (root instanceof URL) {
    filter['#r'] = [root.toString()];
  } else {
    filter['#e'] = [root.id];
  }

  if (typeof limit === 'number') {
    filter.limit = limit;
  }

  console.log('🔍 [useComments] Query filter:', JSON.stringify(filter, null, 2));

  // Use relay hint query for better comment discovery
  const { data: events, ...queryResult } = useRelayHintQuery({
    filters: [filter],
    enabled: !!root,
    staleTime: 15000, // Comments change frequently
    retry: 1,
    maxRelays: 6, // Use more relays for comment discovery
    useRelayHints: true, // Enable relay hints for better thread discovery
  });

  // Process the events into thread structure
  const processedData = events ? (() => {

    // Filter out NSFW content, hidden users, and hidden hashtags from comments
    let filteredEvents = filterNSFWContent(events);
    filteredEvents = filteredEvents.filter(event =>
      !isUserHidden(event.pubkey) && !hasHiddenHashtag(event.tags)
    );

    console.log('📥 [useComments] Query returned events:', filteredEvents.length);
    console.log('📋 [useComments] Root event:', {
      id: root instanceof URL ? root.toString() : root.id,
      kind: root instanceof URL ? 'URL' : root.kind,
      pubkey: root instanceof URL ? 'N/A' : root.pubkey
    });

    // Log comment types for debugging
    const commentTypes = filteredEvents.map(event => ({
      id: event.id.substring(0, 8),
      kind: event.kind,
      contentType: getContentType(event),
      isCommunity: isCommunityContent(event),
      communityTag: getCommunityTag(event)
    }));
    console.log('🏷️ [useComments] Comment types:', commentTypes);

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

          // Determine if this is a top-level comment (direct reply to root with no other parent)
          const rootId = root instanceof URL ? root.toString() : root.id;

          // Find reply marker (if any)
          const replyTag = eTags.find(tag => tag.marker === 'reply');

          // An event is a direct reply to root ONLY if:
          // 1. It has a reply marker pointing to the root, OR
          // 2. It has no reply marker AND has a root marker pointing to root, OR
          // 3. It has no markers but references root in first e-tag AND has no parent in our thread
          let isDirectReply = false;

          if (replyTag) {
            // If there's a reply marker, it must point to root
            isDirectReply = replyTag.id === rootId;
          } else {
            // No reply marker - check if it's a direct reply based on root marker or lack of parent
            const rootTag = eTags.find(tag => tag.marker === 'root');
            if (rootTag) {
              // Has root marker - only direct reply if it has no parent in our thread
              const hasParentInThread = eTags.some(tag =>
                tag.id !== rootId && eventMap.has(tag.id)
              );
              isDirectReply = !hasParentInThread;
            } else {
              // No markers - check if first e-tag is root and no other parent exists
              const firstETag = eTags[0];
              if (firstETag && firstETag.id === rootId) {
                const hasOtherParent = eTags.some((tag, idx) =>
                  idx > 0 && eventMap.has(tag.id)
                );
                isDirectReply = !hasOtherParent;
              }
            }
          }

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
  })() : undefined;

  return {
    ...queryResult,
    data: processedData,
  };
}