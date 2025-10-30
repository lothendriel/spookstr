import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { NostrEvent } from '@nostrify/nostrify';
import { filterNSFWContent } from '@/lib/nsfwFilter';
import { nip19 } from 'nostr-tools';
import { feedLogger, perfLogger } from '@/lib/devLogger';
import {
  shouldAppearInMainFeed,
  getContentType,
  filterForMainFeed
} from '@/lib/contentType';

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
  const { nostr } = useNostr();

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

  return useQuery({
    queryKey: ['paranormal-feed'],
    queryFn: async (c) => {
      return await perfLogger.timeAsync('Feed Query', async () => {
        const PARANORMAL_TAGS = getParanormalTags();
        feedLogger.info('Starting paranormal feed query', { tagCount: PARANORMAL_TAGS.length });

        const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

        // Query for notes with paranormal tags AND reposts of paranormal content
        const events = await nostr.query([
          {
            kinds: [1],
            '#t': PARANORMAL_TAGS,
            limit: 50,
          },
          {
            kinds: [6], // Include reposts
            limit: 20,
          }
        ], { signal });

        feedLogger.info('Raw events fetched', { count: events.length });

        // CRITICAL: Filter out replies and community content to prevent cross-contamination
        let filteredEvents = filterForMainFeed(events);

        // Log excluded events for debugging
        const excludedEvents = events.filter(event => !shouldAppearInMainFeed(event));
        if (excludedEvents.length > 0) {
          feedLogger.debug('Events excluded from main feed', {
            count: excludedEvents.length,
            types: excludedEvents.map(e => getContentType(e))
          });
        }

        feedLogger.debug('After reply/community filter', {
          count: filteredEvents.length,
          filtered: events.length - filteredEvents.length
        });

        // Filter out NSFW content
        filteredEvents = filterNSFWContent(filteredEvents);
        feedLogger.debug('After NSFW filter', { count: filteredEvents.length, filtered: events.length - filteredEvents.length });

        // Filter out blocked users
        filteredEvents = filterFunctions.filterBlockedUsersCached(filteredEvents);
        feedLogger.debug('After blocked users filter', { count: filteredEvents.length });

        // Filter reposts to only include those with paranormal tags
        filteredEvents = filterFunctions.filterRepostsByTagsCached(filteredEvents);
        feedLogger.debug('After repost tag filter', { count: filteredEvents.length });

        // Sort by created_at (newest first)
        filteredEvents.sort((a, b) => b.created_at - a.created_at);

        feedLogger.info('Feed query completed', {
          finalCount: filteredEvents.length,
          kinds: filteredEvents.reduce((acc, e) => {
            acc[e.kind] = (acc[e.kind] || 0) + 1;
            return acc;
          }, {} as Record<number, number>)
        });

        return filteredEvents;
      });
    },
    refetchOnWindowFocus: false,
    staleTime: 60000, // 1 minute - consider data fresh for this period
    gcTime: 300000, // 5 minutes - reduced from 10 minutes to save memory
    retry: 1,
    // Enhanced caching: Background refetch every 5 minutes when tab is active
    refetchInterval: (data, query) => {
      // Only refetch if the tab is visible and we have existing data
      if (document.hidden || !data) return false;

      // Refetch every 5 minutes for active users
      return 300000; // 5 minutes
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
  const { nostr } = useNostr();

  // Cache filter function for replies to avoid recreating on every render
  const filterBlockedUsersForReplies = useMemo(() => {
    const BLOCKED_PUBKEYS = getBlockedPubkeys();
    const blockedSet = new Set(BLOCKED_PUBKEYS);

    return (events: NostrEvent[]) => {
      return events.filter(event => !blockedSet.has(event.pubkey));
    };
  }, []);

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
      filteredEvents = filterBlockedUsersForReplies(filteredEvents);

      return filteredEvents;
    },
    enabled: !!noteId,
    refetchOnWindowFocus: false,
    staleTime: 60000, // 1 minute - replies don't change as frequently as main feed
    gcTime: 300000, // 5 minutes - keep replies cached for reasonable time
    // Enhanced caching: Background refetch for active conversations
    refetchInterval: (data, query) => {
      // Only refetch if tab is visible and we have data
      if (document.hidden || !data || !noteId) return false;

      // Refetch every 2 minutes for active conversation threads
      return 120000; // 2 minutes
    },
  });
}