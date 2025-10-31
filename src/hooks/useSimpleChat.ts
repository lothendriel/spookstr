import { useNostr } from '@nostrify/react';
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

  // Track last read timestamp
  const lastReadRef = useRef<number>(Date.now());

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
      if (!user) return { messages: [], hasMore: false };

      try {
        // Query for kind 42 messages with our chat tag
        const events = await nostr.query([{
          kinds: [42], // Simple chat kind
          '#t': [SITE_CHAT_D_TAG], // Site chat identifier
          limit: 20,
          until: pageParam,
        }], { signal });

        // Process messages
        const messages: ChatMessage[] = events.map(event => ({
          id: event.id,
          pubkey: event.pubkey,
          content: event.content,
          created_at: event.created_at,
        }));

        // Remove duplicates and sort in chronological order (oldest first)
        const uniqueMessages = messages.filter((msg, index, self) =>
          index === self.findIndex(m => m.id === msg.id)
        ).sort((a, b) => a.created_at - b.created_at);

        return {
          messages: uniqueMessages,
          hasMore: uniqueMessages.length >= 20,
        };
      } catch (error) {
        console.error('Error fetching chat messages:', error);
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
  });

  // Flatten all pages
  const allMessages = useMemo(() => {
    return data?.pages.flatMap(page => page.messages) || [];
  }, [data]);

  // Calculate unread count
  const unreadCount = useMemo(() => {
    return allMessages.filter(msg => msg.created_at > lastReadRef.current).length;
  }, [allMessages]);

  // Mark messages as read
  const markAsRead = useCallback(() => {
    lastReadRef.current = Date.now();
  }, []);

  // Send simple message
  const sendMessage = useCallback(async (content: string) => {
    if (!user) throw new Error('User not authenticated');
    if (!content.trim()) throw new Error('Message content cannot be empty');

    try {
      // Create simple chat message (kind 42)
      const chatMessage = {
        kind: 42,
        pubkey: user.pubkey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['t', SITE_CHAT_D_TAG], // Site chat identifier
        ],
        content: content.trim(),
      };

      // Sign and publish event
      const signedEvent = await user.signer.signEvent(chatMessage);
      await nostr.event(signedEvent);

      // Invalidate query to refresh messages
      queryClient.invalidateQueries({ queryKey: ['simple-chat', SITE_CHAT_D_TAG] });
    } catch (error) {
      console.error('Error sending simple message:', error);
      throw error;
    }
  }, [user, nostr, queryClient]);

  // Auto-mark as read when chat is opened
  useEffect(() => {
    if (allMessages.length > 0) {
      const timer = setTimeout(() => {
        markAsRead();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [allMessages.length, markAsRead]);

  return {
    messages: allMessages,
    isLoading,
    isLoadingMore,
    hasNextPage,
    fetchNextPage,
    sendMessage,
    unreadCount,
    markAsRead,
  };
}