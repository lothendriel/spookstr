import { useSeoMeta } from '@unhead/react';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import { useNotifications } from '@/hooks/useNotifications';
import { useNotificationState } from '@/hooks/useNotificationState';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayName } from '@/lib/getDisplayName';
import { formatDistanceToNow } from 'date-fns';
import { Heart, Repeat, Zap as ZapIcon, MessageCircle, Ghost, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { nip19 } from 'nostr-tools';
import { LoginArea } from '@/components/auth/LoginArea';

interface NotificationItemProps {
  notification: {
    id: string;
    type: 'like' | 'repost' | 'zap' | 'comment';
    event: any;
    timestamp: number;
    author: string;
    targetEventId: string;
  };
  isRead: boolean;
  onMarkAsRead: () => void;
  onClick: () => void;
}

function NotificationItem({ notification, isRead, onMarkAsRead, onClick }: NotificationItemProps) {
  const author = useAuthor(notification.author);
  const metadata = author.data?.metadata;
  const displayName = getDisplayName(metadata, notification.author);
  const timeAgo = formatDistanceToNow(new Date(notification.timestamp * 1000), { addSuffix: true });

  const handleMouseEnter = () => {
    // Mark as read when user hovers over the notification
    if (!isRead) {
      onMarkAsRead();
    }
  };

  const handleClick = () => {
    // Mark as read when clicked (in case they didn't hover)
    if (!isRead) {
      onMarkAsRead();
    }
    onClick();
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'like':
        return <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />;
      case 'repost':
        return <Repeat className="h-5 w-5 text-green-500" />;
      case 'zap':
        return <ZapIcon className="h-5 w-5 text-yellow-500 fill-yellow-500" />;
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getMessage = () => {
    switch (notification.type) {
      case 'like':
        return 'liked your post';
      case 'repost':
        return 'reposted your post';
      case 'zap':
        const zapAmount = notification.event.tags.find((tag: string[]) => tag[0] === 'amount')?.[1];
        const sats = zapAmount ? Math.floor(parseInt(zapAmount) / 1000) : 0;
        return `zapped your post${sats > 0 ? ` with ${sats.toLocaleString()} sats` : ''}`;
      case 'comment':
        return 'commented on your post';
      default:
        return 'interacted with your post';
    }
  };

  const getPreviewContent = () => {
    if (notification.type === 'comment' && notification.event.content) {
      return notification.event.content.substring(0, 100) + (notification.event.content.length > 100 ? '...' : '');
    }
    return null;
  };

  return (
    <Card
      className={`border-lime-500/20 hover:border-lime-500/40 transition-all duration-200 cursor-pointer bg-black/40 backdrop-blur-sm ${
        !isRead ? 'border-l-4 border-l-orange-500' : ''
      }`}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0 pt-1">
            {getIcon()}
          </div>

          {/* Author Avatar */}
          <Avatar className="h-10 w-10 border-2 border-lime-500/30 flex-shrink-0">
            <AvatarImage src={metadata?.picture} alt={displayName} />
            <AvatarFallback className="bg-lime-500/20 text-lime-400">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-lime-400 truncate">{displayName}</span>
                <span className="text-lime-500/60 text-sm">{getMessage()}</span>
              </div>
              {!isRead && (
                <Badge className="bg-orange-500 text-white flex-shrink-0">New</Badge>
              )}
            </div>
            <div className="text-xs text-lime-500/60 mt-1">{timeAgo}</div>

            {/* Preview content for comments */}
            {getPreviewContent() && (
              <div className="mt-2 text-sm text-lime-100/80 bg-lime-500/5 p-2 rounded border border-lime-500/10">
                "{getPreviewContent()}"
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Notifications() {
  useSeoMeta({
    title: 'Notifications - Spookstr',
    description: 'View your notifications on Spookstr - Paranormal Nostr Network',
  });

  const { user } = useCurrentUser();
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useNotifications();
  const { isRead, markAsRead, markAllAsRead } = useNotificationState();
  const navigate = useNavigate();

  // Enable real-time notifications updates
  useRealtimeNotifications();

  // Flatten all pages of notifications
  const allNotifications = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.notifications);
  }, [data]);

  const notificationsWithReadState = useMemo(() => {
    return allNotifications.map(n => ({
      ...n,
      read: isRead(n.id),
    }));
  }, [allNotifications, isRead]);

  const unreadCount = useMemo(() => {
    return notificationsWithReadState.filter(n => !n.read).length;
  }, [notificationsWithReadState]);

  const handleNotificationClick = (notification: NotificationItemProps['notification']) => {
    // Navigate to the post (marking as read is handled by NotificationItem)
    const nevent = nip19.neventEncode({
      id: notification.targetEventId,
    });
    navigate(`/${nevent}`);
  };

  const handleMarkAllAsRead = () => {
    if (allNotifications.length > 0) {
      markAllAsRead(allNotifications.map(n => n.id));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen">
        <SpookstrHeader />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <Ghost className="h-16 w-16 text-lime-500/40 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-lime-400 mb-4">
                Login Required
              </h2>
              <p className="text-lime-500/60 mb-6">
                You must be logged in to view notifications
              </p>
              <LoginArea className="max-w-60 mx-auto" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SpookstrHeader />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-lime-400">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                variant="outline"
                size="sm"
                className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all as read
              </Button>
            )}
          </div>
          <p className="text-lime-500/60">
            Stay updated with all interactions on your posts
          </p>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="border-lime-500/20 bg-black/40">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && notificationsWithReadState.length === 0 && (
          <Card className="border-dashed border-lime-500/20 bg-black/20">
            <CardContent className="p-12 text-center">
              <Ghost className="h-16 w-16 text-lime-500/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-lime-400 mb-2">
                No Notifications Yet
              </h3>
              <p className="text-lime-500/60">
                When people interact with your posts, you'll see notifications here
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && notificationsWithReadState.length > 0 && (
          <>
            <div className="space-y-3">
              {notificationsWithReadState.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  isRead={notification.read}
                  onMarkAsRead={() => markAsRead(notification.id)}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasNextPage && (
              <div className="mt-6 text-center">
                <Button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  variant="outline"
                  className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Ghost className="h-4 w-4 mr-2 animate-pulse" />
                      Loading more...
                    </>
                  ) : (
                    'Load More Notifications'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
