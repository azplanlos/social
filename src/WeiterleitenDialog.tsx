import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Autocomplete,
  TextField,
  Avatar,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { Person } from './datenformat/Person';
import { Beitrag } from './datenformat/Beitrag';
import { config } from './config';
import axios from 'axios';

export type WeiterleitenDialogProps = {
  open: boolean;
  onClose: () => void;
  beitrag: Beitrag;
  token: string | null;
};

export default function WeiterleitenDialog({ open, onClose, beitrag, token }: WeiterleitenDialogProps) {
  const [allUsers, setAllUsers] = useState<Person[]>([]);
  const [selectedUser, setSelectedUser] = useState<Person | null>(null);
  const [nachricht, setNachricht] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token && open) {
      axios.get<Person[]>('/users', {
        headers: { 'X-Requested-With': 'XMLHttpRequest', Authorization: 'Bearer ' + token },
        withCredentials: true,
      }).then(res => setAllUsers(res.data)).catch(() => {});
    }
  }, [token, open]);

  // Zustand zurücksetzen wenn Dialog geöffnet wird
  useEffect(() => {
    if (open) {
      setSelectedUser(null);
      setNachricht('');
      setSuccess(false);
    }
  }, [open]);

  const handleSend = async () => {
    if (!selectedUser || !token) return;
    setLoading(true);
    try {
      await axios.post('/chat/forward', {
        participantName: selectedUser.name,
        beitragId: beitrag.id,
        beitragTitel: beitrag.titel,
        beitragLink: beitrag.link,
        beitragAutor: beitrag.autor?.name || '',
        message: nachricht,
      }, {
        headers: { 'X-Requested-With': 'XMLHttpRequest', Authorization: 'Bearer ' + token },
        withCredentials: true,
      });
      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } catch {
      // Fehlerbehandlung still
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Beitrag weiterleiten</DialogTitle>
      <DialogContent>
        {/* Beitrag-Vorschau */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1.5,
          mb: 2,
          borderRadius: '12px',
          background: 'rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.08)',
        }}>
          {beitrag.link && (
            <Box
              component="img"
              src={config.assetsUrl + '/' + beitrag.link}
              alt={beitrag.titel}
              sx={{ width: 56, height: 56, borderRadius: '8px', objectFit: 'cover' }}
            />
          )}
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="subtitle2" noWrap>{beitrag.titel}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              von {beitrag.autor?.name}
            </Typography>
          </Box>
        </Box>

        {/* Empfänger-Auswahl */}
        <Autocomplete
          options={allUsers}
          getOptionLabel={(option) => option.name}
          value={selectedUser}
          onChange={(_, value) => setSelectedUser(value)}
          renderOption={(props, option) => (
            <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                src={option.avatar_url ? config.assetsUrl + '/' + option.avatar_url : undefined}
                sx={{ width: 32, height: 32 }}
              >
                {option.name?.charAt(0)}
              </Avatar>
              <Typography>{option.name}</Typography>
            </Box>
          )}
          renderInput={(params) => (
            <TextField {...params} label="Empfänger auswählen" variant="outlined" fullWidth />
          )}
          sx={{ mb: 2 }}
        />

        {/* Optionale Nachricht */}
        <TextField
          label="Nachricht (optional)"
          variant="outlined"
          fullWidth
          multiline
          minRows={2}
          maxRows={4}
          value={nachricht}
          onChange={(e) => setNachricht(e.target.value)}
        />

        {success && (
          <Typography color="success.main" sx={{ mt: 1, textAlign: 'center' }}>
            Beitrag wurde weitergeleitet!
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Abbrechen</Button>
        <Button
          onClick={handleSend}
          variant="contained"
          disabled={!selectedUser || loading}
          startIcon={loading ? <CircularProgress size={18} /> : <SendIcon />}
        >
          Senden
        </Button>
      </DialogActions>
    </Dialog>
  );
}
