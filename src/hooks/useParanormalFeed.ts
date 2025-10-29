import { useMultiRelayQuery } from './useMultiRelayQuery';
import { useFastFeed } from './useOptimizedFeed';
import { NostrEvent } from '@nostrify/nostrify';
import { filterNSFWContent } from '@/lib/nsfwFilter';
import { nip19 } from 'nostr-tools';
import { useMemo } from 'react';

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

/**
 * Filters reposts to only include those with paranormal-related hashtags
 * @param events Array of Nostr events to filter
 * @returns Array of events with reposts filtered by paranormal tags
 */
export function filterRepostsByTags(events: NostrEvent[]): NostrEvent[] {
  return events.filter(event => {
    // Non-reposts pass through without filtering
    if (event.kind !== 6) {
      return true;
    }

    // For reposts, check if the reposted content has paranormal tags
    try {
      // Handle empty content gracefully
      if (!event.content || event.content.trim() === '') {
        console.log('[Paranormal Feed] Skipping repost with empty content');
        return false;
      }

      const repostedEvent = JSON.parse(event.content) as NostrEvent;

      // Validate the parsed event structure
      if (!repostedEvent || !repostedEvent.tags || !Array.isArray(repostedEvent.tags)) {
        console.log('[Paranormal Feed] Skipping repost with invalid event structure');
        return false;
      }

      // Check if any of the reposted event's tags match our paranormal tags
      const hasTags = repostedEvent.tags.some(([tagName, tagValue]) => {
        if (tagName === 't' && tagValue) {
          return PARANORMAL_TAGS.includes(tagValue.toLowerCase());
        }
        return false;
      });

      if (hasTags) {
        console.log('[Paranormal Feed] ✅ Repost contains paranormal tags');
      }

      return hasTags;
    } catch (e) {
      // Improved error handling with context
      console.log(`[Paranormal Feed] ⚠️ Skipping unparseable repost (content length: ${event.content?.length || 0}):`,
        event.content?.substring(0, 100) + (event.content?.length > 100 ? '...' : ''));
      return false;
    }
  });
}

export function useParanormalFeed() {
  console.log('[Paranormal Feed] Starting feed query with', PARANORMAL_TAGS.length, 'tags');

  // Use optimized fast feed for paranormal content - but fallback to multi-relay if needed
  const { data: fastEvents, isLoading: isLoadingFast, error: fastError } = useFastFeed({
    kinds: [1],
    filters: { '#t': PARANORMAL_TAGS },
    limit: 50,
  });

  // Use multi-relay query as primary method if fast feed fails or returns no results
  const shouldUseMultiRelay = !isLoadingFast && (!fastEvents || fastEvents.length === 0);

  const { data: discoveryEvents, isLoading: isLoadingDiscovery } = useMultiRelayQuery({
    filters: [
      {
        kinds: [1],
        '#t': PARANORMAL_TAGS,
        limit: 60, // Increased for better coverage
      },
      {
        kinds: [6], // Include reposts for broader content discovery
        limit: 30,
      }
    ],
    staleTime: 60000, // 1 minute
    retry: 2,
    enabled: shouldUseMultiRelay || !!fastError, // Use multi-relay as fallback
  });

  // Combine events from both sources, prefer fast events if available
  const events = useMemo(() => {
    let combined: typeof fastEvents = [];

    if (fastEvents && fastEvents.length > 0) {
      console.log(`[Paranormal Feed] Using ${fastEvents.length} events from fast feed`);
      combined = [...fastEvents];

      // Add discovery events for reposts
      if (discoveryEvents) {
        const reposts = discoveryEvents.filter(e => e.kind === 6);
        combined = [...combined, ...reposts];
        console.log(`[Paranormal Feed] Added ${reposts.length} reposts from discovery`);
      }
    } else if (discoveryEvents && discoveryEvents.length > 0) {
      console.log(`[Paranormal Feed] Fallback: Using ${discoveryEvents.length} events from multi-relay discovery`);
      combined = [...discoveryEvents];
    } else {
      console.log('[Paranormal Feed] No events from either source');
      return [];
    }

    // Deduplicate by ID
    const uniqueEvents = Array.from(
      new Map(combined.map(event => [event.id, event])).values()
    );

    console.log(`[Paranormal Feed] Final: ${uniqueEvents.length} unique events after deduplication`);
    return uniqueEvents;
  }, [fastEvents, discoveryEvents]);

  const isLoading = isLoadingFast || (shouldUseMultiRelay && isLoadingDiscovery);

  // Process the events with filters and sorting
  const processedEvents = useMemo(() => {
    if (!events) return [];

    console.log(`[Paranormal Feed] Processing ${events.length} events from multi-relay query`);

    // Deduplicate events by ID (multiple relays may return same event)
    const uniqueEvents = Array.from(
      new Map(events.map(event => [event.id, event])).values()
    );

    console.log(`[Paranormal Feed] ${uniqueEvents.length} unique events after deduplication`);

    // Filter out NSFW content
    let filteredEvents = filterNSFWContent(uniqueEvents);
    console.log(`[Paranormal Feed] ${filteredEvents.length} events after NSFW filter`);

    // Filter out blocked users
    filteredEvents = filterBlockedUsers(filteredEvents);
    console.log(`[Paranormal Feed] ${filteredEvents.length} events after blocking filter`);

    // Filter reposts to only include those with paranormal tags
    filteredEvents = filterRepostsByTags(filteredEvents);
    console.log(`[Paranormal Feed] ${filteredEvents.length} events after repost tag filter`);

    // Sort by created_at (newest first)
    filteredEvents.sort((a, b) => b.created_at - a.created_at);

    return filteredEvents;
  }, [events]);

  return {
    data: processedEvents,
    isLoading,
  };
}

export function useParanormalReplies(noteId: string) {
  // Enhanced: Use multi-relay query for comprehensive reply coverage
  const { data: events, isLoading } = useMultiRelayQuery({
    filters: noteId ? [{
      kinds: [1],
      '#e': [noteId],
      limit: 150, // Increased limit for multi-relay deduplication
    }] : [],
    enabled: !!noteId,
    staleTime: 30000,
    retry: 2,
  });

  // Process replies with filters
  const processedEvents = useMemo(() => {
    if (!events) return [];

    console.log(`[Paranormal Replies] Processing ${events.length} replies from multi-relay query`);

    // Deduplicate events by ID
    const uniqueEvents = Array.from(
      new Map(events.map(event => [event.id, event])).values()
    );

    console.log(`[Paranormal Replies] ${uniqueEvents.length} unique replies after deduplication`);

    // Filter out NSFW content from replies as well
    let filteredEvents = filterNSFWContent(uniqueEvents);

    // Filter out blocked users from replies
    filteredEvents = filterBlockedUsers(filteredEvents);

    console.log(`[Paranormal Replies] ${filteredEvents.length} replies after filtering`);

    return filteredEvents;
  }, [events]);

  return {
    data: processedEvents,
    isLoading,
  };
}