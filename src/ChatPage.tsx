import React, { useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
  Container,
  CssBaseline,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import AddCommentIcon from '@mui/icons-material/AddComment';
import { useNavigate } from 'react-router';
import { useChat } from './useChat';
import { Conversation } from './datenformat/ChatMessage';
import { Person } from './datenformat/Person';
import { config } from './config';
import axios from 'axios';

export type ChatPageProps = {
  token: string | null;
};

// Liquid Glass Styles (gleich wie ContactListPage)
const glassCardSx = {
  background: 'rgba(255, 255, 255, 0.12)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '20px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
  color: '#fff',
};

const glassButtonSx = {
  background: 'rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
  border: '1px solid rgba(255, 255, 255, 0.25)',
  borderRadius: '50px',
  color: '#fff',
  textTransform: 'none' as const,
  fontWeight: 500,
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
  transition: 'all 0.2s ease',
  '&:hover': {
    background: 'rgba(255, 255, 255, 0.25)',
    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
    transform: 'translateY(-1px)',
  },
};

export default function ChatPage({ token }: ChatPageProps) {
  const navigate = useNavigate();
  const {
    conversations,
    messages,
    loading,
    error,
    activeConversation,
    setActiveConversation,
    fetchMessages,
    sendMessage,
    startConversation,
  } = useChat(token);

  const [messageInput, setMessageInput] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<Person[]>([]);
  const [selectedUser, setSelectedUser] = useState<Person | null>(null);
  const [initialMessage, setInitialMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Benutzer laden für neue Konversation
  useEffect(() => {
    if (token && newChatOpen) {
      axios.get<Person[]>('/users', {
        headers: { 'X-Requested-With': 'XMLHttpRequest', Authorization: 'Bearer ' + token },
        withCredentials: true,
      }).then(res => setAllUsers(res.data)).catch(() => {});
    }
  }, [token, newChatOpen]);

  // Automatisch nach unten scrollen bei neuen Nachrichten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = (conv: Conversation) => {
    setActiveConversation(conv);
    fetchMessages(conv.id);
  };

  const handleSend = () => {
    if (!messageInput.trim() || !activeConversation) return;
    sendMessage(activeConversation.id, messageInput.trim());
    setMessageInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStartConversation = () => {
    if (!selectedUser || !initialMessage.trim()) return;
    startConversation(selectedUser.name, initialMessage.trim());
    setNewChatOpen(false);
    setSelectedUser(null);
    setInitialMessage('');
  };

  const getConversationName = (conv: Conversation) => {
    return conv.participants.map(p => p.name).join(', ');
  };

  const getConversationAvatar = (conv: Conversation) => {
    const other = conv.participants[0];
    return other?.avatarUrl ? config.assetsUrl + '/' + other.avatarUrl : undefined;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Gestern';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('de-DE', { weekday: 'short' });
    }
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  // Nachrichtenansicht
  if (activeConversation) {
    return (
      <>
        <CssBaseline />
        <Container maxWidth="sm" sx={{ mt: 4, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
            <IconButton
              onClick={() => setActiveConversation(null)}
              sx={{ color: '#fff' }}
              aria-label="Zurück zur Übersicht"
            >
              <ArrowBackIcon />
            </IconButton>
            <Avatar
              src={getConversationAvatar(activeConversation)}
              sx={{ width: 40, height: 40 }}
            >
              {getConversationName(activeConversation).charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="h6" sx={{ color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
              {getConversationName(activeConversation)}
            </Typography>
          </Box>

          {/* Nachrichten */}
          <Box
            sx={{
              ...glassCardSx,
              flex: 1,
              overflow: 'auto',
              p: 2,
              mb: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {loading && messages.length === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress sx={{ color: 'rgba(255,255,255,0.7)' }} />
              </Box>
            )}
            {messages.map((msg) => {
              const isOwn = msg.senderName !== getConversationName(activeConversation);
              return (
                <Box
                  key={msg.id}
                  sx={{
                    display: 'flex',
                    justifyContent: isOwn ? 'flex-end' : 'flex-start',
                    mb: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '75%',
                      p: 1.5,
                      borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isOwn
                        ? 'rgba(100, 150, 255, 0.3)'
                        : 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    {!isOwn && (
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mb: 0.5 }}>
                        {msg.senderName}
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ color: '#fff', wordBreak: 'break-word' }}>
                      {msg.content}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mt: 0.5, textAlign: 'right' }}>
                      {formatTime(msg.timestamp)}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
            <div ref={messagesEndRef} />
          </Box>

          {/* Eingabefeld */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Nachricht schreiben..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              multiline
              maxRows={4}
              sx={{
                '& .MuiOutlinedInput-root': {
                  ...glassCardSx,
                  borderRadius: '16px',
                  '& fieldset': { border: 'none' },
                },
                '& .MuiInputBase-input': { color: '#fff' },
                '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.5)' },
              }}
            />
            <IconButton
              onClick={handleSend}
              disabled={!messageInput.trim()}
              sx={{
                ...glassButtonSx,
                width: 48,
                height: 48,
                alignSelf: 'flex-end',
              }}
              aria-label="Nachricht senden"
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Container>
      </>
    );
  }

  // Konversationsliste
  return (
    <>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/secure')}
            sx={{ ...glassButtonSx, px: 3, py: 1 }}
          >
            Zurück
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            startIcon={<AddCommentIcon />}
            onClick={() => setNewChatOpen(true)}
            sx={{ ...glassButtonSx, px: 3, py: 1 }}
          >
            Neuer Chat
          </Button>
        </Box>

        <Box sx={{ ...glassCardSx, p: 2 }}>
          <Typography variant="h5" sx={{ color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.3)', mb: 2 }}>
            Chat
          </Typography>
          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.2)', mb: 1 }} />

          {loading && conversations.length === 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: 'rgba(255,255,255,0.7)' }} />
            </Box>
          )}

          {!loading && conversations.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ChatBubbleOutlineIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)', mb: 1 }} />
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                Noch keine Chats vorhanden. Starte einen neuen Chat!
              </Typography>
            </Box>
          )}

          {error && (
            <Typography variant="body2" sx={{ color: '#ff6b6b', mb: 1 }}>
              {error}
            </Typography>
          )}

          <List disablePadding>
            {conversations.map((conv) => (
              <ListItem key={conv.id} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleSelectConversation(conv)}
                  sx={{
                    borderRadius: '12px',
                    transition: 'all 0.2s ease',
                    '&:hover': { background: 'rgba(255, 255, 255, 0.1)' },
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={conv.unreadCount}
                      color="error"
                      invisible={conv.unreadCount === 0}
                    >
                      <Avatar src={getConversationAvatar(conv)}>
                        {getConversationName(conv).charAt(0).toUpperCase()}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={getConversationName(conv)}
                    secondary={conv.lastMessage?.content || 'Keine Nachrichten'}
                    slotProps={{
                      primary: { sx: { color: '#fff', fontWeight: conv.unreadCount > 0 ? 700 : 400 } },
                      secondary: {
                        sx: {
                          color: 'rgba(255,255,255,0.6)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        },
                      },
                    }}
                  />
                  {conv.lastMessage && (
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', ml: 1, whiteSpace: 'nowrap' }}>
                      {formatTime(conv.lastMessage.timestamp)}
                    </Typography>
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Neuer Chat Dialog */}
        <Dialog
          open={newChatOpen}
          onClose={() => setNewChatOpen(false)}
          fullWidth
          maxWidth="sm"
          slotProps={{
            paper: {
              sx: {
                background: 'rgba(30, 30, 60, 0.85)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '20px',
                boxShadow: '0 16px 64px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                color: '#fff',
              },
            },
          }}
        >
          <DialogTitle sx={{ color: '#fff' }}>Neuen Chat starten</DialogTitle>
          <DialogContent>
            <Autocomplete
              options={allUsers}
              getOptionLabel={(option) => option.name}
              value={selectedUser}
              onChange={(_, newValue) => setSelectedUser(newValue)}
              renderOption={({ key, ...props }, option) => (
                <li {...props} key={key}>
                  <ListItemAvatar>
                    <Avatar
                      src={option.avatar_url ? config.assetsUrl + '/' + option.avatar_url : undefined}
                      sx={{ width: 32, height: 32 }}
                    >
                      {option.name?.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={option.name} />
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  label="Empfänger"
                  margin="dense"
                  sx={{
                    '& .MuiInput-underline:before': { borderBottomColor: 'rgba(255,255,255,0.3)' },
                    '& .MuiInput-underline:hover:before': { borderBottomColor: 'rgba(255,255,255,0.5)' },
                    '& .MuiInput-underline:after': { borderBottomColor: '#fff' },
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
                    '& .MuiInputBase-input': { color: '#fff' },
                  }}
                />
              )}
              sx={{ mt: 1 }}
            />
            <TextField
              fullWidth
              variant="standard"
              label="Nachricht"
              margin="dense"
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              multiline
              maxRows={4}
              sx={{
                mt: 2,
                '& .MuiInput-underline:before': { borderBottomColor: 'rgba(255,255,255,0.3)' },
                '& .MuiInput-underline:hover:before': { borderBottomColor: 'rgba(255,255,255,0.5)' },
                '& .MuiInput-underline:after': { borderBottomColor: '#fff' },
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
                '& .MuiInputBase-input': { color: '#fff' },
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setNewChatOpen(false)} sx={{ ...glassButtonSx, px: 3 }}>
              Abbrechen
            </Button>
            <Button
              onClick={handleStartConversation}
              disabled={!selectedUser || !initialMessage.trim()}
              sx={{ ...glassButtonSx, px: 3 }}
            >
              Senden
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}
