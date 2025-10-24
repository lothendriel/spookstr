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

// Test relay connectivity
async function testRelayConnection(nostr: any, relayUrl: string): Promise<boolean> {
  try {
    console.log('🔍 Testing relay connection for feed:', relayUrl);
    const relay = nostr.relay(relayUrl);

    // Try a simple query to test connectivity
    const testFilters = [{ kinds: [1], limit: 1 }];
    await relay.query(testFilters, { signal: AbortSignal.timeout(5000) });

    console.log('✅ Relay connection test successful for feed:', relayUrl);
    return true;
  } catch (error) {
    console.warn('⚠️ Relay connection test failed for feed:', relayUrl, error);
    return false;
  }
}

export function useParanormalFeed() {
  const { nostr } = useNostr();
  const { config, presetRelays } = useAppContext();

  return useQuery({
    queryKey: ['paranormal-feed', config.relayUrl],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]); // Increased timeout to 10 seconds

      console.log('🔍 Loading paranormal feed from relay:', config.relayUrl);

      try {
        // Always try to get content from the selected relay first, without connection test
        // This ensures we get the actual content from the selected relay
        console.log('🔄 Querying directly from selected relay:', config.relayUrl);
        const relay = nostr.relay(config.relayUrl);

        const events = await relay.query([{
          kinds: [1],
          '#t': PARANORMAL_TAGS,
          limit: 50,
        }], { signal });

        console.log('✅ Feed loaded successfully from:', config.relayUrl, 'Events:', events.length);

        // If we got events from the selected relay, return them immediately
        if (events.length > 0) {
          return events;
        }

        // If no events from selected relay, test connection and try fallbacks
        console.log('⚠️ No events found from selected relay, testing connection...');
        const isConnected = await testRelayConnection(nostr, config.relayUrl);

        if (!isConnected) {
          console.warn('⚠️ Selected relay not responding, trying fallback relays...');

          // Try fallback relays
          const fallbackRelays = presetRelays
            .filter(relay => relay.url !== config.relayUrl)
            .slice(0, 3); // Try up to 3 fallback relays

          for (const fallbackRelay of fallbackRelays) {
            console.log('🔄 Trying fallback relay:', fallbackRelay.url);
            const fallbackConnected = await testRelayConnection(nostr, fallbackRelay.url);

            if (fallbackConnected) {
              console.log('✅ Fallback relay connected, querying from:', fallbackRelay.url);
              const fallbackRelayConnection = nostr.relay(fallbackRelay.url);
              const fallbackEvents = await fallbackRelayConnection.query([{
                kinds: [1],
                '#t': PARANORMAL_TAGS,
                limit: 50,
              }], { signal });

              console.log('✅ Feed loaded successfully from fallback relay:', fallbackRelay.url, 'Events:', fallbackEvents.length);
              return fallbackEvents;
            }
          }

          console.warn('⚠️ No fallback relays responded, returning empty feed');
          return [];
        }

        // If connected but no events, return empty array
        console.log('✅ Connected to relay but no paranormal content found:', config.relayUrl);
        return [];
      } catch (error) {
        console.error('❌ Failed to load paranormal feed from selected relay:', error);

        // Try fallback relays only if the selected relay completely fails
        console.warn('⚠️ Selected relay failed, trying fallback relays...');

        const fallbackRelays = presetRelays
          .filter(relay => relay.url !== config.relayUrl)
          .slice(0, 3);

        for (const fallbackRelay of fallbackRelays) {
          try {
            console.log('🔄 Trying fallback relay:', fallbackRelay.url);
            const fallbackRelayConnection = nostr.relay(fallbackRelay.url);
            const fallbackEvents = await fallbackRelayConnection.query([{
              kinds: [1],
              '#t': PARANORMAL_TAGS,
              limit: 50,
            }], { signal: AbortSignal.timeout(8000) });

            console.log('✅ Feed loaded successfully from fallback relay:', fallbackRelay.url, 'Events:', fallbackEvents.length);
            return fallbackEvents;
          } catch (fallbackError) {
            console.warn('⚠️ Fallback relay also failed:', fallbackRelay.url, fallbackError);
            continue;
          }
        }

        console.error('❌ All relays failed, returning empty feed');
        return []; // Return empty array instead of throwing to prevent UI errors
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 60000, // Increased to 1 minute
    retry: 1, // Reduce retry to avoid confusion with fallback logic
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