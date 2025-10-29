import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { useNotificationState } from '@/hooks/useNotificationState';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';

export function NotificationBell() {
  const { user } = useCurrentUser();
  const { data } = useNotifications();
  const { getUnreadCount } = useNotificationState();
  const navigate = useNavigate();

  // Enable real-time notifications updates
  useRealtimeNotifications();

  // Flatten all pages of notifications
  const allNotifications = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.notifications);
  }, [data]);

  const unreadCount = useMemo(() => {
    if (allNotifications.length === 0) return 0;
    return getUnreadCount(allNotifications.map(n => n.id));
  }, [allNotifications, getUnreadCount]);

  if (!user) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative text-lime-400 hover:text-lime-300 hover:bg-lime-500/10"
      onClick={() => navigate('/notifications')}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge
          className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 px-1 bg-orange-500 text-white border-2 border-black text-xs"
          variant="destructive"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
}
