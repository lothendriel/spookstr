import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from './useCurrentUser';
import { useAppContext } from './useAppContext';
import { useUserRelays } from './useUserRelays';
import type { NostrEvent } from '@nostrify/nostrify';

const SPOOKSTR_RELAY = 'wss://spookstr2.nostr1.com';

/**
 * Hook for publishing events using the inbox model (NIP-65)
 * 
 * When publishing events with p-tags (mentions), this publishes to:
 * 1. Author's write relays
 * 2. Tagged users' read relays (their "inbox")
 * 3. Spookstr relay for community visibility
 * 
 * This ensures tagged users receive notifications on their preferred relays.
 */
export function useInboxPublish() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config, presetRelays = [] } = useAppContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventTemplate: Partial<NostrEvent>) => {
      if (!user) {
        throw new Error('User must be logged in to publish events');
      }

      // Build the relay list for publishing
      const relayUrls = new Set<string>();

      // 1. Always include Spookstr relay
      relayUrls.add(SPOOKSTR_RELAY);

      // 2. Add author's write relays
      if (config.relays && config.relays.length > 0) {
        const writeRelays = config.relays
          .filter(r => r.mode === 'write' || r.mode === 'both')
          .map(r => r.url);
        writeRelays.forEach(url => relayUrls.add(url));
      } else {
        relayUrls.add(config.relayUrl);
      }

      // 3. Extract tagged pubkeys from the event
      const taggedPubkeys = (eventTemplate.tags || [])
        .filter(([name]) => name === 'p')
        .map(([, pubkey]) => pubkey)
        .filter(Boolean);

      // 4. For each tagged user, fetch their relay list and add their READ relays
      if (taggedPubkeys.length > 0) {
        console.log('InboxPublish: Fetching inbox relays for tagged users:', taggedPubkeys);

        // Fetch relay lists in parallel with a timeout
        const relayListPromises = taggedPubkeys.map(async (pubkey) => {
          try {
            // Try to get from cache first
            const cachedData = queryClient.getQueryData<ReturnType<typeof useUserRelays>['data']>(
              ['user-relays', pubkey]
            );

            if (cachedData) {
              return cachedData;
            }

            // Fetch with timeout
            const signal = AbortSignal.timeout(3000);
            const events = await nostr.query(
              [{ kinds: [10002], authors: [pubkey], limit: 1 }],
              { signal }
            );

            if (events.length > 0) {
              const relayList = events[0].tags
                .filter(([name]) => name === 'r')
                .map(([, url, marker]) => ({
                  url,
                  mode: (marker === 'read' || marker === 'write' ? marker : 'both') as 'read' | 'write' | 'both',
                }));

              // Cache the result
              queryClient.setQueryData(['user-relays', pubkey], relayList);

              return relayList;
            }
          } catch (error) {
            console.warn(`InboxPublish: Failed to fetch relays for ${pubkey}:`, error);
          }
          return null;
        });

        const relayLists = await Promise.all(relayListPromises);

        // Add all read relays from tagged users
        for (const relayList of relayLists) {
          if (relayList && relayList.length > 0) {
            const readRelays = relayList
              .filter(r => r.mode === 'read' || r.mode === 'both')
              .map(r => r.url);
            readRelays.forEach(url => relayUrls.add(url));
          }
        }
      }

      // 5. Add a few preset relays for broader reach (max 8 total)
      for (const preset of presetRelays) {
        if (relayUrls.size >= 8) break;
        relayUrls.add(preset.url);
      }

      const finalRelays = Array.from(relayUrls);

      console.log('InboxPublish: Publishing to relays:', finalRelays);
      console.log('InboxPublish: Tagged users:', taggedPubkeys.length);

      // Add client tag
      const tags = [...(eventTemplate.tags || [])];
      if (!tags.some(([name]) => name === 'client')) {
        tags.push(['client', 'Spookstr', 'https://spookstr.com']);
      }

      // Sign and publish the event
      const eventToSign = {
        ...eventTemplate,
        tags,
        created_at: eventTemplate.created_at || Math.floor(Date.now() / 1000),
      };

      const signedEvent = await user.signer.signEvent(eventToSign);

      // Publish to all relays
      const relayGroup = nostr.group(finalRelays);
      await relayGroup.event(signedEvent);

      console.log('InboxPublish: Event published successfully');

      return signedEvent;
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['paranormal-feed'] });
      queryClient.invalidateQueries({ queryKey: ['user-posts'] });
    },
  });
}
