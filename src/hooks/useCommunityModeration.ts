import { useQuery } from '@tanstack/react-query';
import { useNostr } from './useNostr';
import { NostrEvent } from '@nostrify/nostrify';

export interface PendingPost {
  event: NostrEvent;
  isReply: boolean;
  parentEventId?: string;
}

export interface ModerationAction {
  event: NostrEvent;
  action: 'approve' | 'deny';
  timestamp: number;
  moderator: string;
}

/**
 * Hook to fetch all posts and replies that need moderation approval for a community
 * Enhanced with local state persistence and robust caching
 */
export function usePendingPosts(communityId?: string, communityAuthor?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['pending-posts', communityId, communityAuthor],
    queryFn: async (context) => {
      if (!communityId || !communityAuthor) return [];

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(15000)]);
      const communityTag = `34550:${communityAuthor}:${communityId}`;

      console.log('🔍 Fetching pending posts for community:', communityTag);

      // First, get local moderation decisions from localStorage
      const localModeratedEvents = new Map<string, 'approve' | 'deny'>();
      console.log(`🔍 Searching localStorage for keys starting with 'moderation-${communityId}-'`);

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log(`🔑 Checking localStorage key: ${key}`);

        if (key?.startsWith(`moderation-${communityId}-`)) {
          try {
            const value = localStorage.getItem(key);
            console.log(`📦 Found local moderation key: ${key}, value: ${value}`);

            const data = JSON.parse(value || '{}');
            console.log(`📋 Parsed local moderation data:`, data);

            // Validate the data structure
            if (data && typeof data === 'object' && data.eventId && data.action && ['approve', 'deny'].includes(data.action)) {
              localModeratedEvents.set(data.eventId, data.action);
              console.log(`✅ Added to localModeratedEvents: ${data.action} for ${data.eventId.slice(0, 8)}...`);
            } else {
              console.warn(`⚠️ Invalid local moderation data structure:`, data);
              console.warn(`   Has eventId: ${!!data?.eventId}`);
              console.warn(`   Has action: ${!!data?.action}`);
              console.warn(`   Valid action: ${data?.action && ['approve', 'deny'].includes(data.action)}`);

              // Remove invalid data to prevent future issues
              try {
                localStorage.removeItem(key);
                console.log(`🗑️ Removed invalid local moderation data: ${key}`);
              } catch (removeError) {
                console.error(`❌ Failed to remove invalid data: ${key}`, removeError);
              }
            }
          } catch (error) {
            console.error(`❌ Failed to parse local moderation data for key ${key}:`, error);
            console.error(`Raw value: ${localStorage.getItem(key)}`);

            // Remove corrupted data to prevent future issues
            try {
              localStorage.removeItem(key);
              console.log(`🗑️ Removed corrupted local moderation data: ${key}`);
            } catch (removeError) {
              console.error(`❌ Failed to remove corrupted data: ${key}`, removeError);
            }
          }
        }
      }

      console.log(`📱 Total local moderation decisions found: ${localModeratedEvents.size}`);
      console.log(`📱 Local moderated event IDs:`, Array.from(localModeratedEvents.keys()).map(id => id.slice(0, 8) + '...'));

      // Query for all posts and replies (kind 1111) in this community
      const allPosts = await nostr.query([{
        kinds: [1111],
        '#A': [communityTag],
        limit: 200
      }], { signal });

      // Also query for legacy kind 1 posts for backwards compatibility
      const legacyPosts = await nostr.query([{
        kinds: [1],
        '#a': [communityTag],
        limit: 100
      }], { signal });

      // Combine both types of posts, removing duplicates
      const combinedPosts = [...allPosts, ...legacyPosts];
      const uniquePosts = combinedPosts.filter((post, index, self) =>
        index === self.findIndex(p => p.id === post.id)
      );

      console.log(`📝 Found ${allPosts.length} kind 1111 posts + ${legacyPosts.length} kind 1 posts = ${uniquePosts.length} unique posts`);

      console.log(`📝 Post IDs:`, uniquePosts.map(p => p.id.slice(0, 8) + '...'));

      // Query for all approval events (kind 4550) for this community
      const approvals = await nostr.query([
        {
          kinds: [4550],
          '#a': [communityTag],
          limit: 200
        }
      ], { signal });

      console.log(`✅ Found ${approvals.length} approval events (kind 4550)`);

      // Query for all denial events (kind 4551) for this community
      const denials = await nostr.query([
        {
          kinds: [4551],
          '#a': [communityTag],
          limit: 200
        }
      ], { signal });

      console.log(`❌ Found ${denials.length} denial events (kind 4551)`);

      // Create sets of approved and denied event IDs for quick lookup
      const approvedEventIds = new Set<string>();
      const deniedEventIds = new Set<string>();

      // Process remote approval events
      approvals.forEach(approval => {
        console.log(`🔍 Processing approval event ${approval.id.slice(0, 8)}...`);
        console.log(`   Tags:`, approval.tags);

        const eTags = approval.tags.filter(tag => tag[0] === 'e');
        console.log(`   Found ${eTags.length} e-tags`);

        const actionTag = approval.tags.find(tag => tag[0] === 'action');

        eTags.forEach(eTag => {
          if (eTag[1]) {
            approvedEventIds.add(eTag[1]);
            console.log(`✅ Remote approval added to set: ${eTag[1].slice(0, 8)}...`);

            // Clean up local storage if we have ANY local decision for this event (regardless of action type)
            if (localModeratedEvents.has(eTag[1])) {
              const localKey = `moderation-${communityId}-${eTag[1]}`;
              const localAction = localModeratedEvents.get(eTag[1]);

              try {
                localStorage.removeItem(localKey);
                localModeratedEvents.delete(eTag[1]);
                console.log(`🧹 Cleaned up local ${localAction} for ${eTag[1].slice(0, 8)}... (remote approval found)`);
              } catch (error) {
                console.error(`❌ Failed to cleanup local decision for ${eTag[1].slice(0, 8)}...:`, error);
              }
            }
          }
        });
      });

      console.log(`✅ Total approved event IDs in set: ${approvedEventIds.size}`);
      console.log(`✅ Approved event IDs:`, Array.from(approvedEventIds).map(id => id.slice(0, 8) + '...'));

      // Process remote denial events
      denials.forEach(denial => {
        console.log(`🔍 Processing denial event ${denial.id.slice(0, 8)}...`);
        console.log(`   Tags:`, denial.tags);

        const eTags = denial.tags.filter(tag => tag[0] === 'e');
        console.log(`   Found ${eTags.length} e-tags`);

        const actionTag = denial.tags.find(tag => tag[0] === 'action');

        eTags.forEach(eTag => {
          if (eTag[1]) {
            deniedEventIds.add(eTag[1]);
            console.log(`❌ Remote denial added to set: ${eTag[1].slice(0, 8)}...`);

            // Clean up local storage if we have ANY local decision for this event (regardless of action type)
            if (localModeratedEvents.has(eTag[1])) {
              const localKey = `moderation-${communityId}-${eTag[1]}`;
              const localAction = localModeratedEvents.get(eTag[1]);

              try {
                localStorage.removeItem(localKey);
                localModeratedEvents.delete(eTag[1]);
                console.log(`🧹 Cleaned up local ${localAction} for ${eTag[1].slice(0, 8)}... (remote denial found)`);
              } catch (error) {
                console.error(`❌ Failed to cleanup local decision for ${eTag[1].slice(0, 8)}...:`, error);
              }
            }
          }
        });
      });

      console.log(`❌ Total denied event IDs in set: ${deniedEventIds.size}`);
      console.log(`❌ Denied event IDs:`, Array.from(deniedEventIds).map(id => id.slice(0, 8) + '...'));

      console.log(`🎯 ${approvedEventIds.size} unique approved event IDs`);
      console.log(`🚫 ${deniedEventIds.size} unique denied event IDs`);

      // Now clean up stale local decisions (older than 24 hours without remote confirmation)
      const staleThreshold = Math.floor(Date.now() / 1000) - (24 * 60 * 60); // 24 hours ago
      let staleCount = 0;

      for (const [eventId, action] of Array.from(localModeratedEvents.entries())) {
        try {
          const key = `moderation-${communityId}-${eventId}`;
          const value = localStorage.getItem(key);

          if (value) {
            const data = JSON.parse(value);

            // Check if the decision is stale
            if (data.timestamp && data.timestamp < staleThreshold) {
              console.log(`⏰ Found stale local decision: ${action} for ${eventId.slice(0, 8)}... (${Math.floor((staleThreshold - data.timestamp) / 3600)} hours old)`);

              // Check if we have a remote confirmation
              const hasRemoteApproval = approvedEventIds.has(eventId);
              const hasRemoteDenial = deniedEventIds.has(eventId);

              if (!hasRemoteApproval && !hasRemoteDenial) {
                // No remote confirmation found, clean up stale local decision
                localStorage.removeItem(key);
                localModeratedEvents.delete(eventId);
                staleCount++;
                console.log(`🧹 Cleaned up stale local decision: ${action} for ${eventId.slice(0, 8)}...`);
              } else {
                console.log(`✅ Remote confirmation found for ${eventId.slice(0, 8)}..., keeping local decision`);
              }
            }
          }
        } catch (error) {
          console.error(`❌ Failed to check stale decision for ${eventId.slice(0, 8)}...:`, error);

          // Remove potentially corrupted data
          const key = `moderation-${communityId}-${eventId}`;
          try {
            localStorage.removeItem(key);
            localModeratedEvents.delete(eventId);
            staleCount++;
            console.log(`🧹 Cleaned up corrupted local decision for ${eventId.slice(0, 8)}...`);
          } catch (removeError) {
            console.error(`❌ Failed to remove corrupted decision: ${removeError}`);
          }
        }
      }

      if (staleCount > 0) {
        console.log(`🧹 Cleaned up ${staleCount} stale local moderation decisions`);
      }

      // Filter out approved and denied posts - only show truly pending posts
      // Remote decisions take priority over local decisions to prevent conflicts
      console.log(`🔍 Starting filtering process for ${uniquePosts.length} posts...`);

      const pendingPosts = uniquePosts
        .filter(post => {
          const isRemoteApproved = approvedEventIds.has(post.id);
          const isRemoteDenied = deniedEventIds.has(post.id);
          const localAction = localModeratedEvents.get(post.id);

          // Priority-based conflict resolution: Remote > Local
          let finalStatus: 'approved' | 'denied' | 'pending' = 'pending';

          if (isRemoteApproved) {
            finalStatus = 'approved';
          } else if (isRemoteDenied) {
            finalStatus = 'denied';
          } else if (localAction === 'approve') {
            finalStatus = 'approved';
          } else if (localAction === 'deny') {
            finalStatus = 'denied';
          }

          const shouldShow = finalStatus === 'pending';

          console.log(`📝 Post ${post.id.slice(0, 8)}...:`);
          console.log(`   Remote Approved: ${isRemoteApproved}`);
          console.log(`   Remote Denied: ${isRemoteDenied}`);
          console.log(`   Local Action: ${localAction}`);
          console.log(`   Final Status: ${finalStatus}`);
          console.log(`   Should Show: ${shouldShow}`);
          console.log(`   ---`);

          return shouldShow;
        })
        .map(post => {
          // Check if this is a reply by looking for 'e' tags (parent event)
          const parentEventTag = post.tags.find(tag =>
            tag[0] === 'e' && tag[1] !== post.id
          );

          return {
            event: post,
            isReply: !!parentEventTag,
            parentEventId: parentEventTag?.[1]
          };
        })
        .sort((a, b) => b.event.created_at - a.event.created_at); // Newest first

      console.log(`⏳ Final result: ${pendingPosts.length} pending posts after filtering`);
      console.log(`⏳ Pending post IDs:`, pendingPosts.map(p => p.event.id.slice(0, 8) + '...'));

      return pendingPosts as PendingPost[];
    },
    enabled: !!communityId && !!communityAuthor,
    refetchInterval: 30000, // Refetch every 30 seconds (reduced frequency)
    staleTime: 10000, // Consider data fresh for 10 seconds
    gcTime: 300000, // Keep data in cache for 5 minutes (increased)
    retry: 3, // Retry failed queries 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000) // Exponential backoff
  });
}

/**
 * Hook to fetch approved posts for a community
 * Enhanced with local state persistence and robust caching
 */
export function useApprovedPosts(communityId?: string, communityAuthor?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['approved-posts', communityId, communityAuthor],
    queryFn: async (context) => {
      if (!communityId || !communityAuthor) return [];

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(15000)]);
      const communityTag = `34550:${communityAuthor}:${communityId}`;

      console.log('🔍 Fetching approved posts for community:', communityTag);

      // First, get local moderation decisions from localStorage with validation
      const localApprovedEvents = new Set<string>();
      const staleThreshold = Math.floor(Date.now() / 1000) - (24 * 60 * 60); // 24 hours ago

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`moderation-${communityId}-`)) {
          try {
            const value = localStorage.getItem(key);
            const data = JSON.parse(value || '{}');

            // Validate the data structure
            if (data && typeof data === 'object' && data.eventId && data.action && ['approve', 'deny'].includes(data.action)) {
              if (data.action === 'approve') {
                // Check if it's stale
                if (data.timestamp && data.timestamp < staleThreshold) {
                  console.log(`⏰ Found stale local approval: ${data.eventId.slice(0, 8)}... (${Math.floor((staleThreshold - data.timestamp) / 3600)} hours old)`);
                  // Don't add to localApprovedEvents if stale
                } else {
                  localApprovedEvents.add(data.eventId);
                  console.log(`📱 Found local approval: ${data.eventId.slice(0, 8)}...`);
                }
              }
            } else {
              console.warn(`⚠️ Invalid local moderation data structure:`, data);
              // Remove invalid data
              try {
                localStorage.removeItem(key);
                console.log(`🗑️ Removed invalid local moderation data: ${key}`);
              } catch (removeError) {
                console.error(`❌ Failed to remove invalid data: ${key}`, removeError);
              }
            }
          } catch (error) {
            console.error(`❌ Failed to parse local moderation data: ${key}`, error);
            // Remove corrupted data
            try {
              localStorage.removeItem(key);
              console.log(`🗑️ Removed corrupted local moderation data: ${key}`);
            } catch (removeError) {
              console.error(`❌ Failed to remove corrupted data: ${key}`, removeError);
            }
          }
        }
      }

      console.log(`📱 Found ${localApprovedEvents.size} local approved events`);

      // Query for all approval events (kind 4550) for this community
      const approvals = await nostr.query([
        {
          kinds: [4550],
          '#a': [communityTag],
          limit: 200
        }
      ], { signal });

      console.log(`✅ Found ${approvals.length} approval events for approved posts`);

      // Query for all denial events (kind 4551) for this community
      const denials = await nostr.query([
        {
          kinds: [4551],
          '#a': [communityTag],
          limit: 200
        }
      ], { signal });

      console.log(`❌ Found ${denials.length} denial events for approved posts`);

      // Create sets of approved and denied event IDs for filtering (same logic as usePendingPosts)
      const approvedEventIds = new Set<string>();
      const deniedEventIds = new Set<string>();

      // Process remote approval events
      approvals.forEach(approval => {
        console.log(`🔍 Processing approval event ${approval.id.slice(0, 8)}... for approved posts`);
        const eTags = approval.tags.filter(tag => tag[0] === 'e');

        eTags.forEach(eTag => {
          if (eTag[1]) {
            approvedEventIds.add(eTag[1]);
            console.log(`✅ Remote approval added to set: ${eTag[1].slice(0, 8)}...`);

            // Clean up local storage if we have ANY local decision for this event
            if (localApprovedEvents.has(eTag[1])) {
              const localKey = `moderation-${communityId}-${eTag[1]}`;
              const localAction = localApprovedEvents.has(eTag[1]) ? 'approve' : 'unknown';

              try {
                localStorage.removeItem(localKey);
                localApprovedEvents.delete(eTag[1]);
                console.log(`🧹 Cleaned up local ${localAction} for ${eTag[1].slice(0, 8)}... (remote approval found)`);
              } catch (error) {
                console.error(`❌ Failed to cleanup local decision for ${eTag[1].slice(0, 8)}...:`, error);
              }
            }
          }
        });
      });

      // Process remote denial events
      denials.forEach(denial => {
        console.log(`🔍 Processing denial event ${denial.id.slice(0, 8)}... for approved posts`);
        const eTags = denial.tags.filter(tag => tag[0] === 'e');

        eTags.forEach(eTag => {
          if (eTag[1]) {
            deniedEventIds.add(eTag[1]);
            console.log(`❌ Remote denial added to set: ${eTag[1].slice(0, 8)}...`);

            // Clean up local storage if we have ANY local decision for this event
            if (localApprovedEvents.has(eTag[1])) {
              const localKey = `moderation-${communityId}-${eTag[1]}`;
              const localAction = localApprovedEvents.has(eTag[1]) ? 'approve' : 'unknown';

              try {
                localStorage.removeItem(localKey);
                localApprovedEvents.delete(eTag[1]);
                console.log(`🧹 Cleaned up local ${localAction} for ${eTag[1].slice(0, 8)}... (remote denial found)`);
              } catch (error) {
                console.error(`❌ Failed to cleanup local decision for ${eTag[1].slice(0, 8)}...:`, error);
              }
            }
          }
        });
      });

      console.log(`✅ Total approved event IDs in set: ${approvedEventIds.size}`);
      console.log(`❌ Total denied event IDs in set: ${deniedEventIds.size}`);

      // Now query for ALL original posts (both kind 1111 and kind 1) and filter for approved ones
      // This ensures consistency with usePendingPosts
      const allPosts = await nostr.query([{
        kinds: [1111],
        '#A': [communityTag],
        limit: 200
      }], { signal });

      const legacyPosts = await nostr.query([{
        kinds: [1],
        '#a': [communityTag],
        limit: 100
      }], { signal });

      // Combine both types of posts, removing duplicates
      const combinedPosts = [...allPosts, ...legacyPosts];
      const uniquePosts = combinedPosts.filter((post, index, self) =>
        index === self.findIndex(p => p.id === post.id)
      );

      console.log(`📝 Found ${uniquePosts.length} total posts to filter for approved ones`);

      // Filter for only approved posts using the same logic as usePendingPosts
      const approvedPosts = uniquePosts
        .filter(post => {
          const isRemoteApproved = approvedEventIds.has(post.id);
          const isRemoteDenied = deniedEventIds.has(post.id);
          const localAction = localApprovedEvents.has(post.id) ? 'approve' : undefined;

          // Priority-based conflict resolution: Remote > Local
          let finalStatus: 'approved' | 'denied' | 'pending' = 'pending';

          if (isRemoteApproved) {
            finalStatus = 'approved';
          } else if (isRemoteDenied) {
            finalStatus = 'denied';
          } else if (localAction === 'approve') {
            finalStatus = 'approved';
          } else if (localAction === 'deny') {
            finalStatus = 'denied';
          }

          const shouldShow = finalStatus === 'approved';

          console.log(`📝 Post ${post.id.slice(0, 8)}... for approved tab:`);
          console.log(`   Remote Approved: ${isRemoteApproved}`);
          console.log(`   Remote Denied: ${isRemoteDenied}`);
          console.log(`   Local Action: ${localAction}`);
          console.log(`   Final Status: ${finalStatus}`);
          console.log(`   Should Show: ${shouldShow}`);
          console.log(`   ---`);

          return shouldShow;
        })
        .map(post => {
          const parentEventTag = post.tags.find(tag =>
            tag[0] === 'e' && tag[1] !== post.id
          );

          return {
            event: post,
            isReply: !!parentEventTag,
            parentEventId: parentEventTag?.[1]
          };
        })
        .sort((a, b) => b.event.created_at - a.event.created_at); // Newest first

      console.log(`✅ Final result: ${approvedPosts.length} approved posts after filtering`);
      console.log(`✅ Approved post IDs:`, approvedPosts.map(p => p.event.id.slice(0, 8) + '...'));

      return approvedPosts;
    },
    enabled: !!communityId && !!communityAuthor,
    refetchInterval: 30000, // Refetch every 30 seconds (reduced frequency)
    staleTime: 10000, // Consider data fresh for 10 seconds
    gcTime: 300000, // Keep data in cache for 5 minutes (increased)
    retry: 3, // Retry failed queries 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000) // Exponential backoff
  });
}

/**
 * Hook to fetch all moderation actions (approvals and denials) for a community
 * Enhanced with local state persistence and robust caching
 */
export function useModerationActions(communityId?: string, communityAuthor?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['moderation-actions', communityId, communityAuthor],
    queryFn: async (context) => {
      if (!communityId || !communityAuthor) return [];

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(15000)]);
      const communityTag = `34550:${communityAuthor}:${communityId}`;

      console.log('🔍 Fetching moderation actions for community:', communityTag);

      // First, get local moderation decisions from localStorage with validation
      const localActions: ModerationAction[] = [];
      const staleThreshold = Math.floor(Date.now() / 1000) - (24 * 60 * 60); // 24 hours ago

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`moderation-${communityId}-`)) {
          try {
            const value = localStorage.getItem(key);
            const data = JSON.parse(value || '{}');

            // Validate the data structure
            if (data && typeof data === 'object' &&
                data.eventId && data.action && data.moderator && data.timestamp &&
                ['approve', 'deny'].includes(data.action)) {

              // Check if it's stale
              if (data.timestamp && data.timestamp < staleThreshold) {
                console.log(`⏰ Found stale local action: ${data.action} by ${data.moderator.slice(0, 8)}... (${Math.floor((staleThreshold - data.timestamp) / 3600)} hours old)`);
                // Don't include stale actions
              } else {
                // Create a synthetic event for local actions
                const syntheticEvent = {
                  id: `local-${data.eventId}`,
                  pubkey: data.moderator,
                  created_at: data.timestamp,
                  tags: [
                    ['e', data.eventId],
                    ['action', data.action]
                  ],
                  content: JSON.stringify(data)
                } as NostrEvent;

                localActions.push({
                  event: syntheticEvent,
                  action: data.action,
                  timestamp: data.timestamp,
                  moderator: data.moderator
                });

                console.log(`📱 Found local action: ${data.action} by ${data.moderator.slice(0, 8)}...`);
              }
            } else {
              console.warn(`⚠️ Invalid local moderation data structure:`, data);
              // Remove invalid data
              try {
                localStorage.removeItem(key);
                console.log(`🗑️ Removed invalid local moderation data: ${key}`);
              } catch (removeError) {
                console.error(`❌ Failed to remove invalid data: ${key}`, removeError);
              }
            }
          } catch (error) {
            console.error(`❌ Failed to parse local moderation data: ${key}`, error);
            // Remove corrupted data
            try {
              localStorage.removeItem(key);
              console.log(`🗑️ Removed corrupted local moderation data: ${key}`);
            } catch (removeError) {
              console.error(`❌ Failed to remove corrupted data: ${key}`, removeError);
            }
          }
        }
      }

      console.log(`📱 Found ${localActions.length} local moderation actions`);

      // Query for both approval (4550) and denial (4551) events
      const [approvals, denials] = await Promise.all([
        nostr.query([{
          kinds: [4550],
          '#a': [communityTag],
          limit: 200
        }], { signal }),
        nostr.query([{
          kinds: [4551],
          '#a': [communityTag],
          limit: 200
        }], { signal })
      ]);

      console.log(`✅ Found ${approvals.length} approval events and ${denials.length} denial events`);

      // Combine and sort all moderation actions
      const allActions: ModerationAction[] = [];

      // Process remote approval events
      approvals.forEach(approval => {
        const eTags = approval.tags.filter(tag => tag[0] === 'e');
        const actionTag = approval.tags.find(tag => tag[0] === 'action');

        eTags.forEach(eTag => {
          if (eTag[1]) {
            allActions.push({
              event: approval,
              action: 'approve',
              timestamp: approval.created_at,
              moderator: approval.pubkey
            });

            // Clean up local storage if we have a remote confirmation
            const localKey = `moderation-${communityId}-${eTag[1]}`;
            if (localStorage.getItem(localKey)) {
              try {
                localStorage.removeItem(localKey);
                console.log(`🧹 Cleaned up local action for ${eTag[1].slice(0, 8)}... (remote ${action} found)`);
              } catch (error) {
                console.error(`❌ Failed to cleanup local action for ${eTag[1].slice(0, 8)}...:`, error);
              }
            }
          }
        });
      });

      // Process remote denial events
      denials.forEach(denial => {
        const eTags = denial.tags.filter(tag => tag[0] === 'e');
        const actionTag = denial.tags.find(tag => tag[0] === 'action');

        eTags.forEach(eTag => {
          if (eTag[1]) {
            allActions.push({
              event: denial,
              action: 'deny',
              timestamp: denial.created_at,
              moderator: denial.pubkey
            });

            // Clean up local storage if we have a remote confirmation
            const localKey = `moderation-${communityId}-${eTag[1]}`;
            if (localStorage.getItem(localKey)) {
              try {
                localStorage.removeItem(localKey);
                console.log(`🧹 Cleaned up local action for ${eTag[1].slice(0, 8)}... (remote ${action} found)`);
              } catch (error) {
                console.error(`❌ Failed to cleanup local action for ${eTag[1].slice(0, 8)}...:`, error);
              }
            }
          }
        });
      });

      // Combine remote and local actions
      const combinedActions = [...allActions, ...localActions];

      // Sort by timestamp (newest first)
      const sortedActions = combinedActions.sort((a, b) => b.timestamp - a.timestamp);

      console.log(`📋 Total moderation actions: ${sortedActions.length} (${allActions.length} remote + ${localActions.length} local)`);

      return sortedActions;
    },
    enabled: !!communityId && !!communityAuthor,
    refetchInterval: 30000, // Refetch every 30 seconds (reduced frequency)
    staleTime: 10000, // Consider data fresh for 10 seconds
    gcTime: 300000, // Keep data in cache for 5 minutes (increased)
    retry: 3, // Retry failed queries 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000) // Exponential backoff
  });
}
