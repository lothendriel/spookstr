import { useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostr } from '@/hooks/useNostr';
import { useAppContext } from '@/hooks/useAppContext';

const SPOOKSTR_RELAY_URL = "wss://spookstr2.nostr1.com";

export function RelayComputer() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config, presetRelays = [], setComputedRelays } = useAppContext();

  // Effect to compute relays based on user profile and settings
  useEffect(() => {
    const computeRelays = async () => {
      if (config.useProfileRelays && user) {
        try {
          // Fetch user's profile (kind 0) event
          const events = await nostr.query([{ kinds: [0], authors: [user.pubkey] }], {
            signal: AbortSignal.timeout(3000)
          });

          if (events.length > 0) {
            try {
              const profile = JSON.parse(events[0].content);
              const profileRelays = Object.keys(profile.relays || {});

              // Combine profile relays with Spookstr relay and preset relays
              const allRelays = new Set([
                SPOOKSTR_RELAY_URL,
                ...profileRelays,
                ...(presetRelays?.map(r => r.url) || [])
              ]);

              setComputedRelays(Array.from(allRelays));
            } catch (parseError) {
              console.warn('Failed to parse profile relays, falling back to defaults:', parseError);
              fallbackToDefaults();
            }
          } else {
            fallbackToDefaults();
          }
        } catch (queryError) {
          console.warn('Failed to fetch user profile, falling back to defaults:', queryError);
          fallbackToDefaults();
        }
      } else {
        fallbackToDefaults();
      }
    };

    const fallbackToDefaults = () => {
      const defaultRelays = [
        SPOOKSTR_RELAY_URL,
        ...(presetRelays?.map(r => r.url) || [])
      ];
      setComputedRelays(defaultRelays);
    };

    computeRelays();
  }, [config.useProfileRelays, user, nostr, presetRelays, setComputedRelays]);

  // This component doesn't render anything, it just computes relays
  return null;
}