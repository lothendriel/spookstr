import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useSimpleChat } from '@/hooks/useSimpleChat';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Send, Ghost, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface EncryptedChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessageComponentProps {
  message: {
    id: string;
    pubkey: string;
    content: string;
    created_at: number;
    author?: {
      name?: string;
      picture?: string;
      display_name?: string;
    };
  };
  isOwnMessage: boolean;
}

function ChatMessageComponent({ message, isOwnMessage }: ChatMessageComponentProps) {
  const author = useAuthor(message.pubkey);
  const metadata = author.data?.metadata;

  const displayName = metadata?.display_name || metadata?.name || 'Anonymous';
  const displayPicture = metadata?.picture;
  const timeAgo = formatDistanceToNow(new Date(message.created_at * 1000), {
    addSuffix: true
  });

  return (
    <div className={cn(
      'flex gap-3 mb-4',
      isOwnMessage && 'flex-row-reverse'
    )}>
      <Avatar className={cn(
        'h-8 w-8 flex-shrink-0',
        isOwnMessage && 'order-2'
      )}>
        <AvatarImage src={displayPicture} alt={displayName} />
        <AvatarFallback className={cn(
          'text-xs',
          isOwnMessage ? 'bg-purple-600' : 'bg-gray-600'
        )}>
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className={cn(
        'flex flex-col max-w-[70%]',
        isOwnMessage ? 'items-end' : 'items-start'
      )}>
        <div className={cn(
          'flex items-center gap-2 mb-1',
          isOwnMessage ? 'flex-row-reverse' : ''
        )}>
          <span className={cn(
            'text-xs font-medium',
            isOwnMessage ? 'text-purple-400' : 'text-gray-400'
          )}>
            {displayName}
          </span>
          <span className="text-xs text-gray-500">
            {timeAgo}
          </span>
        </div>

        <Card className={cn(
          'px-3 py-2',
          isOwnMessage
            ? 'bg-purple-600 text-white'
            : 'bg-gray-800 text-gray-100'
        )}>
          <CardContent className="p-0">
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChatMessageSkeleton() {
  return (
    <div className="flex gap-3 mb-4">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-16 w-full max-w-[70%]" />
      </div>
    </div>
  );
}

export function SimpleChatModal({ isOpen, onClose }: EncryptedChatModalProps) {
  const { user } = useCurrentUser();
  const {
    messages,
    isLoading,
    isLoadingMore,
    hasNextPage,
    fetchNextPage,
    sendMessage
  } = useSimpleChat();

  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || isSending || !user) return;

    try {
      setIsSending(true);
      await sendMessage(message.trim());
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    // Load more messages when user scrolls near the top
    if (scrollTop < 100 && hasNextPage && !isLoadingMore) {
      fetchNextPage();
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl h-[80vh] max-h-[600px] p-0 flex flex-col bg-gray-900 border-purple-500/20"
        aria-describedby="chat-description"
      >
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-purple-400">
            <Ghost className="h-5 w-5" />
            Spookstr Site-wide Chat
            <div className="flex items-center gap-1 ml-auto">
              <MessageSquare className="h-4 w-4 text-green-400" />
            </div>
          </DialogTitle>
          <p id="chat-description" className="text-sm text-gray-400 mt-1">
            Simple site-wide chat for Spookstr community members
          </p>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea
            className="flex-1 px-4 py-2"
            ref={scrollAreaRef}
            onScroll={handleScroll}
          >
            {isLoading && messages.length === 0 ? (
              <div className="space-y-4">
                <ChatMessageSkeleton />
                <ChatMessageSkeleton />
                <ChatMessageSkeleton />
              </div>
            ) : (
              <div className="space-y-2">
                {/* Load more indicator */}
                {hasNextPage && (
                  <div className="flex justify-center py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchNextPage()}
                      disabled={isLoadingMore}
                      className="text-purple-400 hover:text-purple-300"
                    >
                      {isLoadingMore ? 'Loading...' : 'Load older messages'}
                    </Button>
                  </div>
                )}

                {/* Messages */}
                {messages.map((msg) => (
                  <ChatMessageComponent
                    key={msg.id}
                    message={msg}
                    isOwnMessage={msg.pubkey === user.pubkey}
                  />
                )).reverse()}

                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your encrypted message..."
                disabled={isSending}
                className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || isSending}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <MessageSquare className="h-3 w-3" />
              <span>Simple site-wide chat</span>
              <span className="ml-auto">
                {messages.length} messages
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}