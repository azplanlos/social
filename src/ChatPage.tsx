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
import DoneAllIcon from '@mui/icons-material/DoneAll';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CloseIcon from '@mui/icons-material/Close';
import MicIcon from '@mui/icons-material/Mic';
import { useNavigate } from 'react-router';
import { useChat } from './useChat';
import { Conversation } from './datenformat/ChatMessage';
import { Person } from './datenformat/Person';
import { config } from './config';
import axios from 'axios';
import VoiceRecorder from './VoiceRecorder';
import AudioPlayer from './AudioPlayer';

export type ChatPageProps = {
  token: string | null;
};

// WhatsApp-lite Farben (aus src/constants/colors.ts)
const WA_BLUE = '#3498db';
const WA_LIGHT_GRAY = '#dbc3c7';
const WA_EXTRA_LIGHT_GREY = '#ededed';
const WA_ALMOST_WHITE = '#f4f8f7';
const WA_GRAY = '#7f8c8d';
const WA_TEXT_COLOR = '#1c1e21';
const WA_PRIMARY = '#32d4ae';
const WA_RED = '#e74c3c';
const WA_BEIGE = '#FEF5C3';
const WA_BUBBLE_OWN = '#E7FED6';
const WA_BUBBLE_OTHER = '#ffffff';
const WA_BUBBLE_BORDER = '#E2DACC';
const WA_BG_CHAT = '#f0ebe3';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if ((!messageInput.trim() && !selectedFile) || !activeConversation) return;
    sendMessage(activeConversation.id, messageInput.trim(), selectedFile || undefined);
    setMessageInput('');
    setSelectedFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
    // Input zurücksetzen damit gleiche Datei erneut gewählt werden kann
    e.target.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceSend = (audioFile: File, durationSeconds: number) => {
    if (!activeConversation) return;
    sendMessage(activeConversation.id, '', audioFile, durationSeconds);
    setVoiceMode(false);
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

  // Nachrichtenansicht (WhatsApp-lite Style)
  if (activeConversation) {
    return (
      <>
        <CssBaseline />
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: WA_BG_CHAT,
          }}
        >
          {/* Header - schlicht wie whatsApp-lite */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 1.5,
              py: 1,
              gap: 1.5,
              flexShrink: 0,
              bgcolor: '#fff',
              borderBottom: `1px solid ${WA_EXTRA_LIGHT_GREY}`,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <IconButton
              onClick={() => setActiveConversation(null)}
              sx={{ color: WA_BLUE }}
              aria-label="Zurück zur Übersicht"
              size="small"
            >
              <ArrowBackIcon />
            </IconButton>
            <Avatar
              src={getConversationAvatar(activeConversation)}
              sx={{ width: 40, height: 40 }}
            >
              {getConversationName(activeConversation).charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ color: WA_TEXT_COLOR, fontWeight: 600, lineHeight: 1.2 }}>
                {getConversationName(activeConversation)}
              </Typography>
            </Box>
          </Box>

          {/* Chat-Bereich mit hellem Hintergrund-Pattern (wie BG.png im Repo) */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              px: 1.5,
              py: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
              minHeight: 0,
              bgcolor: WA_BG_CHAT,
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d4cfc6' fill-opacity='0.2'%3E%3Ccircle cx='20' cy='20' r='1.5'/%3E%3Ccircle cx='60' cy='40' r='1'/%3E%3Ccircle cx='80' cy='80' r='1.5'/%3E%3Ccircle cx='40' cy='70' r='1'/%3E%3Ccircle cx='10' cy='60' r='0.8'/%3E%3Ccircle cx='90' cy='20' r='1'/%3E%3Ccircle cx='50' cy='10' r='0.8'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          >
            {loading && messages.length === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress sx={{ color: WA_PRIMARY }} />
              </Box>
            )}

            {/* System-Nachricht wenn Chat neu */}
            {!loading && messages.length === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Box sx={{
                  bgcolor: WA_BEIGE,
                  borderRadius: '6px',
                  px: 2,
                  py: 0.8,
                  border: `1px solid ${WA_BUBBLE_BORDER}`,
                }}>
                  <Typography variant="body2" sx={{ color: '#65644A', textAlign: 'center' }}>
                    Dies ist ein neuer Chat. Sag Hallo!
                  </Typography>
                </Box>
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
                    mb: '10px',
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '90%',
                      p: '5px',
                      px: 1,
                      borderRadius: '6px',
                      bgcolor: isOwn ? WA_BUBBLE_OWN : WA_BUBBLE_OTHER,
                      border: `1px solid ${WA_BUBBLE_BORDER}`,
                    }}
                  >
                    {!isOwn && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: WA_TEXT_COLOR,
                          fontWeight: 500,
                          display: 'block',
                          mb: '6px',
                        }}
                      >
                        {msg.senderName}
                      </Typography>
                    )}
                    {/* Dateianhang anzeigen */}
                    {msg.fileUrl && (
                      <Box sx={{ mb: msg.content ? 0.5 : 0 }}>
                        {msg.fileType?.startsWith('audio/') ? (
                          <AudioPlayer
                            src={config.assetsUrl + '/' + msg.fileUrl}
                            duration={msg.duration}
                            accentColor={WA_PRIMARY}
                          />
                        ) : msg.fileType?.startsWith('image/') ? (
                          <Box
                            component="a"
                            href={config.assetsUrl + '/' + msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ display: 'block' }}
                          >
                            <Box
                              component="img"
                              src={config.assetsUrl + '/' + msg.fileUrl}
                              alt={msg.fileName || 'Bild'}
                              sx={{
                                maxWidth: '100%',
                                maxHeight: 200,
                                borderRadius: '4px',
                                display: 'block',
                              }}
                            />
                          </Box>
                        ) : (
                          <Box
                            component="a"
                            href={config.assetsUrl + '/' + msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              p: 1,
                              bgcolor: 'rgba(0,0,0,0.04)',
                              borderRadius: '4px',
                              textDecoration: 'none',
                              color: WA_TEXT_COLOR,
                            }}
                          >
                            <InsertDriveFileIcon sx={{ color: WA_BLUE, fontSize: 32 }} />
                            <Box sx={{ overflow: 'hidden' }}>
                              <Typography variant="body2" sx={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {msg.fileName || 'Datei'}
                              </Typography>
                              {msg.fileSize && (
                                <Typography variant="caption" sx={{ color: WA_GRAY }}>
                                  {formatFileSize(msg.fileSize)}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    )}
                    {/* Weitergeleiteter Beitrag */}
                    {msg.forwardedBeitragId && (
                      <Box
                        onClick={() => navigate('/secure?beitrag=' + msg.forwardedBeitragId)}
                        sx={{
                          p: 1,
                          mb: msg.content && msg.content !== '📤 Beitrag weitergeleitet' ? 0.5 : 0,
                          borderRadius: '6px',
                          bgcolor: 'rgba(0,0,0,0.04)',
                          border: '1px solid rgba(0,0,0,0.08)',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.07)' },
                        }}
                      >
                        <Typography variant="caption" sx={{ color: WA_BLUE, fontWeight: 600, display: 'block', mb: 0.5 }}>
                          📤 Weitergeleiteter Beitrag
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {msg.forwardedBeitragLink && (
                            <Box
                              component="img"
                              src={config.assetsUrl + '/' + msg.forwardedBeitragLink}
                              alt={msg.forwardedBeitragTitel || 'Beitrag'}
                              sx={{ width: 48, height: 48, borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
                            />
                          )}
                          <Box sx={{ overflow: 'hidden' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: WA_TEXT_COLOR, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {msg.forwardedBeitragTitel}
                            </Typography>
                            {msg.forwardedBeitragAutor && (
                              <Typography variant="caption" sx={{ color: WA_GRAY }}>
                                von {msg.forwardedBeitragAutor}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    )}
                    {msg.content && msg.content !== '📤 Beitrag weitergeleitet' && (
                      <Typography
                        variant="body2"
                        sx={{
                          color: WA_TEXT_COLOR,
                          wordBreak: 'break-word',
                          letterSpacing: '0.3px',
                          lineHeight: 1.4,
                        }}
                      >
                        {msg.content}
                      </Typography>
                    )}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '1px',
                        mt: '5px',
                      }}
                    >
                      <Typography variant="caption" sx={{ color: WA_GRAY, fontSize: '12px', letterSpacing: '0.3px' }}>
                        {formatTime(msg.timestamp)}
                      </Typography>
                      {isOwn && (
                        <DoneAllIcon sx={{ fontSize: 13, color: msg.read ? WA_BLUE : WA_GRAY, ml: 0.3 }} />
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })}
            <div ref={messagesEndRef} />
          </Box>

          {/* Datei-Vorschau */}
          {selectedFile && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: '14px',
                py: '6px',
                bgcolor: '#f9f9f9',
                borderTop: `1px solid ${WA_EXTRA_LIGHT_GREY}`,
              }}
            >
              <InsertDriveFileIcon sx={{ color: WA_BLUE, fontSize: 20 }} />
              <Typography variant="body2" sx={{ flex: 1, color: WA_TEXT_COLOR, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </Typography>
              <IconButton size="small" onClick={() => setSelectedFile(null)} sx={{ color: WA_GRAY }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          {/* Eingabefeld - WhatsApp-lite Style: runder Input + blaue Icons */}
          <Box
            sx={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              px: '10px',
              py: '8px',
              height: '50px',
              bgcolor: '#fff',
              borderTop: selectedFile ? 'none' : `1px solid ${WA_EXTRA_LIGHT_GREY}`,
            }}
          >
            {voiceMode ? (
              <VoiceRecorder
                onSend={handleVoiceSend}
                onCancel={() => setVoiceMode(false)}
                accentColor={WA_PRIMARY}
              />
            ) : (
              <>
                {/* Versteckter File-Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <IconButton
                  sx={{ color: WA_BLUE, width: 30, height: 50 }}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Datei anhängen"
                >
                  <AttachFileIcon />
                </IconButton>
                <TextField
                  fullWidth
                  placeholder="Nachricht..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  size="small"
                  sx={{
                    mx: '10px',
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#fff',
                      borderRadius: '50px',
                      height: '40px',
                      '& fieldset': { borderColor: WA_LIGHT_GRAY, borderWidth: 1 },
                      '&:hover fieldset': { borderColor: WA_LIGHT_GRAY },
                      '&.Mui-focused fieldset': { borderColor: WA_BLUE },
                    },
                    '& .MuiInputBase-input': { color: WA_TEXT_COLOR, fontSize: '16px', px: 1.5 },
                    '& .MuiInputBase-input::placeholder': { color: WA_GRAY },
                  }}
                />
                {(messageInput.trim().length > 0 || selectedFile) ? (
                  <IconButton
                    onClick={handleSend}
                    sx={{ color: WA_BLUE, width: 30, height: 50 }}
                    aria-label="Nachricht senden"
                  >
                    <SendIcon />
                  </IconButton>
                ) : (
                  <IconButton
                    sx={{ color: WA_PRIMARY, width: 30, height: 50 }}
                    onClick={() => setVoiceMode(true)}
                    aria-label="Sprachnachricht aufnehmen"
                  >
                    <MicIcon />
                  </IconButton>
                )}
              </>
            )}
          </Box>
        </Box>
      </>
    );
  }

  // Konversationsliste (WhatsApp-lite Style)
  return (
    <>
      <CssBaseline />
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
        {/* Header */}
        <Box
          sx={{
            bgcolor: '#fff',
            px: 2,
            py: 1.5,
            borderBottom: `1px solid ${WA_EXTRA_LIGHT_GREY}`,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={() => navigate('/secure')} sx={{ color: WA_BLUE }} size="small">
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h6" sx={{ color: WA_TEXT_COLOR, fontWeight: 700, fontSize: '1.2rem' }}>
                Chats
              </Typography>
            </Box>
            <IconButton onClick={() => setNewChatOpen(true)} sx={{ color: WA_BLUE }} size="small">
              <AddCommentIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Konversationsliste */}
        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#fff' }}>
          {loading && conversations.length === 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: WA_PRIMARY }} />
            </Box>
          )}

          {!loading && conversations.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <ChatBubbleOutlineIcon sx={{ fontSize: 48, color: WA_EXTRA_LIGHT_GREY, mb: 2 }} />
              <Typography variant="body1" sx={{ color: WA_GRAY }}>
                Noch keine Chats vorhanden
              </Typography>
              <Typography variant="body2" sx={{ color: WA_LIGHT_GRAY, mt: 0.5 }}>
                Starte einen neuen Chat!
              </Typography>
            </Box>
          )}

          {error && (
            <Typography variant="body2" sx={{ color: WA_RED, px: 2, py: 1 }}>
              {error}
            </Typography>
          )}

          <List disablePadding>
            {conversations.map((conv, index) => (
              <React.Fragment key={conv.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleSelectConversation(conv)}
                    sx={{
                      py: 1.2,
                      px: 2,
                      '&:hover': { bgcolor: WA_ALMOST_WHITE },
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        badgeContent={conv.unreadCount}
                        color="error"
                        invisible={conv.unreadCount === 0}
                      >
                        <Avatar
                          src={getConversationAvatar(conv)}
                          sx={{ width: 50, height: 50 }}
                        >
                          {getConversationName(conv).charAt(0).toUpperCase()}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography
                            variant="body1"
                            component="span"
                            sx={{
                              color: WA_TEXT_COLOR,
                              fontWeight: conv.unreadCount > 0 ? 700 : 400,
                              fontSize: '1rem',
                              letterSpacing: '0.3px',
                            }}
                          >
                            {getConversationName(conv)}
                          </Typography>
                          <Typography
                            variant="caption"
                            component="span"
                            sx={{
                              color: WA_GRAY,
                              fontSize: '0.75rem',
                            }}
                          >
                            {conv.lastMessage ? formatTime(conv.lastMessage.timestamp) : ''}
                          </Typography>
                        </Box>
                      }
                      slotProps={{
                        primary: { component: 'div' },
                        secondary: { component: 'div' },
                      }}
                      secondary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography
                            variant="body2"
                            component="span"
                            sx={{
                              color: WA_GRAY,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                              mr: 1,
                              letterSpacing: '0.3px',
                            }}
                          >
                            {conv.lastMessage?.fileType?.startsWith('image/')
                              ? '📷 Foto'
                              : conv.lastMessage?.fileType?.startsWith('audio/')
                                ? '🎤 Sprachnachricht'
                                : conv.lastMessage?.fileUrl
                                  ? '📎 ' + (conv.lastMessage?.fileName || 'Datei')
                                  : conv.lastMessage?.content || 'Keine Nachrichten'}
                          </Typography>
                          {conv.unreadCount > 0 && (
                            <Box
                              sx={{
                                bgcolor: WA_PRIMARY,
                                color: '#fff',
                                borderRadius: '50%',
                                minWidth: 20,
                                height: 20,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                              }}
                            >
                              {conv.unreadCount}
                            </Box>
                          )}
                        </Box>
                      }
                      sx={{ ml: 1 }}
                    />
                  </ListItemButton>
                </ListItem>
                {index < conversations.length - 1 && (
                  <Divider variant="inset" sx={{ ml: 10, borderColor: WA_EXTRA_LIGHT_GREY }} />
                )}
              </React.Fragment>
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
                borderRadius: '12px',
              },
            },
          }}
        >
          <DialogTitle sx={{ color: WA_TEXT_COLOR }}>
            Neuen Chat starten
          </DialogTitle>
          <DialogContent sx={{ mt: 1 }}>
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
                      sx={{ width: 36, height: 36 }}
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
                    '& .MuiInput-underline:after': { borderBottomColor: WA_BLUE },
                    '& .MuiInputLabel-root.Mui-focused': { color: WA_BLUE },
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
                '& .MuiInput-underline:after': { borderBottomColor: WA_BLUE },
                '& .MuiInputLabel-root.Mui-focused': { color: WA_BLUE },
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setNewChatOpen(false)} sx={{ color: WA_GRAY }}>
              Abbrechen
            </Button>
            <Button
              onClick={handleStartConversation}
              disabled={!selectedUser || !initialMessage.trim()}
              variant="contained"
              sx={{
                bgcolor: WA_PRIMARY,
                '&:hover': { bgcolor: '#2ab895' },
                borderRadius: '20px',
                px: 3,
                textTransform: 'none',
              }}
            >
              Senden
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}
