import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { useNotificationState } from '@/hooks/useNotificationState';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';

export function NotificationBell() {
  const { user } = useCurrentUser();
  const { data: notifications } = useNotifications();
  const { getUnreadCount } = useNotificationState();
  const navigate = useNavigate();

  const unreadCount = useMemo(() => {
    if (!notifications || notifications.length === 0) return 0;
    return getUnreadCount(notifications.map(n => n.id));
  }, [notifications, getUnreadCount]);

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
