import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useNostrPublish } from './useNostrPublish';
import { useCurrentUser } from './useCurrentUser';
import { useCallback, useMemo, useRef, useEffect } from 'react';
import { nip44, type Event, type UnsignedEvent } from 'nostr-tools';

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

interface EncryptedChatHook {
  messages: ChatMessage[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  sendMessage: (content: string) => Promise<void>;
  unreadCount: number;
  markAsRead: () => void;
}

// Site-wide chat identifier - this makes our chat unique to Spookstr
const SITE_CHAT_D_TAG = 'spookstr-site-chat-v1';

export function useEncryptedChat(): EncryptedChatHook {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  // Track last read timestamp
  const lastReadRef = useRef<number>(Date.now());

  // Query for encrypted chat messages
  const {
    data,
    isLoading,
    isLoadingMore,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['encrypted-chat', SITE_CHAT_D_TAG],
    queryFn: async ({ pageParam, signal }) => {
      if (!user) return { messages: [], hasMore: false };

      try {
        // Query for gift-wrapped messages (kind 1059) that are p-tagged to our user
        const events = await nostr.query([{
          kinds: [1059], // Gift wrap
          '#p': [user.pubkey],
          limit: 20,
          until: pageParam,
        }], { signal });

        // Also query for messages we sent (to include in the chat)
        const sentEvents = await nostr.query([{
          kinds: [1059],
          authors: [user.pubkey],
          limit: 10,
          until: pageParam,
        }], { signal });

        const allEvents = [...events, ...sentEvents].sort((a, b) => b.created_at - a.created_at);

        // Decrypt and process messages
        const messages: ChatMessage[] = [];

        for (const event of allEvents) {
          try {
            // Skip if content is empty or not a string
            if (!event.content || typeof event.content !== 'string') continue;

            // Decrypt the gift wrap to get the seal
            let sealContent: string;
            try {
              sealContent = await user.signer.nip44.decrypt(user.pubkey, event.content);
            } catch (decryptError) {
              // Skip messages that can't be decrypted (likely not for us)
              continue;
            }

            // Parse the seal event
            let sealEvent: Event;
            try {
              sealEvent = JSON.parse(sealContent) as Event;
            } catch (parseError) {
              console.warn('Failed to parse seal event:', parseError);
              continue;
            }

            // Verify the seal is from the expected sender
            if (sealEvent.kind !== 13) continue; // Must be a seal

            // Skip if seal content is empty or not a string
            if (!sealEvent.content || typeof sealEvent.content !== 'string') continue;

            // Decrypt the seal content to get the actual chat message
            let chatEventContent: string;
            try {
              chatEventContent = await user.signer.nip44.decrypt(sealEvent.pubkey, sealEvent.content);
            } catch (chatDecryptError) {
              console.warn('Failed to decrypt chat event content:', chatDecryptError);
              continue;
            }

            // Parse the chat event
            let chatEvent: UnsignedEvent;
            try {
              chatEvent = JSON.parse(chatEventContent) as UnsignedEvent;
            } catch (chatParseError) {
              console.warn('Failed to parse chat event:', chatParseError);
              continue;
            }

            // Verify this is our site chat message
            const dTag = chatEvent.tags.find(([name]) => name === 'd')?.[1];
            if (dTag !== SITE_CHAT_D_TAG) continue;

            // Only process kind 14 (chat messages)
            if (chatEvent.kind !== 14) continue;

            // Validate required fields
            if (!chatEvent.content || typeof chatEvent.content !== 'string') continue;
            if (!sealEvent.pubkey) continue;

            messages.push({
              id: event.id,
              pubkey: sealEvent.pubkey, // Original sender
              content: chatEvent.content,
              created_at: event.created_at,
            });
          } catch (error) {
            // Silently skip any messages that don't match our expected format
            // This prevents noise from other kinds of encrypted messages
            continue;
          }
        }

        // Remove duplicates and sort
        const uniqueMessages = messages.filter((msg, index, self) =>
          index === self.findIndex(m => m.id === msg.id)
        ).sort((a, b) => b.created_at - a.created_at);

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

  // Send encrypted message
  const sendMessage = useCallback(async (content: string) => {
    if (!user) throw new Error('User not authenticated');
    if (!content.trim()) throw new Error('Message content cannot be empty');

    try {
      // Validate user has NIP-44 capability
      if (!user.signer.nip44) {
        throw new Error('NIP-44 encryption not available. Please update your Nostr signer.');
      }

      // Create the unsigned chat message
      const chatMessage: UnsignedEvent = {
        kind: 14,
        pubkey: user.pubkey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['d', SITE_CHAT_D_TAG], // Site chat identifier
        ],
        content: content.trim(),
      };

      // Create the seal (kind 13)
      const seal: UnsignedEvent = {
        kind: 13,
        pubkey: user.pubkey,
        created_at: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 172800), // Random time up to 2 days ago
        tags: [],
        content: '', // Will be encrypted below
      };

      // Encrypt the chat message for the seal
      seal.content = await user.signer.nip44.encrypt(user.pubkey, JSON.stringify(chatMessage));

      // Sign the seal
      const signedSeal = await user.signer.signEvent(seal);

      // Create and publish gift wrap (kind 1059)
      const giftWrap: UnsignedEvent = {
        kind: 1059,
        pubkey: user.pubkey, // In production, use a random key
        created_at: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 172800),
        tags: [
          ['p', user.pubkey], // Send to ourselves
        ],
        content: '', // Will be encrypted below
      };

      // Encrypt the seal for the gift wrap
      giftWrap.content = await user.signer.nip44.encrypt(user.pubkey, JSON.stringify(signedSeal));

      await publishEvent({ event: giftWrap });

      // Invalidate query to refresh messages
      queryClient.invalidateQueries({ queryKey: ['encrypted-chat', SITE_CHAT_D_TAG] });
    } catch (error) {
      console.error('Error sending encrypted message:', error);
      throw error;
    }
  }, [user, publishEvent, queryClient]);

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