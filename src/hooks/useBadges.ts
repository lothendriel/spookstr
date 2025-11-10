import { useNostr } from '@/hooks/useNostr';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { nip19 } from 'nostr-tools';
import { useMemo, useState, useCallback } from 'react';
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
    queryKey: ['badge-awards', pubkey, 'kind-8'],
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
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    retry: 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Hook to fetch profile badges (badges user chooses to display)
 */
export function useProfileBadges(pubkey: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['profile-badges', pubkey, 'profile_badges'],
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
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    retry: 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Hook to get complete badge information for a user's profile
 */
export function useUserBadges(pubkey: string) {
  console.log('🎪 useUserBadges called with pubkey:', pubkey?.slice(0, 8) + '...');
  const { nostr } = useNostr();

  // Simplified image preloader - let components handle their own loading to avoid conflicts
  const preloadBadgeImages = useCallback(async (definitions: BadgeDefinition[]) => {
    // Removed complex preloading to avoid conflicts with component-level loading
    // Components now handle their own image loading for better control
    console.log('🎨 Badge definitions available for component-level loading:', definitions.length);
  }, []);

  // Fetch profile badges (kind 30008 with d=profile_badges)
  const {
    data: profileBadges = [],
    isLoading: isLoadingProfileBadges,
    error: profileBadgesError
  } = useProfileBadges(pubkey);

  // Log any errors with profile badges
  if (profileBadgesError) {
    console.error('❌ Error fetching profile badges:', profileBadgesError);
  }

  // Fetch badge awards (kind 8 with p tag)
  const {
    data: badgeAwards = [],
    isLoading: isLoadingBadgeAwards,
    error: badgeAwardsError
  } = useBadgeAwards(pubkey);

  // Log any errors with badge awards
  if (badgeAwardsError) {
    console.error('❌ Error fetching badge awards:', badgeAwardsError);
  }

  // Fetch badge definitions for each profile badge (kind 30009)
  const badgeDefinitions = useQuery({
    queryKey: ['badge-definitions', profileBadges.map(b => b.badgeDefinition)],
    queryFn: async ({ signal }) => {
      const definitions: BadgeDefinition[] = [];

      console.log('🔍 Fetching badge definitions for:', profileBadges.length, 'profile badges');

      // Use a longer timeout for badge definitions
      const timeoutSignal = AbortSignal.timeout(15000); // 15 seconds timeout
      const combinedSignal = AbortSignal.any([signal, timeoutSignal]);

      // Process badges in parallel with Promise.all for better performance
      try {
        const definitionPromises = profileBadges.map(async (profileBadge) => {
          console.log('🏷️ Processing profile badge:', profileBadge);

          try {
            // Handle different formats of badge definition strings
            let kind, badgePubkey, identifier;

            if (profileBadge.badgeDefinition.includes(':')) {
              [kind, badgePubkey, identifier] = profileBadge.badgeDefinition.split(':');
            } else {
              // If no proper format, use fallback
              return {
                identifier: profileBadge.badgeDefinition,
                name: profileBadge.badgeDefinition,
                description: 'Badge definition format error',
                image: '',
                thumbs: [],
                pubkey: 'unknown'
              };
            }

            console.log('📝 Parsed parts:', { kind, pubkey: badgePubkey, identifier });

            if (kind === '30009' && badgePubkey && identifier) {
              const filter = { kinds: [30009], authors: [badgePubkey], '#d': [identifier] };
              console.log('🔎 Querying for badge definition:', filter);

              const events = await nostr.query([filter], { signal: combinedSignal });
              console.log('📋 Found badge definition events:', events.length);

              if (events.length > 0) {
                const event = events[0];
                const imageUrl = event.tags.find(([name]) => name === 'image')?.[1];
                const thumbs = event.tags.filter(([name]) => name === 'thumb').map(([_, url]) => url);

                const definition = {
                  identifier,
                  name: event.tags.find(([name]) => name === 'name')?.[1] || identifier,
                  description: event.tags.find(([name]) => name === 'description')?.[1] || '',
                  image: imageUrl,
                  thumbs: thumbs,
                  pubkey: badgePubkey,
                };

                // Debug: Log image URL status
                console.log('✅ Badge definition:', {
                  ...definition,
                  hasImage: !!imageUrl,
                  hasThumbs: thumbs.length > 0,
                  thumbCount: thumbs.length,
                  firstThumb: thumbs[0]?.substring(0, 50) + '...'
                });
                return definition;
              } else {
                console.log('❌ No badge definition found for:', profileBadge.badgeDefinition);
                // Create a fallback definition
                return {
                  identifier,
                  name: identifier,
                  description: 'Badge definition not found',
                  image: '',
                  thumbs: [],
                  pubkey: badgePubkey
                };
              }
            } else {
              console.log('❌ Invalid badge definition format:', profileBadge.badgeDefinition);
              return {
                identifier: profileBadge.badgeDefinition,
                name: profileBadge.badgeDefinition.split(':').pop() || 'Unknown Badge',
                description: 'Invalid badge format',
                image: '',
                thumbs: [],
                pubkey: badgePubkey || 'unknown'
              };
            }
          } catch (error) {
            console.log('❌ Error processing badge:', profileBadge.badgeDefinition, error);
            return {
              identifier: profileBadge.badgeDefinition,
              name: profileBadge.badgeDefinition.split(':').pop() || 'Error Badge',
              description: 'Error fetching badge definition',
              image: '',
              thumbs: [],
              pubkey: 'unknown'
            };
          }
        });

        // Wait for all definitions to be fetched
        const results = await Promise.all(definitionPromises);
        definitions.push(...results);

        // Notify components that badge definitions are available
        // Components will handle their own image loading
        if (definitions.length > 0) {
          preloadBadgeImages(definitions).catch(console.error);
        }
      } catch (error) {
        console.error('❌ Error fetching badge definitions:', error);
      }

      console.log('🎯 Final definitions array:', definitions);
      return definitions;
    },
    enabled: profileBadges.length > 0,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - cache for much longer
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    retry: 2,
    refetchOnMount: false, // Don't refetch on mount if we have cached data
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnReconnect: false, // Don't refetch when reconnecting
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
  const [forceLoadingComplete, setForceLoadingComplete] = useState(false);

  // Force loading to complete after 5 seconds to prevent hanging
  useMemo(() => {
    if (isLoadingProfileBadges || isLoadingBadgeAwards || badgeDefinitions.isLoading) {
      const timer = setTimeout(() => {
        console.log('⏰ Force completing badge loading after timeout');
        setForceLoadingComplete(true);
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setForceLoadingComplete(false);
    }
  }, [isLoadingProfileBadges, isLoadingBadgeAwards, badgeDefinitions.isLoading]);
  const isLoading = useMemo(() => {
    // Don't show loading if we've forced completion
    if (forceLoadingComplete) return false;
    // Only consider loading if we're still fetching the initial data
    // Don't get stuck on badge definitions loading
    const hasProfileBadges = profileBadges.length > 0;
    const hasBadgeAwards = badgeAwards.length > 0;

    // If we have the basic data, don't wait for definitions to finish loading
    const basicDataLoaded = hasProfileBadges || hasBadgeAwards;

    const loading = (isLoadingProfileBadges || isLoadingBadgeAwards) && !basicDataLoaded;

    console.log('⏳ Badge loading state:', {
      isLoadingProfileBadges,
      isLoadingBadgeAwards,
      badgeDefinitionsLoading: badgeDefinitions.isLoading,
      hasProfileBadges,
      hasBadgeAwards,
      basicDataLoaded,
      finalLoading: loading
    });
    return loading;
  }, [isLoadingProfileBadges, isLoadingBadgeAwards, badgeDefinitions.isLoading, profileBadges, badgeAwards, forceLoadingComplete]);

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