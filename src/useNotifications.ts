import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Notification } from './datenformat/Notification';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotifications(token: string | null): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useCallback(() => ({
    'X-Requested-With': 'XMLHttpRequest',
    Authorization: 'Bearer ' + token,
  }), [token]);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get<{ count: number }>('/notifications/unread-count', {
        headers: authHeaders(),
        withCredentials: true,
      });
      setUnreadCount(response.data.count);
      setError(null);
    } catch (err) {
      // On error: set unreadCount to 0 (badge hidden) per Requirement 4.6
      setUnreadCount(0);
      setError('Fehler beim Laden des Benachrichtigungszählers');
    }
  }, [token, authHeaders]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await axios.get<{ content: Notification[] }>('/notifications', {
        params: { page: 0, size: 50 },
        headers: authHeaders(),
        withCredentials: true,
      });
      setNotifications(response.data.content);
      setError(null);
    } catch (err) {
      // On error: keep previous data, set error state (Requirement 5.7)
      setError('Fehler beim Laden der Benachrichtigungen');
    } finally {
      setLoading(false);
    }
  }, [token, authHeaders]);

  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    try {
      await axios.post('/notifications/read-all', null, {
        headers: authHeaders(),
        withCredentials: true,
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setError(null);
    } catch (err) {
      // On error: keep previous data, set error state
      setError('Fehler beim Markieren als gelesen');
    }
  }, [token, authHeaders]);

  // Fetch unread count on mount when token is available
  useEffect(() => {
    if (token) {
      fetchUnreadCount();
    }
  }, [token, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAllAsRead,
  };
}
