import { useEffect, useRef } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { useNostr } from '@nostrify/react';
import { NostrEvent } from '@nostrify/nostrify';

const SPOOKSTR_RELAY = 'wss://spookstr2.nostr1.com';

/**
 * Hook that automatically syncs the logged-in user's profile metadata
 * to the Spookstr relay when they first log in.
 *
 * This ensures user profiles are always available on the Spookstr relay
 * even when using Spookstr-only mode.
 */
export function useSpookstrProfileSync() {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const syncedPubkeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.pubkey) {
      return;
    }

    // Check if we've already synced this pubkey
    const storageKey = `spookstr-synced-${user.pubkey}`;
    const alreadySynced = localStorage.getItem(storageKey);

    if (alreadySynced || syncedPubkeys.current.has(user.pubkey)) {
      if (import.meta.env.DEV) {
        console.log('Profile already synced to Spookstr relay (skipping)');
      }
      return;
    }

    if (import.meta.env.DEV) {
      console.log('Starting profile sync to Spookstr relay...');
    }

    // Mark as synced immediately to prevent duplicate attempts
    syncedPubkeys.current.add(user.pubkey);

    // Fetch the user's profile from any relay
    (async () => {
      try {
        if (import.meta.env.DEV) {
          console.log('Fetching profile from relays...');
        }
        const [profileEvent] = await nostr.query(
          [{ kinds: [0], authors: [user.pubkey], limit: 1 }],
          { signal: AbortSignal.timeout(5000) }
        );

        if (!profileEvent) {
          if (import.meta.env.DEV) {
            console.log('❌ No profile found to sync to Spookstr relay');
          }
          syncedPubkeys.current.delete(user.pubkey);
          return;
        }

        if (import.meta.env.DEV) {
          console.log('✅ Profile found, publishing to Spookstr relay...');
        }

        try {
          // Publish the profile event to the Spookstr relay
          const spookstrRelay = nostr.relay(SPOOKSTR_RELAY);

          // Create unsigned event template and sign it fresh
          const unsignedEvent = {
            kind: profileEvent.kind,
            content: profileEvent.content,
            tags: profileEvent.tags,
            created_at: Math.floor(Date.now() / 1000),
            pubkey: user.pubkey,
          };

          if (import.meta.env.DEV) {
            console.log('Signing event...', { unsignedEvent });
          }
          const signedEvent = await user.signer.signEvent(unsignedEvent);
          if (import.meta.env.DEV) {
            console.log('Event signed, publishing...', { eventId: signedEvent.id });
          }

          const result = await spookstrRelay.event(signedEvent);
          if (import.meta.env.DEV) {
            console.log('Publish result:', result);
          }

          // Mark as successfully synced
          localStorage.setItem(storageKey, Date.now().toString());
          if (import.meta.env.DEV) {
            console.log('✅ Successfully synced profile to Spookstr relay!');
          }
        } catch (publishError) {
          if (import.meta.env.DEV) {
            console.error('❌ Publish error details:', {
              error: publishError,
              type: typeof publishError,
              message: publishError instanceof Error ? publishError.message : String(publishError),
              stack: publishError instanceof Error ? publishError.stack : undefined,
            });
          }
          throw publishError; // Re-throw to be caught by outer catch
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('⚠️  Could not sync profile to Spookstr relay (this is non-critical):', {
            error,
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            relay: SPOOKSTR_RELAY,
            pubkey: user.pubkey,
            note: 'Profile syncing will be retried on next login. The app will continue to function normally.',
          });
        }
        // Remove from synced set so it can be retried on next login
        syncedPubkeys.current.delete(user.pubkey);
      }
    })();
  }, [user, nostr]);
}
