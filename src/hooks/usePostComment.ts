import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { type NostrEvent } from '@nostrify/nostrify';
import { extractMentions } from '@/lib/mentions';
import { getCommentsQueryKey } from './useComments';

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
      const queryKey = getCommentsQueryKey(root);

      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update to the new value
      // This is a simple optimistic update - in a real app you'd construct the full event
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;

        // For now, just trigger a refetch by marking the data as stale
        // A more sophisticated approach would add the new comment to the cache
        return {
          ...old,
          data: {
            ...old.data,
            topLevelComments: [
              ...(old.data?.topLevelComments || []),
              // We can't easily construct the full event here, so we'll just trigger a refetch
            ]
          }
        };
      });

      return { previousData, queryKey };
    },
    onSuccess: (newEvent, { root }, context) => {
      const queryKey = getCommentsQueryKey(root);

      // Invalidate and refetch comments with the correct query key
      queryClient.invalidateQueries({
        queryKey
      });

      // Also invalidate the main feed to ensure content separation is maintained
      queryClient.invalidateQueries({
        queryKey: ['paranormal-feed']
      });

      // Show success toast
      console.log('✅ Comment posted successfully:', newEvent?.id);
    },
    onError: (error, { root }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
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