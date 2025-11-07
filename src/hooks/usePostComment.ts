import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { type NostrEvent } from '@nostrify/nostrify';
import { extractMentions } from '@/lib/mentions';
import { getCommentsQueryKey } from './useComments';
import { useCurrentUser } from './useCurrentUser';

interface PostCommentParams {
  root: NostrEvent | URL; // The root event to comment on
  reply?: NostrEvent; // Optional reply to another comment (must be NostrEvent for threading)
  content: string;
  uploadedFiles?: Array<{tags: string[]; file: File}>; // Optional uploaded files with NIP-94 tags
}

/** Post a NIP-10 compliant comment (kind 1 or 1111 text note) on an event. */
export function usePostComment() {
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({ root, reply, content, uploadedFiles = [] }: PostCommentParams) => {
      // Get the query key for optimistic updates
      const queryKey = getCommentsQueryKey(root);

      // Get current user for optimistic update
      const currentUser = queryClient.getQueryData(['current-user']);
      const tags: string[][] = [];
      let kind = 1; // Default to kind 1 for regular comments
      let communityTag: string | undefined;

      // For URL roots, we need to handle differently
      if (root instanceof URL) {
        // For URL-based roots, use the URL as a reference
        tags.push(['r', root.toString()]);
      } else {
        // Check if root is a community post (has 'A' tag with 34550)
        const communityATag = root.tags.find(tag =>
          tag[0] === 'A' && tag[1]?.startsWith('34550:')
        );

        if (communityATag) {
          // CRITICAL: ALWAYS use kind 1111 for community content to ensure proper separation
          kind = 1111;
          communityTag = communityATag[1];

          // Extract community author from the tag
          const [, communityAuthor] = communityTag.split(':');

          // Add NIP-72 uppercase tags for community definition
          tags.push(['A', communityTag]);
          tags.push(['P', communityAuthor]);
          tags.push(['K', '34550']);

          // Add lowercase tags for community context
          tags.push(['a', communityTag]);
          tags.push(['k', root.kind.toString()]);

          console.log('🏘️ Creating community comment with kind 1111 for community:', communityTag);
        }

        // NIP-10/NIP-72 threading: Add parent event reference
        tags.push(['e', root.id, '', reply ? 'root' : 'reply']);
        tags.push(['p', root.pubkey]);
      }

      // If replying to another comment, add reply reference (NIP-10)
      if (reply) {
        tags.push(['e', reply.id, '', 'reply']);
        tags.push(['p', reply.pubkey]);
        if (communityTag) {
          // Ensure community context is maintained for comment replies too
          tags.push(['k', reply.kind.toString()]);
        }
      }

      // Add mention tags (p tags for mentioned users)
      const mentionTags = extractMentions(content);
      tags.push(...mentionTags);

      // Add uploaded file tags (NIP-94)
      console.log('=== POST COMMENT WITH FILES ===');
      console.log('Content:', content);
      console.log('Mention tags:', mentionTags);
      console.log('Uploaded files count:', uploadedFiles.length);

      uploadedFiles.forEach((uploadedFile, index) => {
        console.log(`File ${index + 1}:`, {
          fileName: uploadedFile.file.name,
          fileSize: uploadedFile.file.size,
          fileType: uploadedFile.file.type,
          tags: uploadedFile.tags,
          tagsExpanded: JSON.stringify(uploadedFile.tags, null, 2),
          hasUrlTag: uploadedFile.tags.some(tag => tag[0] === 'url'),
          urlValue: uploadedFile.tags.find(tag => tag[0] === 'url')?.[1]
        });
        console.log('Adding file tags:', uploadedFile.tags);

        tags.push(...uploadedFile.tags);
      });

      // Add client tag for identification
      tags.push(['client', 'spookstr']);

      // Generate timestamp for better duplicate detection
      const created_at = Math.floor(Date.now() / 1000);

      console.log('📋 Final comment event structure:', {
        kind,
        content,
        tags: tags,
        isCommunityComment: !!communityTag,
        communityTag: communityTag || 'none'
      });

      // CRITICAL: Validate that community content always uses kind 1111
      if (communityTag && kind !== 1111) {
        throw new Error('Community content must use kind 1111 for proper separation');
      }

      const event = await publishEvent({
        event: {
          kind,
          content,
          tags,
          created_at,
        }
      });

      return event;
    },
    onMutate: async ({ root, reply, content, uploadedFiles = [] }) => {
      if (!user) {
        throw new Error('User must be logged in to post comments');
      }

      const queryKey = getCommentsQueryKey(root);

      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Construct optimistic comment event
      const optimisticComment: NostrEvent = {
        id: `optimistic-${Date.now()}`, // Temporary ID
        pubkey: user.pubkey,
        created_at: Math.floor(Date.now() / 1000),
        kind: 1, // Default kind, will be updated below
        tags: [],
        content,
        sig: '', // Empty signature for optimistic update
      };

      // Build tags for the optimistic comment (same logic as in mutationFn)
      const tags: string[][] = [];
      let kind = 1;

      if (root instanceof URL) {
        tags.push(['r', root.toString()]);
      } else {
        // Check if root is a community post
        const communityATag = root.tags.find(tag =>
          tag[0] === 'A' && tag[1]?.startsWith('34550:')
        );

        if (communityATag) {
          kind = 1111;
          const communityTag = communityATag[1];
          const [, communityAuthor] = communityTag.split(':');

          tags.push(['A', communityTag]);
          tags.push(['P', communityAuthor]);
          tags.push(['K', '34550']);
          tags.push(['a', communityTag]);
          tags.push(['k', root.kind.toString()]);
        }

        // NIP-10 threading
        tags.push(['e', root.id, '', reply ? 'root' : 'reply']);
        tags.push(['p', root.pubkey]);
      }

      if (reply) {
        tags.push(['e', reply.id, '', 'reply']);
        tags.push(['p', reply.pubkey]);
      }

      // Add mentions
      const mentionTags = extractMentions(content);
      tags.push(...mentionTags);

      // Add file tags
      uploadedFiles.forEach(uploadedFile => {
        tags.push(...uploadedFile.tags);
      });

      // Add client tag
      tags.push(['client', 'spookstr']);

      // Update the optimistic comment
      optimisticComment.kind = kind;
      optimisticComment.tags = tags;

      // Optimistically update the cache
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.data) return old;

        const { allComments = [], topLevelComments = [], threadTree = [] } = old.data;

        // Create new arrays with the optimistic comment
        const newAllComments = [optimisticComment, ...allComments];

        // Determine if this is a top-level comment or a reply
        const isTopLevel = !reply;

        if (isTopLevel) {
          // Add as top-level comment
          const newTopLevelComments = [optimisticComment, ...topLevelComments];
          const newThreadTree = [{
            event: optimisticComment,
            children: []
          }, ...threadTree];

          return {
            ...old,
            data: {
              ...old.data,
              allComments: newAllComments,
              topLevelComments: newTopLevelComments,
              threadTree: newThreadTree
            }
          };
        } else {
          // This is a reply to another comment - we need to add it to the thread tree
          // For simplicity, we'll add it as a new top-level comment and let the refetch fix the threading
          const newTopLevelComments = [optimisticComment, ...topLevelComments];
          const newThreadTree = [{
            event: optimisticComment,
            children: []
          }, ...threadTree];

          return {
            ...old,
            data: {
              ...old.data,
              allComments: newAllComments,
              topLevelComments: newTopLevelComments,
              threadTree: newThreadTree
            }
          };
        }
      });

      return { previousData, queryKey, optimisticComment };
    },
    onSuccess: (newEvent, { root }, context) => {
      const queryKey = getCommentsQueryKey(root);

      // Replace the optimistic comment with the real one
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.data || !context?.optimisticComment) return old;

        const { allComments = [], topLevelComments = [], threadTree = [] } = old.data;
        const optimisticId = context.optimisticComment.id;

        // Replace optimistic comment with real one
        const replaceOptimisticComment = (items: NostrEvent[]) =>
          items.map(item => item.id === optimisticId ? newEvent : item);

        const replaceInThreadTree = (nodes: any[]): any[] =>
          nodes.map(node => ({
            event: node.event.id === optimisticId ? newEvent : node.event,
            children: replaceInThreadTree(node.children)
          }));

        return {
          ...old,
          data: {
            ...old.data,
            allComments: replaceOptimisticComment(allComments),
            topLevelComments: replaceOptimisticComment(topLevelComments),
            threadTree: replaceInThreadTree(threadTree)
          }
        };
      });

      // Then refetch to get the complete updated thread structure
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 1000); // Wait a bit before refetching to let the user see their comment

      // Also invalidate the main feed to ensure content separation is maintained
      queryClient.invalidateQueries({
        queryKey: ['paranormal-feed']
      });

      console.log('✅ Comment posted successfully:', newEvent?.id);
    },
    onError: (error, { root }, context) => {
      // If the mutation fails, roll back to the previous data
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      } else {
        // If we don't have previous data, at least remove the optimistic comment
        queryClient.setQueryData(context.queryKey, (old: any) => {
          if (!old?.data || !context?.optimisticComment) return old;

          const { allComments = [], topLevelComments = [], threadTree = [] } = old.data;
          const optimisticId = context.optimisticComment.id;

          // Remove optimistic comment
          const removeOptimisticComment = (items: NostrEvent[]) =>
            items.filter(item => item.id !== optimisticId);

          const removeFromThreadTree = (nodes: any[]): any[] =>
            nodes.filter(node => node.event.id !== optimisticId)
              .map(node => ({
                event: node.event,
                children: removeFromThreadTree(node.children)
              }));

          return {
            ...old,
            data: {
              ...old.data,
              allComments: removeOptimisticComment(allComments),
              topLevelComments: removeOptimisticComment(topLevelComments),
              threadTree: removeFromThreadTree(threadTree)
            }
          };
        });
      }

      console.error('❌ Failed to post comment:', error);
    },
    onSettled: (_, __, { root }, context) => {
      // Always refetch after error or success to ensure we're in sync with the server
      const queryKey = getCommentsQueryKey(root);
      queryClient.invalidateQueries({ queryKey });
    },
  });
}