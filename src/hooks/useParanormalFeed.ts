import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { NostrEvent } from '@nostrify/nostrify';
import { filterNSFWContent } from '@/lib/nsfwFilter';
import { nip19 } from 'nostr-tools';

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

// Decode the npub to get the correct hex pubkey
const blockedNpub = 'npub1uhen8835huh3dhgrcck266ad3fxj02dhwmeh6eg3txp7yz2j64xs7nh4p0';
const decoded = nip19.decode(blockedNpub);
const blockedHexPubkey = decoded.data;

// List of blocked pubkeys (hex format) to filter out from the feed
const BLOCKED_PUBKEYS = [
  blockedHexPubkey, // npub1uhen8835huh3dhgrcck266ad3fxj02dhwmeh6eg3txp7yz2j64xs7nh4p0
];

/**
 * Filters out events from blocked users
 * @param events Array of Nostr events to filter
 * @returns Array of events that aren't from blocked users
 */
export function filterBlockedUsers(events: NostrEvent[]): NostrEvent[] {
  return events.filter(event => !BLOCKED_PUBKEYS.includes(event.pubkey));
}

export function useParanormalFeed() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['paranormal-feed'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Query for notes with paranormal tags
      const events = await nostr.query([{
        kinds: [1],
        '#t': PARANORMAL_TAGS,
        limit: 50,
      }], { signal });

      // Filter out NSFW content
      let filteredEvents = filterNSFWContent(events);

      // Filter out blocked users
      filteredEvents = filterBlockedUsers(filteredEvents);

      return filteredEvents;
    },
    refetchOnWindowFocus: false,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    retry: 1,
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

      // Filter out NSFW content from replies as well
      let filteredEvents = filterNSFWContent(events);

      // Filter out blocked users from replies
      filteredEvents = filterBlockedUsers(filteredEvents);

      return filteredEvents;
    },
    enabled: !!noteId,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
}