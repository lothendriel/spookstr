import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { type NostrEvent } from '@nostrify/nostrify';

interface PostCommentParams {
  root: NostrEvent | URL; // The root event to comment on
  reply?: NostrEvent; // Optional reply to another comment (must be NostrEvent for threading)
  content: string;
  uploadedFiles?: Array<{tags: string[]; file: File}>; // Optional uploaded files with NIP-94 tags
}

/** Post a NIP-10 compliant comment (kind 1 text note) on an event. */
export function usePostComment() {
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ root, reply, content, uploadedFiles = [] }: PostCommentParams) => {
      const tags: string[][] = [];

      // For URL roots, we need to handle differently
      if (root instanceof URL) {
        // For URL-based roots, use the URL as a reference
        tags.push(['r', root.toString()]);
      } else {
        // NIP-10 threading: Add root event reference
        tags.push(['e', root.id, '', 'root']);
        tags.push(['p', root.pubkey]);
      }

      // If replying to another comment, add reply reference (NIP-10)
      if (reply) {
        tags.push(['e', reply.id, '', 'reply']);
        tags.push(['p', reply.pubkey]);
      }

      // Add uploaded file tags (NIP-94)
      console.log('=== POST COMMENT WITH FILES ===');
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
        kind: 1,
        content,
        tags: tags
      });

      const event = await publishEvent({
        event: {
          kind: 1, // Use kind 1 for NIP-10 compliant text notes
          content,
          tags,
          created_at,
        }
      });

      return event;
    },
    onSuccess: (_, { root }) => {
      // Invalidate and refetch comments
      queryClient.invalidateQueries({
        queryKey: ['comments', root instanceof URL ? root.toString() : root.id]
      });
    },
  });
}