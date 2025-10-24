import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { type NostrEvent } from '@nostrify/nostrify';

interface PostCommentParams {
  root: NostrEvent | URL; // The root event to comment on
  reply?: NostrEvent; // Optional reply to another comment (must be NostrEvent for threading)
  content: string;
}

/** Post a NIP-10 compliant comment (kind 1 text note) on an event. */
export function usePostComment() {
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ root, reply, content }: PostCommentParams) => {
      console.log("💬 usePostComment mutationFn called", { root, reply, content });

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

      // Add client tag for identification
      tags.push(['client', 'spookstr']);

      console.log("🏷️  Comment tags:", tags);

      const event = await publishEvent({
        event: {
          kind: 1, // Use kind 1 for NIP-10 compliant text notes
          content,
          tags,
        }
      });

      return event;
    },
    onSuccess: (_, { root }) => {
      console.log("✅ Comment posted successfully, invalidating queries");
      // Invalidate and refetch comments
      queryClient.invalidateQueries({
        queryKey: ['comments', root instanceof URL ? root.toString() : root.id]
      });
    },
    onError: (error) => {
      console.error("❌ Failed to post comment:", error);
    },
  });
}