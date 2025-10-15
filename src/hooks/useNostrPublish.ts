import { useNostr } from "@nostrify/react";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";

import { useCurrentUser } from "./useCurrentUser";

import type { NostrEvent } from "@nostrify/nostrify";

// Enhanced publishing error handling
const PUBLISH_ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  TIMEOUT: 'Publishing timed out. Please try again.',
  RELAY_ERROR: 'Relay connection failed. Please try a different relay.',
  SIGNING_ERROR: 'Failed to sign event. Please check your authentication.',
  RATE_LIMIT: 'Rate limit exceeded. Please wait a moment and try again.',
  UNKNOWN_ERROR: 'Failed to publish event. Please try again.',
};

function getPublishErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('network') || message.includes('fetch')) {
    return PUBLISH_ERROR_MESSAGES.NETWORK_ERROR;
  }
  if (message.includes('timeout')) {
    return PUBLISH_ERROR_MESSAGES.TIMEOUT;
  }
  if (message.includes('relay') || message.includes('connection')) {
    return PUBLISH_ERROR_MESSAGES.RELAY_ERROR;
  }
  if (message.includes('sign') || message.includes('signature')) {
    return PUBLISH_ERROR_MESSAGES.SIGNING_ERROR;
  }
  if (message.includes('rate') || message.includes('limit')) {
    return PUBLISH_ERROR_MESSAGES.RATE_LIMIT;
  }

  return PUBLISH_ERROR_MESSAGES.UNKNOWN_ERROR;
}

export function useNostrPublish(): UseMutationResult<NostrEvent> {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (t: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>) => {
      if (!user) {
        throw new Error("User is not logged in");
      }

      if (!user.signer) {
        throw new Error("No signer available. Please re-authenticate.");
      }

      const tags = t.tags ?? [];

      // Add the client tag if it doesn't exist
      if (location.protocol === "https:" && !tags.some(([name]) => name === "client")) {
        tags.push(["client", location.hostname]);
      }

      // Enhanced event validation
      if (t.kind === undefined || t.kind === null) {
        throw new Error("Event kind is required");
      }

      if (t.content === undefined || t.content === null) {
        throw new Error("Event content is required");
      }

      try {
        const event = await user.signer.signEvent({
          kind: t.kind,
          content: t.content,
          tags,
          created_at: t.created_at ?? Math.floor(Date.now() / 1000),
        });

        // Validate signed event
        if (!event.id || !event.pubkey || !event.sig) {
          throw new Error("Invalid signed event: missing required fields");
        }

        // Enhanced publishing with retry logic
        const publishWithRetry = async (event: NostrEvent, attempt = 1): Promise<void> => {
          const maxAttempts = 3;
          const timeout = Math.min(5000 * attempt, 15000); // Progressive timeout

          try {
            await nostr.event(event, { signal: AbortSignal.timeout(timeout) });
          } catch (publishError) {
            if (attempt < maxAttempts) {
              console.warn(`Publish attempt ${attempt} failed, retrying...`, publishError);
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
              return publishWithRetry(event, attempt + 1);
            }
            throw publishError;
          }
        };

        await publishWithRetry(event);
        return event;
      } catch (error) {
        console.error("Event signing/publishing failed:", error);
        throw error;
      }
    },
    onError: (error) => {
      console.error("Failed to publish event:", error);
      const errorMessage = error instanceof Error ? getPublishErrorMessage(error) : PUBLISH_ERROR_MESSAGES.UNKNOWN_ERROR;

      toast({
        title: "Publishing failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      console.log("Event published successfully:", data);
      toast({
        title: "Published successfully",
        description: "Your content has been shared on Nostr.",
      });
    },
  });
}