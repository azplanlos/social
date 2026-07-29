import { renderHook, act, waitFor } from '@testing-library/react';
import axios from 'axios';
import { useNotifications } from './useNotifications';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not make API calls when token is null', () => {
    renderHook(() => useNotifications(null));
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('should fetch unread count on mount when token is provided', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { count: 5 } });

    const { result } = renderHook(() => useNotifications('test-token'));

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(5);
    });

    expect(mockedAxios.get).toHaveBeenCalledWith('/notifications/unread-count', {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: 'Bearer test-token',
      },
      withCredentials: true,
    });
  });

  it('should set unreadCount to 0 and set error on fetchUnreadCount failure', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useNotifications('test-token'));

    await waitFor(() => {
      expect(result.current.error).toBe('Fehler beim Laden des Benachrichtigungszählers');
    });
    expect(result.current.unreadCount).toBe(0);
  });

  it('should fetch notifications on demand', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { count: 3 } }); // initial unread count

    const { result } = renderHook(() => useNotifications('test-token'));

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(3);
    });

    const mockNotifications = [
      { id: '1', senderName: 'Max', beitragTitel: 'Test', beitragId: 'b1', createdAt: '2026-01-01T12:00:00Z', read: false },
    ];
    mockedAxios.get.mockResolvedValueOnce({ data: { content: mockNotifications } });

    await act(async () => {
      await result.current.fetchNotifications();
    });

    expect(result.current.notifications).toEqual(mockNotifications);
    expect(result.current.loading).toBe(false);
    expect(mockedAxios.get).toHaveBeenCalledWith('/notifications', {
      params: { page: 0, size: 50 },
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: 'Bearer test-token',
      },
      withCredentials: true,
    });
  });

  it('should keep previous notifications on fetchNotifications error', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { count: 0 } }); // initial unread count

    const { result } = renderHook(() => useNotifications('test-token'));

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    // First successful fetch
    const mockNotifications = [
      { id: '1', senderName: 'Max', beitragTitel: 'Test', beitragId: 'b1', createdAt: '2026-01-01T12:00:00Z', read: false },
    ];
    mockedAxios.get.mockResolvedValueOnce({ data: { content: mockNotifications } });

    await act(async () => {
      await result.current.fetchNotifications();
    });

    expect(result.current.notifications).toEqual(mockNotifications);

    // Second fetch fails — previous data should remain
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      await result.current.fetchNotifications();
    });

    expect(result.current.notifications).toEqual(mockNotifications);
    expect(result.current.error).toBe('Fehler beim Laden der Benachrichtigungen');
  });

  it('should mark all as read and set unreadCount to 0', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { count: 5 } }); // initial unread count

    const { result } = renderHook(() => useNotifications('test-token'));

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(5);
    });

    mockedAxios.post.mockResolvedValueOnce({ status: 200 });

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(result.current.unreadCount).toBe(0);
    expect(mockedAxios.post).toHaveBeenCalledWith('/notifications/read-all', null, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: 'Bearer test-token',
      },
      withCredentials: true,
    });
  });

  it('should keep unreadCount unchanged on markAllAsRead error', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { count: 5 } }); // initial unread count

    const { result } = renderHook(() => useNotifications('test-token'));

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(5);
    });

    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(result.current.unreadCount).toBe(5);
    expect(result.current.error).toBe('Fehler beim Markieren als gelesen');
  });

  it('should set loading to true while fetching notifications', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { count: 0 } }); // initial unread count

    const { result } = renderHook(() => useNotifications('test-token'));

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise(resolve => { resolvePromise = resolve; });
    mockedAxios.get.mockReturnValueOnce(pendingPromise as any);

    act(() => {
      result.current.fetchNotifications();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise!({ data: { content: [] } });
    });

    expect(result.current.loading).toBe(false);
  });
});
