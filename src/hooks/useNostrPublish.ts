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

        if (options?.relayUrl) {
          // Publish to specific relay only
          const relay = nostr.relay(options.relayUrl);
          await relay.event(signedEvent, { signal: AbortSignal.timeout(5000) });
        } else {
          // Publish to all relays (default behavior)
          await nostr.event(signedEvent, { signal: AbortSignal.timeout(5000) });
        }

        return signedEvent;
      } else {
        throw new Error("User is not logged in");
      }
    },

    onError: (error) => {
      console.error("Failed to publish event:", error);
    },
    onSuccess: (data) => {
      console.log("Event published successfully:", data);
    },
  });
}