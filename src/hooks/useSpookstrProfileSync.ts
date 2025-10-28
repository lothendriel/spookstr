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
    if (!user?.pubkey) return;
    
    // Check if we've already synced this pubkey
    const storageKey = `spookstr-synced-${user.pubkey}`;
    const alreadySynced = localStorage.getItem(storageKey);
    
    if (alreadySynced || syncedPubkeys.current.has(user.pubkey)) {
      return;
    }
    
    // Mark as synced immediately to prevent duplicate attempts
    syncedPubkeys.current.add(user.pubkey);
    
    // Fetch the user's profile from any relay
    (async () => {
      try {
        const [profileEvent] = await nostr.query(
          [{ kinds: [0], authors: [user.pubkey], limit: 1 }],
          { signal: AbortSignal.timeout(5000) }
        );
        
        if (!profileEvent) {
          console.log('No profile found to sync to Spookstr relay');
          return;
        }
        
        // Publish the profile event to the Spookstr relay
        const spookstrRelay = nostr.relay(SPOOKSTR_RELAY);
        
        // Re-sign the event with the user's current timestamp to make it fresh
        const freshEvent: NostrEvent = {
          ...profileEvent,
          created_at: Math.floor(Date.now() / 1000),
        };
        
        await user.signer.signEvent(freshEvent);
        await spookstrRelay.event(freshEvent);
        
        // Mark as successfully synced
        localStorage.setItem(storageKey, Date.now().toString());
        console.log('Successfully synced profile to Spookstr relay');
      } catch (error) {
        console.error('Failed to sync profile to Spookstr relay:', error);
        // Remove from synced set so it can be retried
        syncedPubkeys.current.delete(user.pubkey);
      }
    })();
  }, [user, nostr]);
}
