import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEncryptedChat } from '@/hooks/useEncryptedChat';
import { EncryptedChatModal } from './EncryptedChatModal';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface EncryptedChatIconProps {
  className?: string;
}

export function EncryptedChatIcon({ className }: EncryptedChatIconProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount, markAsRead } = useEncryptedChat();
  const { user } = useCurrentUser();

  // Only show if user is logged in
  if (!user) return null;

  const handleOpen = () => {
    setIsOpen(true);
    markAsRead();
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Responsive sizes based on screen size
  const getButtonSize = () => {
    const width = window.innerWidth;
    if (width < 640) { // Mobile
      return 'h-12 w-12'; // 48px
    } else if (width < 1024) { // Tablet
      return 'h-14 w-14'; // 56px
    } else { // Desktop
      return 'h-16 w-16'; // 64px
    }
  };

  const getIconSize = () => {
    const width = window.innerWidth;
    if (width < 640) { // Mobile
      return 20; // 20px
    } else if (width < 1024) { // Tablet
      return 24; // 24px
    } else { // Desktop
      return 28; // 28px
    }
  };

  const [buttonSize, setButtonSize] = useState(getButtonSize());
  const [iconSize, setIconSize] = useState(getIconSize());

  useEffect(() => {
    const handleResize = () => {
      setButtonSize(getButtonSize());
      setIconSize(getIconSize());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <Button
        onClick={handleOpen}
        className={cn(
          // Fixed positioning - positioned above scroll to top
          'fixed bottom-24 right-6 z-50',

          // Responsive sizing
          buttonSize,

          // Smooth transitions
          'transition-all duration-300 ease-in-out',

          // Visual styling - using purple for mystical/spooky theme
          'bg-purple-600 hover:bg-purple-700',
          'text-white hover:text-white',
          'shadow-lg hover:shadow-xl',
          'rounded-full',

          // Border effects
          'border-2 border-purple-400/30 hover:border-purple-400/50',

          // Focus states
          'focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:ring-offset-2',

          // Animation for new messages
          unreadCount > 0 && 'animate-pulse',

          className
        )}
        aria-label="Open encrypted chat"
      >
        <div className="relative">
          <MessageCircle
            className={cn(
              'transition-transform duration-200',
              'hover:scale-110'
            )}
            size={iconSize}
            strokeWidth={3}
          />

          {/* Unread message indicator */}
          {unreadCount > 0 && (
            <div className={cn(
              'absolute -top-1 -right-1',
              'bg-red-500 text-white',
              'rounded-full',
              'flex items-center justify-center',
              'text-xs font-bold',
              'min-w-[18px] h-[18px]',
              'border-2 border-white dark:border-gray-900',
              'animate-bounce'
            )}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </div>
      </Button>

      {/* Chat Modal */}
      <EncryptedChatModal
        isOpen={isOpen}
        onClose={handleClose}
      />
    </>
  );
}