import { useNostr } from "@nostrify/react";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { useAppContext } from "./useAppContext";
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

// Publish to multiple relays with individual error handling
async function publishToMultipleRelays(nostr: any, event: NostrEvent, relayUrls: string[]): Promise<{ successful: string[]; failed: string[] }> {
  const successful: string[] = [];
  const failed: string[] = [];

  console.log('📡 Publishing to multiple relays:', relayUrls);

  // Publish to each relay individually with better error handling
  const publishPromises = relayUrls.map(async (relayUrl) => {
    try {
      console.log('🔄 Publishing to:', relayUrl);

      // Test connection first
      const isConnected = await testRelayConnection(nostr, relayUrl);

      if (!isConnected) {
        console.warn('⚠️ Relay connection test failed, attempting publish anyway:', relayUrl);
      }

      // Try direct relay connection first
      try {
        const relay = nostr.relay(relayUrl);
        await relay.event(event, { signal: AbortSignal.timeout(15000) });
        console.log('✅ Event published successfully to:', relayUrl);
        successful.push(relayUrl);
        return;
      } catch (directError) {
        console.warn('⚠️ Direct connection failed, trying group approach:', relayUrl, directError);

        // Fallback to group approach
        try {
          const relayGroup = nostr.group([relayUrl]);
          await relayGroup.event(event, { signal: AbortSignal.timeout(20000) });
          console.log('✅ Event published via group approach to:', relayUrl);
          successful.push(relayUrl);
          return;
        } catch (groupError) {
          console.error('❌ Both direct and group approaches failed for:', relayUrl, groupError);
          failed.push(relayUrl);
          return;
        }
      }
    } catch (error) {
      console.error('❌ Failed to publish to:', relayUrl, error);
      failed.push(relayUrl);
    }
  });

  // Wait for all publish attempts to complete
  await Promise.allSettled(publishPromises);

  console.log('📊 Publishing results:', { successful, failed });
  return { successful, failed };
}

export function useNostrPublish(): UseMutationResult<NostrEvent, Error, { event: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>; options?: PublishOptions }> {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { presetRelays } = useAppContext();

  return useMutation({
    mutationFn: async ({ event, options }: { event: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>; options?: PublishOptions }) => {
      if (!user) {
        throw new Error("User is not logged in");
      }

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
        // Publish to specific relay only with enhanced error handling
        console.log('📡 Publishing to specific relay:', options.relayUrl);

        const { successful, failed } = await publishToMultipleRelays(nostr, signedEvent, [options.relayUrl]);

        if (successful.length === 0) {
          throw new Error(`Failed to publish to ${options.relayUrl} after multiple attempts`);
        }

        console.log('✅ Event published successfully to specific relay:', options.relayUrl);
      } else {
        // Publish to all relays (default behavior) - include preset relays explicitly
        console.log('📡 Publishing to all relays...');

        // Get all relay URLs to publish to
        const allRelayUrls = [
          ...new Set([
            // Always include the current selected relay
            'wss://relay.primal.net', // Default relay
            // Include all preset relays
            ...(presetRelays?.map(relay => relay.url) || []),
            // Ensure Mostr relay is included
            'wss://relay.mostr.pub',
            // Ensure Nostr.band is included
            'wss://relay.nostr.band',
            // Ensure Damus is included
            'wss://relay.damus.io',
            // Ensure Spookstr2 is included
            'wss://spookstr2.nostr1.com'
          ])
        ];

        console.log('📋 Target relays for publishing:', allRelayUrls);

        const { successful, failed } = await publishToMultipleRelays(nostr, signedEvent, allRelayUrls);

        if (successful.length === 0) {
          throw new Error('Failed to publish to any relay');
        }

        if (failed.length > 0) {
          console.warn('⚠️ Event published successfully but failed on some relays:', failed);
        }

        console.log(`✅ Event published successfully to ${successful.length} relays:`, successful);
      }

      return signedEvent;
    },
    onError: (error) => {
      console.error("❌ Failed to publish event:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    },
    onSuccess: (data) => {
      console.log("✅ Event published successfully:", data.id);
    },
  });
}