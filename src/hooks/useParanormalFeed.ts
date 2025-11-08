import { useMemo } from 'react';
import { useNostr } from '@nostrify/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { NostrEvent } from '@nostrify/nostrify';
import { filterNSFWContent } from '@/lib/nsfwFilter';
import { nip19 } from 'nostr-tools';
import {
  shouldAppearInMainFeed,
  getContentType,
  filterForMainFeed
} from '@/lib/contentType';
import { useHiddenUsers } from '@/hooks/useHiddenUsers';
import { useHiddenHashtags } from '@/hooks/useHiddenHashtags';
import { usePersonalizedHashtags } from '@/hooks/usePersonalizedHashtags';

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
  const { hiddenPubkeys } = useHiddenUsers();
  const { hasHiddenHashtag } = useHiddenHashtags();
  const { personalizedHashtags } = usePersonalizedHashtags();

  // Cache filter function creation to avoid recreating on every render
  const filterFunctions = useMemo(() => {
    const BLOCKED_PUBKEYS = getBlockedPubkeys();
    const blockedSet = new Set(BLOCKED_PUBKEYS);
    const hiddenSet = new Set(hiddenPubkeys);

    const filterBlockedUsersCached = (events: NostrEvent[]) => {
      return events.filter(event => {
        // Filter by blocked/hidden users
        if (blockedSet.has(event.pubkey) || hiddenSet.has(event.pubkey)) {
          return false;
        }
        // Filter by hidden hashtags
        if (hasHiddenHashtag(event.tags)) {
          return false;
        }
        return true;
      });
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
  }, [hiddenPubkeys, hasHiddenHashtag]);

  return useInfiniteQuery({
    queryKey: ['paranormal-feed-infinite', hiddenPubkeys, hasHiddenHashtag, personalizedHashtags],
    queryFn: async ({ pageParam, signal: querySignal }) => {
      console.log('[ParanormalFeed] 🔮 Infinite query function called', {
        pageParam: pageParam ? new Date(pageParam * 1000).toISOString() : 'initial',
        personalizedHashtags: personalizedHashtags.length
      });

      const PARANORMAL_TAGS = getParanormalTags();
      const signal = AbortSignal.any([querySignal, AbortSignal.timeout(8000)]);

      // Combine paranormal tags with personalized hashtags
      const allTags = [...PARANORMAL_TAGS];
      if (personalizedHashtags.length > 0) {
        allTags.push(...personalizedHashtags);
      }

      // Build queries based on whether we have personalized hashtags
      const queries = [];

      // Always query for paranormal content
      const paranormalQuery: any = {
        kinds: [1],
        '#t': PARANORMAL_TAGS,
        limit: 30, // Reduced limit for infinite scroll
      };

      // Add personalized hashtag query if any exist
      if (personalizedHashtags.length > 0) {
        queries.push({
          kinds: [1],
          '#t': personalizedHashtags,
          limit: 20,
        });
      }

      // Always include reposts
      queries.push({
        kinds: [6], // Include reposts
        limit: 15, // Reduced limit for infinite scroll
      });

      // Add pagination parameter for the main query
      if (pageParam) {
        paranormalQuery.until = pageParam;
      }

      queries.unshift(paranormalQuery); // Main query first

      const events = await nostr.query(queries, { signal });

      console.log('[ParanormalFeed] 🔮 Raw events received:', events.length);

      // Filter out replies and community content to prevent cross-contamination
      let filteredEvents = filterForMainFeed(events);

      // Filter out NSFW content
      filteredEvents = filterNSFWContent(filteredEvents);

      // Filter out blocked users
      filteredEvents = filterFunctions.filterBlockedUsersCached(filteredEvents);

      // Filter reposts to only include those with paranormal tags
      filteredEvents = filterFunctions.filterRepostsByTagsCached(filteredEvents);

      // Sort by created_at (newest first)
      filteredEvents.sort((a, b) => b.created_at - a.created_at);

      console.log('[ParanormalFeed] 🔮 Filtered events returned:', filteredEvents.length);

      return filteredEvents;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined;
      // Return the timestamp of the oldest event for pagination
      const oldestTimestamp = lastPage[lastPage.length - 1].created_at;
      console.log('[ParanormalFeed] 🔮 Next page param:', oldestTimestamp, new Date(oldestTimestamp * 1000).toISOString());
      return oldestTimestamp - 1; // Subtract 1 to avoid duplicates
    },
    refetchOnWindowFocus: false,
    staleTime: 120000, // 2 minutes
    gcTime: 300000, // 5 minutes
    retry: 2,
    // Enhanced caching: Background refetch when tab is active
    refetchInterval: (data, query) => {
      if (document.hidden || !data) return false;
      return 600000; // 10 minutes
    },
    // Refetch when the tab becomes visible if data is older than 2 minutes
    refetchOnWindowFocus: (query) => {
      if (!query.state.data) return true;
      const lastUpdated = query.state.dataUpdatedAt;
      const twoMinutesAgo = Date.now() - 120000;
      return lastUpdated < twoMinutesAgo;
    },
    onSuccess: (data) => {
      const totalEvents = data.pages.reduce((sum, page) => sum + page.length, 0);
      console.log('[ParanormalFeed] ✅ Infinite query success, total events:', totalEvents, 'pages:', data.pages.length);
    },
    onError: (error) => {
      console.error('[ParanormalFeed] ❌ Infinite query error:', error);
    }
  });
}

export function useParanormalReplies(noteId: string) {
  const { nostr } = useNostr();
  const { hiddenPubkeys } = useHiddenUsers();
  const { hasHiddenHashtag } = useHiddenHashtags();

  // Cache filter function for replies to avoid recreating on every render
  const filterBlockedUsersForReplies = useMemo(() => {
    const BLOCKED_PUBKEYS = getBlockedPubkeys();
    const blockedSet = new Set(BLOCKED_PUBKEYS);
    const hiddenSet = new Set(hiddenPubkeys);

    return (events: NostrEvent[]) => {
      return events.filter(event => {
        // Filter by blocked/hidden users
        if (blockedSet.has(event.pubkey) || hiddenSet.has(event.pubkey)) {
          return false;
        }
        // Filter by hidden hashtags
        if (hasHiddenHashtag(event.tags)) {
          return false;
        }
        return true;
      });
    };
  }, [hiddenPubkeys, hasHiddenHashtag]);

  return useQuery({
    queryKey: ['paranormal-replies', noteId, hiddenPubkeys, hasHiddenHashtag],
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