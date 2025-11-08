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

            if (data.eventId && data.action) {
              localModeratedEvents.set(data.eventId, data.action);
              console.log(`✅ Added to localModeratedEvents: ${data.action} for ${data.eventId.slice(0, 8)}...`);
            } else {
              console.warn(`⚠️ Invalid local moderation data structure:`, data);
            }
          } catch (error) {
            console.error(`❌ Failed to parse local moderation data for key ${key}:`, error);
            console.error(`Raw value: ${localStorage.getItem(key)}`);
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

      console.log(`📝 Found ${allPosts.length} total posts (kind 1111)`);

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
        const eTags = approval.tags.filter(tag => tag[0] === 'e');
        const actionTag = approval.tags.find(tag => tag[0] === 'action');

        eTags.forEach(eTag => {
          if (eTag[1]) {
            approvedEventIds.add(eTag[1]);
            console.log(`✅ Remote approval: ${eTag[1].slice(0, 8)}...`);

            // Clean up local storage if we have a remote confirmation
            if (localModeratedEvents.has(eTag[1]) && localModeratedEvents.get(eTag[1]) === 'approve') {
              const localKey = `moderation-${communityId}-${eTag[1]}`;
              localStorage.removeItem(localKey);
              localModeratedEvents.delete(eTag[1]);
              console.log(`🧹 Cleaned up local approval for ${eTag[1].slice(0, 8)}...`);
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
            deniedEventIds.add(eTag[1]);
            console.log(`❌ Remote denial: ${eTag[1].slice(0, 8)}...`);

            // Clean up local storage if we have a remote confirmation
            if (localModeratedEvents.has(eTag[1]) && localModeratedEvents.get(eTag[1]) === 'deny') {
              const localKey = `moderation-${communityId}-${eTag[1]}`;
              localStorage.removeItem(localKey);
              localModeratedEvents.delete(eTag[1]);
              console.log(`🧹 Cleaned up local denial for ${eTag[1].slice(0, 8)}...`);
            }
          }
        });
      });

      console.log(`🎯 ${approvedEventIds.size} unique approved event IDs`);
      console.log(`🚫 ${deniedEventIds.size} unique denied event IDs`);

      // Filter out approved and denied posts - only show truly pending posts
      // Combine remote and local moderation decisions
      console.log(`🔍 Starting filtering process for ${allPosts.length} posts...`);

      const pendingPosts = allPosts
        .filter(post => {
          const isRemoteApproved = approvedEventIds.has(post.id);
          const isRemoteDenied = deniedEventIds.has(post.id);
          const localAction = localModeratedEvents.get(post.id);

          const isApproved = isRemoteApproved || localAction === 'approve';
          const isDenied = isRemoteDenied || localAction === 'deny';
          const shouldShow = !isApproved && !isDenied;

          console.log(`📝 Post ${post.id.slice(0, 8)}...:`);
          console.log(`   Remote Approved: ${isRemoteApproved}`);
          console.log(`   Remote Denied: ${isRemoteDenied}`);
          console.log(`   Local Action: ${localAction}`);
          console.log(`   Is Approved: ${isApproved}`);
          console.log(`   Is Denied: ${isDenied}`);
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

      // First, get local moderation decisions from localStorage
      const localApprovedEvents = new Set<string>();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`moderation-${communityId}-`)) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.eventId && data.action === 'approve') {
              localApprovedEvents.add(data.eventId);
              console.log(`📱 Found local approval: ${data.eventId.slice(0, 8)}...`);
            }
          } catch (error) {
            console.warn('⚠️ Failed to parse local moderation data:', key, error);
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

      // Extract approved posts directly from approval events (kind 4550)
      // According to NIP-72, approval events contain the full approved event in content
      const approvedPosts: NostrEvent[] = [];
      const approvedEventIds = new Set<string>();

      approvals.forEach(approval => {
        const eTags = approval.tags.filter(tag => tag[0] === 'e');

        eTags.forEach(eTag => {
          if (eTag[1]) {
            const eventId = eTag[1];

            // Skip if we already processed this event ID
            if (approvedEventIds.has(eventId)) {
              console.log(`⏭️ Skipping duplicate approval: ${eventId.slice(0, 8)}...`);
              return;
            }

            approvedEventIds.add(eventId);
            console.log(`✅ Processing approval for: ${eventId.slice(0, 8)}...`);

            // Try to extract the approved event from the approval event's content
            try {
              const parsed = JSON.parse(approval.content);

              // Check if it's our enhanced format with approvedEvent
              if (parsed.approvedEvent && parsed.approvedEvent.id === eventId) {
                approvedPosts.push(parsed.approvedEvent as NostrEvent);
                console.log(`📦 Extracted approved post from approval content: ${eventId.slice(0, 8)}...`);
              }
              // Check if it's the old format (full event directly in content)
              else if (parsed.id === eventId) {
                approvedPosts.push(parsed as NostrEvent);
                console.log(`📦 Extracted approved post from approval content (old format): ${eventId.slice(0, 8)}...`);
              }
              else {
                console.warn(`⚠️ Approval content doesn't match event ID: ${eventId.slice(0, 8)}...`);
              }
            } catch (error) {
              console.warn(`⚠️ Failed to parse approval content for ${eventId.slice(0, 8)}...:`, error);
            }

            // Clean up local storage if we have a remote confirmation
            if (localApprovedEvents.has(eventId)) {
              const localKey = `moderation-${communityId}-${eventId}`;
              localStorage.removeItem(localKey);
              localApprovedEvents.delete(eventId);
              console.log(`🧹 Cleaned up local approval for ${eventId.slice(0, 8)}...`);
            }
          }
        });
      });

      console.log(`📝 Found ${approvedPosts.length} approved posts from ${approvals.length} approval events`);

      // Return the approved posts we extracted from approval events
      return approvedPosts
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
        .sort((a, b) => b.event.created_at - a.event.created_at);
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

      // First, get local moderation decisions from localStorage
      const localActions: ModerationAction[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`moderation-${communityId}-`)) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.eventId && data.action && data.moderator && data.timestamp) {
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
          } catch (error) {
            console.warn('⚠️ Failed to parse local moderation data:', key, error);
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
              localStorage.removeItem(localKey);
              console.log(`🧹 Cleaned up local action for ${eTag[1].slice(0, 8)}...`);
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
              localStorage.removeItem(localKey);
              console.log(`🧹 Cleaned up local action for ${eTag[1].slice(0, 8)}...`);
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
