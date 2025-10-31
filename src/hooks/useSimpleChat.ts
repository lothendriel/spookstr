import { useNostr } from '@nostrify/react';
import { NRelay1 } from '@nostrify/nostrify';
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useCurrentUser } from './useCurrentUser';
import { useCallback, useMemo, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  pubkey: string;
  content: string;
  created_at: number;
  author?: {
    name?: string;
    picture?: string;
    display_name?: string;
  };
}

interface SimpleChatHook {
  messages: ChatMessage[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  sendMessage: (content: string) => Promise<void>;
  unreadCount: number;
  markAsRead: () => void;
}

// Simple chat identifier - this makes our chat unique to Spookstr
const SITE_CHAT_D_TAG = 'spookstr-site-chat-v1';

export function useSimpleChat(): SimpleChatHook {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  // Spookstr relay URL - hardcoded for reliability
  const SPOOKSTR_RELAY = 'wss://spookstr2.nostr1.com';

  // Debug log when hook is called
  console.log('🔧 [Simple Chat] Hook initialized for user:', user?.pubkey?.slice(0, 8));

  // Track last read timestamp per user
  const lastReadRef = useRef<Record<string, number>>({});

  // Get current user's last read time or set to now if not exists
  const getLastReadTime = useCallback(() => {
    if (!user) return Date.now();
    if (!lastReadRef.current[user.pubkey]) {
      lastReadRef.current[user.pubkey] = Date.now();
    }
    return lastReadRef.current[user.pubkey];
  }, [user]);

  // Query for simple chat messages
  const {
    data,
    isLoading,
    isLoadingMore,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['simple-chat', SITE_CHAT_D_TAG],
    queryFn: async ({ pageParam, signal }) => {
      if (!user) {
        console.log('🔒 [Simple Chat] No user logged in');
        return { messages: [], hasMore: false };
      }

      try {
        console.log('📡 [Simple Chat] Querying messages from Spookstr relay...');

        // Create a combined signal with timeout
        const timeoutSignal = AbortSignal.timeout(5000);
        const combinedSignal = AbortSignal.any([signal, timeoutSignal]);

        // Connect directly to Spookstr relay for chat messages
        const spookstrRelay = nostr.relay(SPOOKSTR_RELAY);

        // Query for kind 42 messages with our chat tag
        const events = await spookstrRelay.query([{
          kinds: [42], // Simple chat kind
          '#t': [SITE_CHAT_D_TAG], // Site chat identifier
          limit: 20,
          until: pageParam,
        }], { signal: combinedSignal });

        console.log('📨 [Simple Chat] Found', events.length, 'events');

        // Process messages
        const messages: ChatMessage[] = events.map(event => ({
          id: event.id,
          pubkey: event.pubkey,
          content: event.content,
          created_at: event.created_at,
        }));

        // Remove duplicates and sort in chronological order (oldest first, newest last)
        const uniqueMessages = messages.filter((msg, index, self) =>
          index === self.findIndex(m => m.id === msg.id)
        ).sort((a, b) => a.created_at - b.created_at);

        console.log('✅ [Simple Chat] Processed', uniqueMessages.length, 'unique messages');

        return {
          messages: uniqueMessages,
          hasMore: uniqueMessages.length >= 20,
        };
      } catch (error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          console.warn('⏰ [Simple Chat] Query timed out');
        } else {
          console.error('❌ [Simple Chat] Error fetching chat messages:', error);
        }
        return { messages: [], hasMore: false };
      }
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.messages.length === 0) return undefined;
      return lastPage.messages[lastPage.messages.length - 1].created_at - 1;
    },
    enabled: !!user,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    retry: (failureCount, error) => {
      // Only retry a few times for network errors
      if (failureCount >= 3) return false;
      if (error.name === 'AbortError' || error.name === 'TimeoutError') return true;
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Flatten all pages
  const allMessages = useMemo(() => {
    return data?.pages.flatMap(page => page.messages) || [];
  }, [data]);

  // Calculate unread count
  const unreadCount = useMemo(() => {
    const lastRead = getLastReadTime();
    const unread = allMessages.filter(msg => msg.created_at > lastRead).length;

    // Debug logging for unread count
    console.log('📊 [Simple Chat] Unread count calculation:', {
      userPubkey: user?.pubkey?.slice(0, 8),
      totalMessages: allMessages.length,
      lastRead: new Date(lastRead).toISOString(),
      unreadCount: unread,
      unreadMessages: allMessages.filter(msg => msg.created_at > lastRead).map(msg => ({
        id: msg.id.slice(0, 8),
        created_at: new Date(msg.created_at * 1000).toISOString(),
      }))
    });

    return unread;
  }, [allMessages, getLastReadTime, user?.pubkey]);

  // Mark messages as read
  const markAsRead = useCallback(() => {
    if (user) {
      const now = Date.now();
      lastReadRef.current[user.pubkey] = now;
      console.log('👀 [Simple Chat] Marked messages as read for user:', user.pubkey.slice(0, 8), 'at:', new Date(now).toISOString());
    }
  }, [user]);

  // Send simple message
  const sendMessage = useCallback(async (content: string) => {
    if (!user) throw new Error('User not authenticated');
    if (!content.trim()) throw new Error('Message content cannot be empty');

    try {
      console.log('📝 [Simple Chat] Sending message:', content);

      // Create simple chat message (kind 42)
      const chatMessage = {
        kind: 42,
        content: content.trim(),
        tags: [
          ['t', SITE_CHAT_D_TAG], // Site chat identifier
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      console.log('🔑 [Simple Chat] Signing event...');
      // Sign the event
      const signedEvent = await user.signer.signEvent(chatMessage);
      console.log('✅ [Simple Chat] Event signed successfully:', signedEvent.id);

      // Publish directly to Spookstr relay using a fresh connection
      console.log('🚀 [Simple Chat] Publishing to Spookstr relay:', SPOOKSTR_RELAY);
      const spookstrRelay = new NRelay1(SPOOKSTR_RELAY);
      await spookstrRelay.event(signedEvent, { signal: AbortSignal.timeout(8000) });
      console.log('✅ [Simple Chat] Message published successfully!');

      // Invalidate query to refresh messages
      queryClient.invalidateQueries({ queryKey: ['simple-chat', SITE_CHAT_D_TAG] });
    } catch (error) {
      console.error('❌ [Simple Chat] Error sending simple message:', error);
      throw error;
    }
  }, [user, queryClient]);

  // Auto-mark as read when chat is opened
  useEffect(() => {
    if (allMessages.length > 0) {
      const timer = setTimeout(() => {
        markAsRead();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [allMessages.length, markAsRead]);

  // Initialize last read time when user changes
  useEffect(() => {
    if (user) {
      // Initialize last read time for this user if not already set
      if (!lastReadRef.current[user.pubkey]) {
        const now = Date.now();
        lastReadRef.current[user.pubkey] = now;
        console.log('👤 [Simple Chat] Initialized last read time for new user:', user.pubkey.slice(0, 8), 'at:', new Date(now).toISOString());
      } else {
        console.log('🔄 [Simple Chat] User switched to:', user.pubkey.slice(0, 8), 'existing last read:', new Date(lastReadRef.current[user.pubkey]).toISOString());
      }
    }
  }, [user]);

  const result = {
    messages: allMessages,
    isLoading,
    isLoadingMore,
    hasNextPage,
    fetchNextPage,
    sendMessage,
    unreadCount,
    markAsRead,
  };

  // Debug log when returning values
  console.log('📤 [Simple Chat] Hook returning:', {
    user: user?.pubkey?.slice(0, 8),
    unreadCount: result.unreadCount,
    totalMessages: result.messages.length,
    isLoading: result.isLoading,
  });

  return result;
}