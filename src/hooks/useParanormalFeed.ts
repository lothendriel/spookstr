import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

const PARANORMAL_TAGS = [
  'paranormal',
  'haunted',
  'ghost',
  'ghosts',
  'paranormalactivity',
  'supernatural',
  'ghosthunting',
  'spirit',
  'spirits',
  'ghoststories',
  'paranormalinvestigation',
  'ghostadventures',
  'hauntedhouse',
  'hauntedplaces',
  'ghosthunter',
  'horror',
  'scary',
  'creepy',
  'spooky',
  'halloween',
  'mystery',
  'cryptids',
  'bigfoot',
  'sasquatch',
  'cryptid',
  'cryptozoology',
  'mothman',
  'yeti',
  'chupacabra',
  'wendigo',
  'skunkape',
  'yowie',
  'dogman',
  'beastofbrayroad',
  'jerseydevil',
  'urbanlegends',
  'mysteriouscreatures',
  'cryptidart',
  'cryptidcommunity',
  'cryptidsighting',
  'bigfootsighting',
  'sasquatchsighting',
  'bigfootisreal',
  'findingbigfoot',
  'bigfootart',
  'cryptic',
  'ufo',
  'ufos',
  'alien',
  'aliens',
  'extraterrestrial',
  'ufosighting',
  'ufosightings',
  'alienlife',
  'spaceship',
  'flyingsaucer',
  'disclosure',
  'abduction',
  'mufon',
  'greys',
  'anunnaki',
  'ufovideo',
  'ufocatcher',
  'cropcircles',
  'occult',
  'witchcraft',
  'witch',
  'wicca',
  'tarot',
  'tarotreading',
  'occultart',
  'darkart',
  'esoteric',
  'hermeticism',
  'ceremonialmagic',
  'occultism',
  'spirituality',
  'mysticism',
  'occultsymbols',
  'occultbooks',
  'shadowwork',
  'ritual',
  'grimoire',
  'magick'
];

// This function is no longer used but kept for reference
// The new implementation uses a more efficient timeout strategy with Promise.race()

export function useParanormalFeed() {
  const { nostr } = useNostr();
  const { config, presetRelays } = useAppContext();

  return useQuery({
    queryKey: ['paranormal-feed', config.relayUrl],
    queryFn: async (c) => {
      console.log('🔍 Loading paranormal feed from relay:', config.relayUrl);

      // Create a controller to handle cancellation properly
      const controller = new AbortController();

      // Listen for query cancellation
      c.signal.addEventListener('abort', () => {
        console.log('⚠️ Query cancelled by React Query');
        controller.abort();
      });

      try {
        // Always try to get content from the selected relay first
        console.log('🔄 Querying directly from selected relay:', config.relayUrl);
        const relay = nostr.relay(config.relayUrl);

        // Use a race between the query and a timeout
        const queryPromise = (async () => {
          // Try a simpler query first with fewer tags
          const primaryTags = ['paranormal', 'ghost', 'ufo', 'cryptid', 'supernatural', 'haunted'];
          const events = await relay.query([{
            kinds: [1],
            '#t': primaryTags,
            limit: 100, // Increased limit to get more results from fewer tags
          }], { signal: controller.signal });

          console.log('✅ Feed loaded successfully from:', config.relayUrl, 'Events:', events.length);
          return events;
        })();

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            controller.abort();
            reject(new Error('Query timeout after 15 seconds'));
          }, 15000); // 15 second timeout
        });

        const events = await Promise.race([queryPromise, timeoutPromise]);

        // If we got events from the selected relay, return them immediately
        if (events.length > 0) {
          return events;
        }

        // If no events found, try fallback relays
        console.log('⚠️ No events found from selected relay, trying fallbacks...');

        const fallbackRelays = presetRelays
          .filter(relay => relay.url !== config.relayUrl)
          .slice(0, 2); // Try up to 2 fallback relays

        for (const fallbackRelay of fallbackRelays) {
          if (c.signal.aborted) {
            console.log('⚠️ Query aborted, stopping fallback attempts');
            return [];
          }

          try {
            console.log('🔄 Trying fallback relay:', fallbackRelay.url);
            const fallbackRelayConnection = nostr.relay(fallbackRelay.url);
            const primaryTags = ['paranormal', 'ghost', 'ufo', 'cryptid', 'supernatural', 'haunted'];

            const fallbackEvents = await Promise.race([
              fallbackRelayConnection.query([{
                kinds: [1],
                '#t': primaryTags,
                limit: 100,
              }], { signal: controller.signal }),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Fallback timeout')), 10000)
              )
            ]);

            console.log('✅ Feed loaded successfully from fallback relay:', fallbackRelay.url, 'Events:', fallbackEvents.length);

            if (fallbackEvents.length > 0) {
              return fallbackEvents;
            }
          } catch (fallbackError) {
            console.warn('⚠️ Fallback relay failed:', fallbackRelay.url, fallbackError);
            continue;
          }
        }

        console.log('⚠️ No paranormal content found on any relay');
        return [];
      } catch (error) {
        console.error('❌ Failed to load paranormal feed:', error);

        // If the error is an abort error, just return empty array
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('⚠️ Query was aborted, returning empty feed');
          return [];
        }

        // For other errors, try one final fallback
        if (!c.signal.aborted) {
          try {
            console.log('🔄 Attempting final fallback to wss://relay.damus.io');
            const damusRelay = nostr.relay('wss://relay.damus.io');
            const primaryTags = ['paranormal', 'ghost', 'ufo', 'cryptid', 'supernatural', 'haunted'];

            const events = await Promise.race([
              damusRelay.query([{
                kinds: [1],
                '#t': primaryTags,
                limit: 100,
              }], { signal: AbortSignal.timeout(10000) }),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Final fallback timeout')), 10000)
              )
            ]);

            console.log('✅ Feed loaded from final fallback, Events:', events.length);
            return events;
          } catch (finalError) {
            console.error('❌ Final fallback also failed:', finalError);
          }
        }

        return []; // Return empty array instead of throwing to prevent UI errors
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    retry: 0, // Don't retry, we handle fallbacks internally
  });
}

export function useParanormalReplies(noteId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['paranormal-replies', noteId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      const events = await nostr.query([{
        kinds: [1],
        '#e': [noteId],
        limit: 100,
      }], { signal });

      return events;
    },
    enabled: !!noteId,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
}