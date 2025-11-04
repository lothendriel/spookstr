import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NostrEvent } from '@nostrify/nostrify';
import { filterNSFWContent } from '@/lib/nsfwFilter';
import { nip19 } from 'nostr-tools';
import {
  shouldAppearInMainFeed,
  getContentType,
  filterForMainFeed
} from '@/lib/contentType';
import { useMultiRelayQuery } from './useMultiRelayQuery';

// Move large constant arrays to functions to prevent permanent memory retention
const getParanormalTags = () => [
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

const getBlockedPubkeys = () => {
  // Decode the npub to get the correct hex pubkey
  const blockedNpub = 'npub1uhen8835huh3dhgrcck266ad3fxj02dhwmeh6eg3txp7yz2j64xs7nh4p0';
  const decoded = nip19.decode(blockedNpub);
  const blockedHexPubkey = decoded.data;

  // List of blocked pubkeys (hex format) to filter out from the feed
  return [
    blockedHexPubkey, // npub1uhen8835huh3dhgrcck266ad3fxj02dhwmeh6eg3txp7yz2j64xs7nh4p0
  ];
};

/**
 * Filters out events from blocked users
 * @param events Array of Nostr events to filter
 * @returns Array of events that aren't from blocked users
 */
export function filterBlockedUsers(events: NostrEvent[]): NostrEvent[] {
  const BLOCKED_PUBKEYS = getBlockedPubkeys();
  return events.filter(event => !BLOCKED_PUBKEYS.includes(event.pubkey));
}

/**
 * Filters reposts to only include those with paranormal-related hashtags
 * @param events Array of Nostr events to filter
 * @returns Array of events with reposts filtered by paranormal tags
 */
export function filterRepostsByTags(events: NostrEvent[]): NostrEvent[] {
  const PARANORMAL_TAGS = getParanormalTags();
  const paranormalTagsSet = new Set(PARANORMAL_TAGS);

  return events.filter(event => {
    // Non-reposts pass through without filtering
    if (event.kind !== 6) {
      return true;
    }

    // For reposts, check if the reposted content has paranormal tags
    try {
      const repostedEvent = JSON.parse(event.content) as NostrEvent;

      // Check if any of the reposted event's tags match our paranormal tags
      const hasTags = repostedEvent.tags.some(([tagName, tagValue]) => {
        if (tagName === 't' && tagValue) {
          return paranormalTagsSet.has(tagValue.toLowerCase());
        }
        return false;
      });

      return hasTags;
    } catch (e) {
      // If we can't parse the repost, exclude it
      console.warn('Failed to parse repost content:', e);
      return false;
    }
  });
}



export function useParanormalFeed() {
  // Cache filter function creation to avoid recreating on every render
  const filterFunctions = useMemo(() => {
    const BLOCKED_PUBKEYS = getBlockedPubkeys();
    const blockedSet = new Set(BLOCKED_PUBKEYS);

    const filterBlockedUsersCached = (events: NostrEvent[]) => {
      return events.filter(event => !blockedSet.has(event.pubkey));
    };

    const PARANORMAL_TAGS = getParanormalTags();
    const paranormalTagsSet = new Set(PARANORMAL_TAGS);

    const filterRepostsByTagsCached = (events: NostrEvent[]) => {
      return events.filter(event => {
        // Non-reposts pass through without filtering
        if (event.kind !== 6) {
          return true;
        }

        // For reposts, check if the reposted content has paranormal tags
        try {
          const repostedEvent = JSON.parse(event.content) as NostrEvent;

          // Check if any of the reposted event's tags match our paranormal tags
          const hasTags = repostedEvent.tags.some(([tagName, tagValue]) => {
            if (tagName === 't' && tagValue) {
              return paranormalTagsSet.has(tagValue.toLowerCase());
            }
            return false;
          });

          return hasTags;
        } catch (e) {
          // If we can't parse the repost, exclude it
          console.warn('Failed to parse repost content:', e);
          return false;
        }
      });
    };

    return { filterBlockedUsersCached, filterRepostsByTagsCached };
  }, []);

  // Get the raw events from multiple relays
  const { data: rawEvents, isLoading: isRawLoading, error: rawError } = useMultiRelayQuery({
    filters: [
      {
        kinds: [1],
        '#t': getParanormalTags(),
        limit: 50,
      },
      {
        kinds: [6], // Include reposts
        limit: 20,
      }
    ],
    // Use specific high-performance relays for better coverage
    relayUrls: [
      'wss://spookstr2.nostr1.com',
      'wss://relay.nostr.band',
      'wss://relay.damus.io',
      'wss://relay.primal.net',
      'wss://relay.mostr.pub'
    ],
    enabled: true,
    staleTime: 120000, // 2 minutes
    gcTime: 180000, // 3 minutes
    retry: 2,
  });

  // Process and filter the events
  return useQuery({
    queryKey: ['paranormal-feed', 'processed'],
    queryFn: () => {
      if (!rawEvents) {
        console.log('[Paranormal Feed] No raw events to process');
        return [];
      }

      console.log('[Paranormal Feed] Processing', rawEvents.length, 'raw events');

      // Filter out replies and community content to prevent cross-contamination
      let filteredEvents = filterForMainFeed(rawEvents);
      console.log('[Paranormal Feed] After main feed filter:', filteredEvents.length, 'events');

      // Filter out NSFW content
      filteredEvents = filterNSFWContent(filteredEvents);
      console.log('[Paranormal Feed] After NSFW filter:', filteredEvents.length, 'events');

      // Filter out blocked users
      filteredEvents = filterFunctions.filterBlockedUsersCached(filteredEvents);
      console.log('[Paranormal Feed] After blocked users filter:', filteredEvents.length, 'events');

      // Filter reposts to only include those with paranormal tags
      filteredEvents = filterFunctions.filterRepostsByTagsCached(filteredEvents);
      console.log('[Paranormal Feed] After reposts filter:', filteredEvents.length, 'events');

      // Sort by created_at (newest first)
      filteredEvents.sort((a, b) => b.created_at - a.created_at);

      console.log('[Paranormal Feed] Final filtered events:', filteredEvents.length);
      return filteredEvents;
    },
    enabled: !!rawEvents,
    refetchOnWindowFocus: false,
    staleTime: 120000, // 2 minutes - increased to reduce refetches
    gcTime: 180000, // 3 minutes - aggressively clean up unused data
    retry: 1,
    // Enhanced caching: Background refetch every 10 minutes when tab is active
    refetchInterval: (data, query) => {
      // Only refetch if the tab is visible and we have existing data
      if (document.hidden || !data) return false;

      // Refetch every 10 minutes for active users - reduced frequency
      return 600000; // 10 minutes
    },
    // Refetch when the tab becomes visible if data is older than 2 minutes
    refetchOnWindowFocus: (query) => {
      if (!query.state.data) return true;
      const lastUpdated = query.state.dataUpdatedAt;
      const twoMinutesAgo = Date.now() - 120000;
      return lastUpdated < twoMinutesAgo;
    },
  });
}

export function useParanormalReplies(noteId: string) {
  // Cache filter function for replies to avoid recreating on every render
  const filterBlockedUsersForReplies = useMemo(() => {
    const BLOCKED_PUBKEYS = getBlockedPubkeys();
    const blockedSet = new Set(BLOCKED_PUBKEYS);

    return (events: NostrEvent[]) => {
      return events.filter(event => !blockedSet.has(event.pubkey));
    };
  }, []);

  // Get raw replies from multiple relays
  const { data: rawReplies, isLoading: isRawRepliesLoading } = useMultiRelayQuery({
    filters: [{
      kinds: [1],
      '#e': [noteId],
      limit: 100,
    }],
    // Use same high-performance relays for replies
    relayUrls: [
      'wss://spookstr2.nostr1.com',
      'wss://relay.nostr.band',
      'wss://relay.damus.io',
      'wss://relay.primal.net'
    ],
    enabled: !!noteId,
    staleTime: 180000, // 3 minutes
    gcTime: 180000, // 3 minutes
    retry: 2,
  });

  // Process and filter the replies
  return useQuery({
    queryKey: ['paranormal-replies', 'processed', noteId],
    queryFn: () => {
      if (!rawReplies) {
        console.log('[Paranormal Replies] No raw replies to process for note:', noteId?.slice(0, 8));
        return [];
      }

      console.log('[Paranormal Replies] Processing', rawReplies.length, 'raw replies for note:', noteId?.slice(0, 8));

      // Filter out NSFW content from replies as well
      let filteredEvents = filterNSFWContent(rawReplies);
      console.log('[Paranormal Replies] After NSFW filter:', filteredEvents.length, 'replies');

      // Filter out blocked users from replies
      filteredEvents = filterBlockedUsersForReplies(filteredEvents);
      console.log('[Paranormal Replies] After blocked users filter:', filteredEvents.length, 'replies');

      return filteredEvents;
    },
    enabled: !!rawReplies && !!noteId,
    staleTime: 180000, // 3 minutes - replies don't change as frequently as main feed
    gcTime: 180000, // 3 minutes - aggressively clean up reply data
    // Enhanced caching: Background refetch for active conversations
    refetchInterval: (data, query) => {
      // Only refetch if tab is visible and we have data
      if (document.hidden || !data || !noteId) return false;

      // Refetch every 5 minutes for active conversation threads - reduced frequency
      return 300000; // 5 minutes
    },
  });
}