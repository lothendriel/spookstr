import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSimpleChat } from '@/hooks/useSimpleChat';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUploadFile } from '@/hooks/useUploadFile';
import { MentionTextarea } from '@/components/ui/mention-textarea';
import { MediaDisplay } from '@/components/MediaDisplay';
import { Send, Ghost, MessageSquare, Shield, AlertTriangle, Clock, Paperclip, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { MediaItem } from '@/lib/mediaParser';

interface SimpleChatProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessageComponentProps {
  message: {
    id: string;
    pubkey: string;
    content: string;
    created_at: number;
    mediaTags?: string[][];
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
          <CardContent className="p-0 space-y-2">
            {message.content && (
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}

            {/* Media attachments */}
            {message.mediaTags && message.mediaTags.length > 0 && (
              <div className="space-y-2">
                {(() => {
                  console.log('🖼️ [Simple Chat] Processing media tags for message:', message.id, message.mediaTags);
                  const urlTags = message.mediaTags.filter(tag => tag[0] === 'url');
                  console.log('🔗 [Simple Chat] Found URL tags:', urlTags);

                  return urlTags.map((urlTag, index) => {
                    const mediaUrl = urlTag[1];
                    console.log('🎯 [Simple Chat] Processing URL:', mediaUrl);

                    // Find corresponding imeta tag for this URL
                    const imetaTag = message.mediaTags?.find(tag =>
                      tag[0] === 'imeta' &&
                      tag.some(item => item.startsWith(`url ${mediaUrl}`))
                    );
                    console.log('🏷️ [Simple Chat] Found imeta tag for URL:', imetaTag);

                    // Extract media type from imeta tag
                    let mediaType = 'image'; // Default to image
                    if (imetaTag) {
                      const typeItem = imetaTag.find(item => item.startsWith('m '));
                      if (typeItem) {
                        mediaType = typeItem.substring(2); // Remove 'm ' prefix
                        console.log('📁 [Simple Chat] Detected media type:', mediaType);
                      }
                    }

                    // Create MediaItem object for MediaDisplay
                    const mediaItem: MediaItem = {
                      url: mediaUrl,
                      type: mediaType.startsWith('video/') ? 'video' :
                             mediaType.startsWith('audio/') ? 'audio' :
                             mediaType.startsWith('image/') ? 'image' : 'image',
                      metadata: {
                        format: mediaType.split('/')[1] || 'jpg',
                        cdnProvider: 'blossom',
                      },
                    };

                    return (
                      <div key={index} className="rounded-md overflow-hidden max-w-sm">
                        <MediaDisplay
                          media={mediaItem}
                          className="max-h-64 w-full object-contain"
                        />
                      </div>
                    );
                  });
                })()}
              </div>
            )}
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

export function SimpleChat({ isOpen, onClose }: SimpleChatProps) {
  const { user } = useCurrentUser();
  const currentUserAuthor = useAuthor(user?.pubkey);
  const {
    messages,
    isLoading,
    isLoadingMore,
    hasNextPage,
    fetchNextPage,
    sendMessage,
    canSendMessage,
    getTimeUntilNextMessage
  } = useSimpleChat();

  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [timeUntilNextMessage, setTimeUntilNextMessage] = useState(0);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaTags, setMediaTags] = useState<string[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();

  // Check if current user is NIP-05 verified
  const isNip05Verified = currentUserAuthor.data?.metadata?.nip05;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Update rate limiting countdown
  useEffect(() => {
    const updateCountdown = () => {
      setTimeUntilNextMessage(getTimeUntilNextMessage());
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [getTimeUntilNextMessage]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setMediaFiles(prev => [...prev, ...files]);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeMediaFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaTags(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if ((!message.trim() && mediaFiles.length === 0) || isSending || !user) return;

    try {
      setIsSending(true);

      // Upload media files if any
      let finalMediaTags = [...mediaTags];
      if (mediaFiles.length > 0) {
        console.log('📤 [Simple Chat] Uploading', mediaFiles.length, 'files:', mediaFiles.map(f => f.name));
        const uploadPromises = mediaFiles.map(file => uploadFile(file));
        const uploadedTags = await Promise.all(uploadPromises);
        console.log('✅ [Simple Chat] Upload complete, received tags:', uploadedTags);
        finalMediaTags = [...finalMediaTags, ...uploadedTags.flat()];
        console.log('🏷️ [Simple Chat] Final media tags:', finalMediaTags);
      }

      await sendMessage(message.trim(), finalMediaTags);
      setMessage('');
      setMediaFiles([]);
      setMediaTags([]);
    } catch (error) {
      // Rate limiting errors are handled by the disabled state and countdown
      console.error('❌ [Simple Chat] Failed to send message:', error);
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

        {/* NIP-05 Verification Disclaimer */}
        <div className="px-4 pb-3">
          <Alert className={`border ${isNip05Verified ? 'border-green-500/30 bg-green-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
            <Shield className={`h-4 w-4 ${isNip05Verified ? 'text-green-400' : 'text-amber-400'}`} />
            <AlertDescription className="text-xs">
              {isNip05Verified ? (
                <span className="text-green-300">
                  ✅ NIP-05 verified: You have access to site-wide chat
                </span>
              ) : (
                <span className="text-amber-300">
                  ⚠️ NIP-05 verification required: Please verify your NIP-05 identity to use the site-wide chat
                </span>
              )}
            </AlertDescription>
          </Alert>
        </div>

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

                {/* Messages - oldest to newest (newest at bottom) */}
                {messages.map((msg) => (
                  <ChatMessageComponent
                    key={msg.id}
                    message={msg}
                    isOwnMessage={msg.pubkey === user.pubkey}
                  />
                ))}

                {/* Scroll anchor - this keeps us scrolled to the bottom */}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-800">
            {!isNip05Verified ? (
              <div className="text-center py-4">
                <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                <p className="text-sm text-amber-300 mb-2">
                  NIP-05 verification required to chat
                </p>
                <p className="text-xs text-gray-400">
                  Please verify your identity with a NIP-05 address in your profile settings
                </p>
              </div>
            ) : (
              <>
                {/* Media file previews */}
                {mediaFiles.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {mediaFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-800 rounded-md">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-300 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMediaFile(index)}
                          disabled={isUploading}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Message input with emoji support */}
                <div className="space-y-3">
                  <MentionTextarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={isSending || !canSendMessage() || isUploading}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 min-h-[80px]"
                    showEmojiPicker={true}
                  />

                  {/* Action buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Media upload button */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,audio/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSending || !canSendMessage() || isUploading}
                        className="text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                      >
                        <Paperclip className="h-4 w-4" />
                        <span className="sr-only">Attach media</span>
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Send button */}
                      <Button
                        onClick={handleSendMessage}
                        disabled={(!message.trim() && mediaFiles.length === 0) || isSending || !canSendMessage() || isUploading}
                        className="bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-600"
                      >
                        <Send className="h-4 w-4" />
                        {isUploading ? 'Uploading...' : 'Send'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Status indicators */}
                <div className="flex items-center justify-between mt-2 text-xs">
                  <div className="flex items-center gap-2 text-gray-500">
                    <MessageSquare className="h-3 w-3" />
                    <span>Simple site-wide chat</span>
                    <span className="ml-auto">
                      {messages.length} messages
                    </span>
                  </div>

                  {timeUntilNextMessage > 0 && (
                    <div className="flex items-center gap-1 text-amber-400">
                      <Clock className="h-3 w-3" />
                      <span>
                        Slow mode: {Math.ceil(timeUntilNextMessage / 1000)}s
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
