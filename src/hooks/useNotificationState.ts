import { useLocalStorage } from './useLocalStorage';
import { useCurrentUser } from './useCurrentUser';
import { useMemo, useCallback } from 'react';

interface NotificationReadState {
  [notificationId: string]: boolean;
}

export function useNotificationState() {
  const { user } = useCurrentUser();
  const storageKey = user?.pubkey ? `notifications_read_${user.pubkey}` : 'notifications_read_guest';
  
  const [readState, setReadState] = useLocalStorage<NotificationReadState>(storageKey, {});

  const markAsRead = useCallback((notificationId: string) => {
    setReadState(prev => ({
      ...prev,
      [notificationId]: true,
    }));
  }, [setReadState]);

  const markAllAsRead = useCallback((notificationIds: string[]) => {
    setReadState(prev => {
      const newState = { ...prev };
      notificationIds.forEach(id => {
        newState[id] = true;
      });
      return newState;
    });
  }, [setReadState]);

  const isRead = useCallback((notificationId: string): boolean => {
    return readState[notificationId] || false;
  }, [readState]);

  const getUnreadCount = useCallback((notificationIds: string[]): number => {
    return notificationIds.filter(id => !readState[id]).length;
  }, [readState]);

  return {
    markAsRead,
    markAllAsRead,
    isRead,
    getUnreadCount,
  };
}
