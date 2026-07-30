import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import Popover from '@mui/material/Popover';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import { useNotifications } from './useNotifications';
import { Notification } from './datenformat/Notification';

/**
 * Truncates text to maxLength characters, appending "…" if truncated.
 */
export function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

/**
 * Formats an ISO-8601 UTC timestamp to local timezone in the format "TT.MM.JJJJ, HH:MM Uhr".
 * Returns "—" for invalid or missing timestamps.
 */
export function formatTimestamp(value: string | null | undefined): string {
  if (value == null || value === '') return '—';

  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';

  try {
    const formatter = new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    const parts = formatter.formatToParts(date);
    const day = parts.find(p => p.type === 'day')?.value ?? '00';
    const month = parts.find(p => p.type === 'month')?.value ?? '00';
    const year = parts.find(p => p.type === 'year')?.value ?? '0000';
    const hour = parts.find(p => p.type === 'hour')?.value ?? '00';
    const minute = parts.find(p => p.type === 'minute')?.value ?? '00';

    return `${day}.${month}.${year}, ${hour}:${minute} Uhr`;
  } catch {
    return '—';
  }
}

export interface NotificationPanelProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  token: string | null;
}

function NotificationPanel(props: NotificationPanelProps) {
  const { anchorEl, open, onClose, token } = props;
  const { notifications, loading, error, fetchNotifications, markAllAsRead } =
    useNotifications(token);
  const navigate = useNavigate();

  // When panel opens: fetch notifications and mark all as read
  useEffect(() => {
    if (open) {
      fetchNotifications().then(() => {
        markAllAsRead();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            width: { xs: 'calc(100vw - 32px)', sm: 380 },
            maxWidth: 380,
            maxHeight: '70vh',
            overflow: 'auto',
            background: 'rgba(30, 30, 60, 0.85)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            boxShadow:
              '0 16px 64px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            color: '#fff',
          },
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
          Benachrichtigungen
        </Typography>

        {/* Loading state */}
        {loading && notifications.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} sx={{ color: 'rgba(255,255,255,0.7)' }} />
          </Box>
        )}

        {/* Error state */}
        {error && (
          <Box
            sx={{
              background: 'rgba(244, 67, 54, 0.15)',
              border: '1px solid rgba(244, 67, 54, 0.3)',
              borderRadius: '8px',
              p: 1.5,
              mb: 1,
            }}
          >
            <Typography variant="body2" sx={{ color: '#ff8a80' }}>
              {error}
            </Typography>
          </Box>
        )}

        {/* Empty state */}
        {!loading && !error && notifications.length === 0 && (
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', py: 4 }}
          >
            Keine Benachrichtigungen vorhanden
          </Typography>
        )}

        {/* Notification list */}
        {notifications.map((notification: Notification) => (
          <Box
            key={notification.id}
            onClick={() => {
              if (notification.type === 'chat' && notification.conversationId) {
                onClose();
                navigate('/chat');
              }
            }}
            sx={{
              p: 1.5,
              mb: 1,
              borderRadius: '10px',
              cursor: notification.type === 'chat' ? 'pointer' : 'default',
              background: notification.read
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(100, 181, 246, 0.15)',
              border: notification.read
                ? '1px solid rgba(255, 255, 255, 0.08)'
                : '1px solid rgba(100, 181, 246, 0.3)',
              transition: 'background 0.2s ease',
              '&:hover': notification.type === 'chat' ? {
                background: 'rgba(100, 181, 246, 0.25)',
              } : {},
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
              {notification.type === 'chat' && (
                <ChatBubbleOutlineIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }} />
              )}
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600 }}
              >
                {truncateText(notification.senderName, 50)}
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{ color: 'rgba(255,255,255,0.8)', mb: 0.5 }}
            >
              {notification.type === 'chat'
                ? truncateText(notification.messagePreview, 100)
                : truncateText(notification.beitragTitel, 100)}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255,255,255,0.5)' }}
            >
              {formatTimestamp(notification.createdAt)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Popover>
  );
}

export default NotificationPanel;
