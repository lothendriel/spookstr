import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from './useCurrentUser';
import { useFollow } from './useFollow';
import { type NostrMetadata, NSchema as n } from '@nostrify/nostrify';

export interface SearchableUser {
  pubkey: string;
  metadata?: NostrMetadata;
  nip05?: string;
  displayName: string;
  picture?: string;
  isFollowing: boolean;
  matchScore: number;
}

export function useUserSearch() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { follows, isFollowing } = useFollow();
  const [searchQuery, setSearchQuery] = useState('');

  // Get followed users' metadata
  const { data: followedUsersData } = useQuery({
    queryKey: ['followed-users-metadata', follows.map(f => f.pubkey).sort()],
    queryFn: async ({ signal }) => {
      if (follows.length === 0) return [];

      const pubkeys = follows.map(f => f.pubkey);
      const events = await nostr.query(
        [{ kinds: [0], authors: pubkeys, limit: pubkeys.length }],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]) }
      );

      return events.map(event => {
        try {
          const metadata = n.json().pipe(n.metadata()).parse(event.content);
          return { pubkey: event.pubkey, metadata, event };
        } catch {
          return { pubkey: event.pubkey, event };
        }
      });
    },
    enabled: follows.length > 0,
    staleTime: 300000, // 5 minutes
  });

  // Search for users by NIP-05 or name
  const { data: searchResultsData } = useQuery({
    queryKey: ['user-search', searchQuery],
    queryFn: async ({ signal }) => {
      if (!searchQuery || searchQuery.length < 2) return [];

      try {
        // Search for profiles that mention the search query
        const events = await nostr.query(
          [{
            kinds: [0],
            search: searchQuery,
            limit: 20
          }],
          { signal: AbortSignal.any([signal, AbortSignal.timeout(2000)]) }
        );

        return events.map(event => {
          try {
            const metadata = n.json().pipe(n.metadata()).parse(event.content);
            return { pubkey: event.pubkey, metadata, event };
          } catch {
            return { pubkey: event.pubkey, event };
          }
        });
      } catch {
        // If search is not supported by relay, return empty array
        return [];
      }
    },
    enabled: searchQuery.length >= 2,
    staleTime: 30000, // 30 seconds
  });

  // Combine and process users
  const searchableUsers = useMemo((): SearchableUser[] => {
    const allUsers = new Map<string, SearchableUser>();
    const query = searchQuery.toLowerCase().trim();

    // Add followed users
    if (followedUsersData) {
      followedUsersData.forEach(({ pubkey, metadata }) => {
        const displayName = metadata?.display_name || metadata?.name || `${pubkey.slice(0, 8)}...`;
        const nip05 = metadata?.nip05;

        // Calculate match score
        let matchScore = 0;
        if (query) {
          if (displayName.toLowerCase().includes(query)) matchScore += 10;
          if (nip05?.toLowerCase().includes(query)) matchScore += 8;
          if (metadata?.about?.toLowerCase().includes(query)) matchScore += 3;
        } else {
          matchScore = 5; // Base score for followed users when no query
        }

        allUsers.set(pubkey, {
          pubkey,
          metadata,
          nip05,
          displayName,
          picture: metadata?.picture,
          isFollowing: true,
          matchScore,
        });
      });
    }

    // Add search results
    if (searchResultsData && query) {
      searchResultsData.forEach(({ pubkey, metadata }) => {
        if (allUsers.has(pubkey)) {
          // Update match score for existing user
          const existing = allUsers.get(pubkey)!;
          existing.matchScore += 5; // Boost score for appearing in search
        } else {
          const displayName = metadata?.display_name || metadata?.name || `${pubkey.slice(0, 8)}...`;
          const nip05 = metadata?.nip05;

          // Calculate match score
          let matchScore = 1; // Base score for search results
          if (displayName.toLowerCase().includes(query)) matchScore += 8;
          if (nip05?.toLowerCase().includes(query)) matchScore += 6;
          if (metadata?.about?.toLowerCase().includes(query)) matchScore += 2;

          allUsers.set(pubkey, {
            pubkey,
            metadata,
            nip05,
            displayName,
            picture: metadata?.picture,
            isFollowing: isFollowing(pubkey),
            matchScore,
          });
        }
      });
    }

    // Convert to array and sort by match score and following status
    return Array.from(allUsers.values())
      .filter(searchUser => {
        // Filter out current user
        if (searchUser.pubkey === user?.pubkey) return false;

        // If no query, show followed users
        if (!query) return searchUser.isFollowing;

        // Otherwise show users with positive match scores
        return searchUser.matchScore > 0;
      })
      .sort((a, b) => {
        // First by following status (followed users first)
        if (a.isFollowing !== b.isFollowing) {
          return a.isFollowing ? -1 : 1;
        }
        // Then by match score (higher first)
        return b.matchScore - a.matchScore;
      })
      .slice(0, 10); // Limit to 10 results
  }, [followedUsersData, searchResultsData, searchQuery, isFollowing, user?.pubkey]);

  const searchUsers = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return {
    searchUsers,
    clearSearch,
    searchQuery,
    users: searchableUsers,
    isLoading: searchQuery.length >= 2 ? !searchResultsData : false,
  };
}