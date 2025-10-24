import { useNostr } from "@nostrify/react";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { useCurrentUser } from "./useCurrentUser";

import type { NostrEvent } from "@nostrify/nostrify";

interface PublishOptions {
  relayUrl?: string;
}

export function useNostrPublish(): UseMutationResult<NostrEvent, Error, { event: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>; options?: PublishOptions }> {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({ event, options }: { event: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>; options?: PublishOptions }) => {
      if (user) {
        const tags = event.tags ?? [];

        // Add the client tag if it doesn't exist
        if (location.protocol === "https:" && !tags.some(([name]) => name === "client")) {
          tags.push(["client", location.hostname]);
        }

        const signedEvent = await user.signer.signEvent({
          kind: event.kind,
          content: event.content ?? "",
          tags,
          created_at: event.created_at ?? Math.floor(Date.now() / 1000),
        });

        console.log('🚀 Publishing event:', {
          id: signedEvent.id,
          kind: signedEvent.kind,
          content: signedEvent.content.substring(0, 100) + '...',
          relayUrl: options?.relayUrl || 'all relays'
        });

        if (options?.relayUrl) {
          // Publish to specific relay only using group for better connection handling
          console.log('📡 Connecting to specific relay:', options.relayUrl);
          try {
            const relayGroup = nostr.group([options.relayUrl]);
            console.log('✅ Relay group created, publishing event...');
            await relayGroup.event(signedEvent, { signal: AbortSignal.timeout(15000) });
            console.log('✅ Event published successfully to:', options.relayUrl);
          } catch (error) {
            console.error('❌ Failed to publish to specific relay:', error);
            console.error('Relay URL:', options.relayUrl);
            console.error('Error details:', error);
            throw new Error(`Failed to publish to ${options.relayUrl}: ${error.message || error}`);
          }
        } else {
          // Publish to all relays (default behavior)
          console.log('📡 Publishing to all relays...');
          try {
            await nostr.event(signedEvent, { signal: AbortSignal.timeout(10000) });
            console.log('✅ Event published successfully to all relays');
          } catch (error) {
            console.error('❌ Failed to publish to all relays:', error);
            throw new Error(`Failed to publish to relays: ${error.message || error}`);
          }
        }

        return signedEvent;
      } else {
        throw new Error("User is not logged in");
      }
    },
    onError: (error) => {
      console.error("❌ Failed to publish event:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    },
    onSuccess: (data) => {
      console.log("Event published successfully:", data);
    },
  });
}