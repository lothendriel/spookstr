import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSimpleChat } from '@/hooks/useSimpleChat';
import { SimpleChatModal } from './EncryptedChatModal';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface EncryptedChatIconProps {
  className?: string;
}

export function SimpleChatIcon({ className }: EncryptedChatIconProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount, markAsRead } = useSimpleChat();
  const { user } = useCurrentUser();

  // Responsive sizes based on screen size
  const getButtonSize = (width: number) => {
    if (width < 640) { // Mobile
      return 'h-12 w-12'; // 48px
    } else if (width < 1024) { // Tablet
      return 'h-14 w-14'; // 56px
    } else { // Desktop
      return 'h-16 w-16'; // 64px
    }
  };

  const getIconSize = (width: number) => {
    if (width < 640) { // Mobile
      return 20; // 20px
    } else if (width < 1024) { // Tablet
      return 24; // 24px
    } else { // Desktop
      return 28; // 28px
    }
  };

  const [buttonSize, setButtonSize] = useState(() => getButtonSize(typeof window !== 'undefined' ? window.innerWidth : 1024));
  const [iconSize, setIconSize] = useState(() => getIconSize(typeof window !== 'undefined' ? window.innerWidth : 1024));

  useEffect(() => {
    const handleResize = () => {
      setButtonSize(getButtonSize(window.innerWidth));
      setIconSize(getIconSize(window.innerWidth));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Only show if user is logged in
  if (!user) return null;

  const handleOpen = () => {
    setIsOpen(true);
    markAsRead();
  };

  const handleClose = () => {
    setIsOpen(false);
  };

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
        aria-label="Open site-wide chat"
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
      <SimpleChatModal
        isOpen={isOpen}
        onClose={handleClose}
      />
    </>
  );
}