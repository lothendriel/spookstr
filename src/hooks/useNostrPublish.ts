import { useNostr } from "@nostrify/react";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { NRelay1 } from "@nostrify/nostrify";

import { useCurrentUser } from "./useCurrentUser";
import { useAppContext } from "./useAppContext";

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
  const { config } = useAppContext();

  console.log('📝 useNostrPublish hook initialized:', {
    nostrAvailable: !!nostr,
    nostrType: typeof nostr,
    nostrMethods: nostr ? Object.getOwnPropertyNames(nostr).filter(name => typeof nostr[name] === 'function') : [],
    userAvailable: !!user,
    userPubkey: user?.pubkey?.substring(0, 16) + '...',
    configAvailable: !!config
  });

  return useMutation({
    mutationFn: async ({ event, options }: { event: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>; options?: PublishOptions }) => {
      if (!nostr) {
        throw new Error('Nostr connection not available');
      }

      if (user) {
        const tags = event.tags ?? [];

        // Add the NIP-89 client tag if enabled and it doesn't exist
        if (config.includeClientTag && !tags.some(([name]) => name === "client")) {
          tags.push(["client", "Conjured with Spookstr"]);
        }

        // Create a unique signature for this event to detect duplicates
        const eventSignature = `${event.kind}:${event.content}:${JSON.stringify(tags.sort())}:${event.created_at || Date.now()}`;

        // Check if we've recently published this exact same event
        if (recentEventSignatures.has(eventSignature)) {
          console.warn("Duplicate event detected, skipping publish");
          throw new Error("Duplicate event: This appears to be a duplicate submission");
        }

        const eventData = {
          kind: event.kind,
          content: event.content ?? "",
          tags,
          created_at: event.created_at ?? Math.floor(Date.now() / 1000),
        };

        console.log('📝 About to sign event:', eventData);

        const signedEvent = await user.signer.signEvent(eventData);

        console.log('✅ Event signed successfully:', {
          id: signedEvent.id,
          kind: signedEvent.kind,
          pubkey: signedEvent.pubkey,
          tags: signedEvent.tags,
          created_at: signedEvent.created_at
        });

        // Add the signature to our tracking set
        recentEventSignatures.add(eventSignature);

        // Clean up old signatures after TTL
        setTimeout(() => {
          recentEventSignatures.delete(eventSignature);
        }, SIGNATURE_CACHE_TTL);

        if (options?.relayUrl) {
          // Publish to specific relay only
          console.log('🎯 Publishing to specific relay:', options.relayUrl);
          console.log('🎯 Event to publish:', {
            id: signedEvent.id,
            kind: signedEvent.kind,
            pubkey: signedEvent.pubkey,
            created_at: signedEvent.created_at,
            content: signedEvent.content.substring(0, 100) + '...',
            tags: signedEvent.tags
          });
          try {
            // Create a direct relay connection instead of using the pool
            const relay = new NRelay1(options.relayUrl);
            console.log('🎯 Direct relay connection created successfully');
            await relay.event(signedEvent, { signal: AbortSignal.timeout(8000) });
            console.log('✅ Successfully published to relay:', options.relayUrl);
          } catch (error) {
            console.error('❌ Error publishing to specific relay:', error);
            throw error;
          }
        } else {
          // Publish to all relays (default behavior)
          console.log('📡 Publishing to all relays...');
          console.log('📡 Nostr event method available:', typeof nostr.event);
          console.log('📡 Nostr object type:', typeof nostr);
          console.log('📡 Signed event:', {
            id: signedEvent.id,
            kind: signedEvent.kind,
            pubkey: signedEvent.pubkey,
            created_at: signedEvent.created_at,
            content: signedEvent.content.substring(0, 100) + '...',
            tags: signedEvent.tags
          });

          try {
            console.log('📡 About to call nostr.event...');
            const result = await nostr.event(signedEvent, { signal: AbortSignal.timeout(8000) });
            console.log('✅ Successfully published to all relays, result:', result);
          } catch (publishError) {
            console.error('❌ Failed to publish to all relays:', publishError);
            console.error('❌ Publish error details:', {
              message: publishError.message,
              stack: publishError.stack,
              name: publishError.name
            });
            throw publishError;
          }
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
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    },
    onSuccess: (data) => {
      console.log("Event published successfully:", data);
    },
  });
}