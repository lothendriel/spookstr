import { useNostr } from "@nostrify/react";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { useCurrentUser } from "./useCurrentUser";

import type { NostrEvent } from "@nostrify/nostrify";

interface PublishOptions {
  relayUrl?: string;
}

// Test relay connectivity
async function testRelayConnection(nostr: any, relayUrl: string): Promise<boolean> {
  try {
    console.log('🔍 Testing relay connection:', relayUrl);
    const relay = nostr.relay(relayUrl);

    // Try a simple query to test connectivity
    const testFilters = [{ kinds: [1], limit: 1 }];
    await relay.query(testFilters, { signal: AbortSignal.timeout(5000) });

    console.log('✅ Relay connection test successful:', relayUrl);
    return true;
  } catch (error) {
    console.warn('⚠️ Relay connection test failed:', relayUrl, error);
    return false;
  }
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
          // Publish to specific relay only with connection test and fallback strategies
          console.log('📡 Connecting to specific relay:', options.relayUrl);

          // Test connection first
          const isConnected = await testRelayConnection(nostr, options.relayUrl);

          if (!isConnected) {
            console.warn('⚠️ Relay connection test failed, but attempting to publish anyway...');
          }

          try {
            // First try with group approach
            const relayGroup = nostr.group([options.relayUrl]);
            console.log('✅ Relay group created, publishing event...');
            await relayGroup.event(signedEvent, { signal: AbortSignal.timeout(15000) });
            console.log('✅ Event published successfully to:', options.relayUrl);
          } catch (groupError) {
            console.warn('⚠️ Group approach failed, trying direct relay connection...');
            console.warn('Group error:', groupError);

            try {
              // Fallback to direct relay connection
              const relay = nostr.relay(options.relayUrl);
              console.log('✅ Direct relay connection established, publishing event...');
              await relay.event(signedEvent, { signal: AbortSignal.timeout(20000) });
              console.log('✅ Event published successfully to:', options.relayUrl);
            } catch (directError) {
              console.error('❌ Both group and direct relay connections failed:', directError);
              console.error('Relay URL:', options.relayUrl);
              console.error('Direct error details:', directError);

              // Last resort: try to publish through the main nostr pool but only to this relay
              try {
                console.log('🔄 Last resort: trying through main pool with single relay...');
                const tempPool = nostr.group([options.relayUrl]);
                await tempPool.event(signedEvent, { signal: AbortSignal.timeout(25000) });
                console.log('✅ Event published successfully through last resort method:', options.relayUrl);
              } catch (lastResortError) {
                console.error('❌ All connection methods failed:', lastResortError);
                throw new Error(`Failed to publish to ${options.relayUrl} after multiple attempts: ${directError.message || directError}`);
              }
            }
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