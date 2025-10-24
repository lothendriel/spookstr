import { useNostr } from "@nostrify/react";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { useCurrentUser } from "./useCurrentUser";

import type { NostrEvent } from "@nostrify/nostrify";

interface PublishOptions {
  relayUrl?: string;
}

// Track recent event signatures to prevent duplicates
const recentEventSignatures = new Set<string>();
const SIGNATURE_CACHE_TTL = 30000; // 30 seconds

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

        // Create a unique signature for this event to detect duplicates
        const eventSignature = `${event.kind}:${event.content}:${JSON.stringify(tags.sort())}:${event.created_at || Date.now()}`;
        
        // Check if we've recently published this exact same event
        if (recentEventSignatures.has(eventSignature)) {
          console.warn("Duplicate event detected, skipping publish:", eventSignature);
          throw new Error("Duplicate event: This appears to be a duplicate submission");
        }

        const signedEvent = await user.signer.signEvent({
          kind: event.kind,
          content: event.content ?? "",
          tags,
          created_at: event.created_at ?? Math.floor(Date.now() / 1000),
        });

        // Add the signature to our tracking set
        recentEventSignatures.add(eventSignature);
        
        // Clean up old signatures after TTL
        setTimeout(() => {
          recentEventSignatures.delete(eventSignature);
        }, SIGNATURE_CACHE_TTL);

        if (options?.relayUrl) {
          // Publish to specific relay only
          const relay = nostr.relay(options.relayUrl);
          await relay.event(signedEvent, { signal: AbortSignal.timeout(8000) });
        } else {
          // Publish to all relays (default behavior)
          await nostr.event(signedEvent, { signal: AbortSignal.timeout(8000) });
        }

        return signedEvent;
      } else {
        throw new Error("User is not logged in");
      }
    },
    retry: (failureCount, error) => {
      // Only retry once for network errors, not for duplicate events
      if (error.message.includes("Duplicate event")) {
        return false; // Don't retry duplicates
      }
      return failureCount < 1; // Retry once for other errors
    },
    onError: (error) => {
      console.error("Failed to publish event:", error);
    },
    onSuccess: (data) => {
      console.log("Event published successfully:", data);
    },
  });
}