import { useNostr } from '@/hooks/useNostr';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { nip19 } from 'nostr-tools';
import { useMemo } from 'react';
import type { NostrEvent } from '@nostrify/nostrify';

interface BadgeDefinition {
  identifier: string;
  name?: string;
  description?: string;
  image?: string;
  thumbs?: string[];
  pubkey: string;
}

interface BadgeAward {
  id: string;
  badgeDefinition: string; // '30009:pubkey:identifier'
  awardedTo: string;
  awardedBy: string;
}

interface ProfileBadge {
  badgeDefinition: string; // '30009:pubkey:identifier'
  badgeAward: string; // event id
}

/**
 * Hook to fetch badge definitions for a specific identifier
 */
export function useBadgeDefinition(identifier: string, pubkey?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['badge-definition', identifier, pubkey],
    queryFn: async ({ signal }) => {
      const filter = pubkey
        ? { kinds: [30009], authors: [pubkey], '#d': [identifier] }
        : { kinds: [30009], '#d': [identifier] };

      const events = await nostr.query([filter], { signal });

      if (events.length === 0) return null;

      const event = events[0];
      return {
        identifier,
        name: event.tags.find(([name]) => name === 'name')?.[1],
        description: event.tags.find(([name]) => name === 'description')?.[1],
        image: event.tags.find(([name]) => name === 'image')?.[1],
        thumbs: event.tags.filter(([name]) => name === 'thumb').map(([_, url]) => url),
        pubkey: event.pubkey,
      } as BadgeDefinition;
    },
    enabled: !!identifier,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to fetch badge awards for a specific pubkey
 */
export function useBadgeAwards(pubkey: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['badge-awards', pubkey],
    queryFn: async ({ signal }) => {
      console.log('🎯 Fetching badge awards for:', pubkey);

      const timeoutSignal = AbortSignal.timeout(10000); // 10 second timeout
      const combinedSignal = AbortSignal.any([signal, timeoutSignal]);

      const events = await nostr.query([{ kinds: [8], '#p': [pubkey] }], { signal: combinedSignal });

      console.log('📋 Badge award events found:', events.length);

      const awards = events.map(event => ({
        id: event.id,
        badgeDefinition: event.tags.find(([name]) => name === 'a')?.[1] || '',
        awardedTo: pubkey,
        awardedBy: event.pubkey,
      })) as BadgeAward[];

      console.log('🏅 Badge awards:', awards);
      return awards;
    },
    enabled: !!pubkey,
    staleTime: 300000, // 5 minutes
    gcTime: 300000,
    retry: 2,
  });
}

/**
 * Hook to fetch profile badges (badges user chooses to display)
 */
export function useProfileBadges(pubkey: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['profile-badges', pubkey],
    queryFn: async ({ signal }) => {
      console.log('🔍 Fetching profile badges for:', pubkey);

      const timeoutSignal = AbortSignal.timeout(10000); // 10 second timeout
      const combinedSignal = AbortSignal.any([signal, timeoutSignal]);

      const events = await nostr.query([
        { kinds: [30008], authors: [pubkey], '#d': ['profile_badges'] }
      ], { signal: combinedSignal });

      console.log('📋 Profile badge events found:', events.length);

      if (events.length === 0) {
        console.log('❌ No profile badge events found for user');
        return [];
      }

      const event = events[0];
      const profileBadges: ProfileBadge[] = [];

      // Parse ordered pairs of 'a' and 'e' tags
      const tags = event.tags;
      console.log('🏷️ Event tags:', tags);
      console.log('🏷️ First 5 tags:', tags.slice(0, 5));

      // Count tag types
      const aTags = tags.filter(([name]) => name === 'a');
      const eTags = tags.filter(([name]) => name === 'e');
      console.log('📊 Tag counts:', { aTags: aTags.length, eTags: eTags.length });

      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        console.log(`🔍 Tag ${i}:`, tag);

        if (tag[0] === 'a') {
          console.log(`  Found 'a' tag at index ${i}:`, tag[1]);
          if (i + 1 < tags.length) {
            const nextTag = tags[i + 1];
            console.log(`  Next tag at index ${i + 1}:`, nextTag);

            if (nextTag[0] === 'e') {
              profileBadges.push({
                badgeDefinition: tag[1],
                badgeAward: nextTag[1],
              });
              i++; // Skip the next tag as we've processed it
              console.log('✅ Found profile badge:', { badgeDefinition: tag[1], badgeAward: nextTag[1] });
            } else {
              console.log(`❌ Next tag is not 'e', it's '${nextTag[0]}'`);
            }
          }
        }
      }

      console.log('🏆 Final profile badges:', profileBadges);
      return profileBadges;
    },
    enabled: !!pubkey,
    staleTime: 300000, // 5 minutes
    gcTime: 300000, // Keep in cache for 5 minutes
    retry: 2,
  });
}

/**
 * Hook to get complete badge information for a user's profile
 */
export function useUserBadges(pubkey: string) {
  console.log('🎪 useUserBadges called with pubkey:', pubkey?.slice(0, 8) + '...');
  const { nostr } = useNostr();
  const { data: profileBadges = [], isLoading: isLoadingProfileBadges } = useProfileBadges(pubkey);
  const { data: badgeAwards = [], isLoading: isLoadingBadgeAwards } = useBadgeAwards(pubkey);

  // Fetch badge definitions for each profile badge
  const badgeDefinitions = useQuery({
    queryKey: ['badge-definitions', profileBadges],
    queryFn: async ({ signal }) => {
      const definitions: BadgeDefinition[] = [];

      console.log('🔍 Fetching badge definitions for:', profileBadges.length, 'profile badges');

      for (const profileBadge of profileBadges) {
        console.log('🏷️ Processing profile badge:', profileBadge);

        const [kind, pubkey, identifier] = profileBadge.badgeDefinition.split(':');
        console.log('📝 Parsed parts:', { kind, pubkey, identifier });

        if (kind === '30009' && pubkey && identifier) {
          const filter = { kinds: [30009], authors: [pubkey], '#d': [identifier] };
          console.log('🔎 Querying for badge definition:', filter);

          try {
            const events = await nostr.query([filter], { signal });
            console.log('📋 Found badge definition events:', events.length);

            if (events.length > 0) {
              const event = events[0];
              const definition = {
                identifier,
                name: event.tags.find(([name]) => name === 'name')?.[1] || identifier,
                description: event.tags.find(([name]) => name === 'description')?.[1] || '',
                image: event.tags.find(([name]) => name === 'image')?.[1],
                thumbs: event.tags.filter(([name]) => name === 'thumb').map(([_, url]) => url),
                pubkey: event.pubkey,
              };
              console.log('✅ Badge definition:', definition);
              definitions.push(definition);
            } else {
              console.log('❌ No badge definition found for:', profileBadge.badgeDefinition);
              // Create a fallback definition
              definitions.push({
                identifier,
                name: identifier,
                description: '',
                image: '',
                thumbs: [],
                pubkey
              });
            }
          } catch (error) {
            console.log('❌ Error fetching badge definition:', error);
            // Create a fallback definition
            definitions.push({
              identifier,
              name: identifier,
              description: '',
              image: '',
              thumbs: [],
              pubkey
            });
          }
        } else {
          console.log('❌ Invalid badge definition format:', profileBadge.badgeDefinition);
          // Create a fallback for invalid format
          definitions.push({
            identifier: profileBadge.badgeDefinition,
            name: profileBadge.badgeDefinition,
            description: '',
            image: '',
            thumbs: [],
            pubkey: pubkey || 'unknown'
          });
        }
      }

      console.log('🎯 Final definitions array:', definitions);
      return definitions;
    },
    enabled: profileBadges.length > 0,
    staleTime: 300000, // 5 minutes
  });

  // Combine profile badges with their definitions and awards
  const userBadges = useMemo(() => {
    if (!profileBadges || profileBadges.length === 0) {
      console.log('🎪 No profile badges to combine');
      return [];
    }

    const combined = profileBadges.map((profileBadge, index) => {
      const definition = badgeDefinitions.data?.[index];
      const award = badgeAwards.find(award => award.id === profileBadge.badgeAward);

      console.log('🔗 Combining badge:', {
        profileBadge,
        definition: definition?.name || 'No definition',
        award: award?.id || 'No award'
      });

      return {
        profileBadge,
        definition,
        award,
      };
    }).filter(badge => {
      // Only filter if BOTH definition and award are missing
      // If we have at least one, we can show the badge
      const hasDefinition = badge.definition !== undefined;
      const hasAward = badge.award !== undefined;

      console.log('🎯 Filtering badge:', {
        hasDefinition,
        hasAward,
        keep: hasDefinition || hasAward
      });

      return hasDefinition || hasAward;
    });

    console.log('🏆 Final user badges:', combined);
    return combined;
  }, [profileBadges, badgeDefinitions.data, badgeAwards]);

  console.log('🏆 Final user badges:', userBadges);

  // Add a timeout to prevent infinite loading
  const isLoading = useMemo(() => {
    const loading = isLoadingProfileBadges || isLoadingBadgeAwards || badgeDefinitions.isLoading;
    console.log('⏳ Badge loading state:', {
      isLoadingProfileBadges,
      isLoadingBadgeAwards,
      badgeDefinitionsLoading: badgeDefinitions.isLoading,
      finalLoading: loading
    });
    return loading;
  }, [isLoadingProfileBadges, isLoadingBadgeAwards, badgeDefinitions.isLoading]);

  return {
    userBadges,
    isLoading,
    error: badgeDefinitions.error,
  };
}

/**
 * Hook to fetch popular badge definitions (for discovery)
 */
export function usePopularBadgeDefinitions() {
  const { nostr } = useNostr();

  return useInfiniteQuery({
    queryKey: ['popular-badge-definitions'],
    queryFn: async ({ pageParam, signal }) => {
      const events = await nostr.query([
        { kinds: [30009], limit: 50, until: pageParam }
      ], { signal });

      return events.map(event => ({
        identifier: event.tags.find(([name]) => name === 'd')?.[1] || '',
        name: event.tags.find(([name]) => name === 'name')?.[1],
        description: event.tags.find(([name]) => name === 'description')?.[1],
        image: event.tags.find(([name]) => name === 'image')?.[1],
        thumbs: event.tags.filter(([name]) => name === 'thumb').map(([_, url]) => url),
        pubkey: event.pubkey,
      })) as BadgeDefinition[];
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined;
      return lastPage[lastPage.length - 1].created_at - 1;
    },
    initialPageParam: Math.floor(Date.now() / 1000),
    staleTime: 300000, // 5 minutes
  });
}