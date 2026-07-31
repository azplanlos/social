import React, { useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  CssBaseline,
  Divider,
  IconButton,
  Slider,
  Snackbar,
  Typography
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TimerIcon from '@mui/icons-material/Timer';
import { Person } from './datenformat/Person';
import axios from 'axios';
import { useNavigate } from 'react-router';
import { config } from './config';
import Compress from 'compress.js';

export type MyProfileProps = {
  user: Person;
  token: string | null;
  onAvatarUpdated: () => void;
};

// Gemeinsame Liquid Glass Card Styles
const glassCardSx = {
  background: 'rgba(255, 255, 255, 0.12)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '20px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
  color: '#fff',
};

// Gemeinsame Liquid Glass Button Styles
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

export default function MyProfile({ user, token, onAvatarUpdated }: MyProfileProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [storyDauer, setStoryDauer] = useState<number>(user.storyDauerStunden ?? 24);
  const [savingDauer, setSavingDauer] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const compressor = new Compress();
      const compressedFiles = await compressor.compress([file], {
        quality: 0.8,
        maxWidth: 500,
        maxHeight: 500,
      });
      const compressedFile = Compress.convertBase64ToFile(compressedFiles[0].data, compressedFiles[0].ext);

      const formData = new FormData();
      formData.append('file', compressedFile, 'avatar.jpg');

      await axios.post('/account/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: 'Bearer ' + token
        },
        withCredentials: true
      });
      onAvatarUpdated();
    } catch (err) {
      console.error('Avatar upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordChange = () => {
    const accountUrl = config.oidc.authority.includes('/realms/')
      ? `${config.oidc.authority}/account/#/security/signingin`
      : `${config.oidc.authority}/ui/console/users/me`;
    window.location.href = accountUrl;
  };

  const handleStoryDauerSave = async () => {
    setSavingDauer(true);
    try {
      await axios.post('/account/story-dauer', null, {
        params: { stunden: storyDauer },
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: 'Bearer ' + token
        },
        withCredentials: true
      });
      setSnackbar('Story-Sichtbarkeit gespeichert');
    } catch (err) {
      console.error('Story-Dauer speichern fehlgeschlagen', err);
      setSnackbar('Fehler beim Speichern');
    } finally {
      setSavingDauer(false);
    }
  };

  const formatDauer = (stunden: number) => {
    if (stunden < 24) return `${stunden} Stunde${stunden > 1 ? 'n' : ''}`;
    const tage = Math.floor(stunden / 24);
    const rest = stunden % 24;
    if (rest === 0) return `${tage} Tag${tage > 1 ? 'e' : ''}`;
    return `${tage} Tag${tage > 1 ? 'e' : ''} ${rest}h`;
  };

  return (
    <>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ mt: '80px' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/secure')}
          sx={{ ...glassButtonSx, mb: 2, px: 3, py: 1 }}
        >
          Zurück
        </Button>

        <Card sx={glassCardSx}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
              Mein Profil
            </Typography>
            <Divider sx={{ mb: 3, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

            {/* Avatar Section */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={user.avatar_url ? config.assetsUrl + '/' + user.avatar_url : undefined}
                  sx={{
                    width: 120,
                    height: 120,
                    fontSize: 48,
                    border: '3px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {user.name?.charAt(0).toUpperCase()}
                </Avatar>
                <IconButton
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.35)',
                    }
                  }}
                  size="small"
                  aria-label="Avatar hochladen"
                >
                  <PhotoCameraIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="h6" sx={{ mt: 1, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                {user.name}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {uploading ? 'Avatar wird hochgeladen...' : 'Klicke auf das Kamera-Icon um deinen Avatar zu ändern'}
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </Box>

            <Divider sx={{ mb: 3, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

            {/* Story-Sichtbarkeit Section */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ color: '#fff' }}>
                <TimerIcon sx={{ fontSize: 18, mr: 1, verticalAlign: 'text-bottom' }} />
                Story-Sichtbarkeit
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2, textAlign: 'center' }}>
                Wie lange sollen deine Storys sichtbar sein?
              </Typography>
              <Box sx={{ width: '100%', px: 2 }}>
                <Slider
                  value={storyDauer}
                  onChange={(_, val) => setStoryDauer(val as number)}
                  min={1}
                  max={168}
                  step={1}
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatDauer}
                  marks={[
                    { value: 1, label: '1h' },
                    { value: 24, label: '24h' },
                    { value: 48, label: '2T' },
                    { value: 72, label: '3T' },
                    { value: 168, label: '7T' },
                  ]}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    '& .MuiSlider-markLabel': { color: 'rgba(255, 255, 255, 0.6)', fontSize: 12 },
                    '& .MuiSlider-thumb': { backgroundColor: '#fff' },
                    '& .MuiSlider-track': { backgroundColor: 'rgba(255, 255, 255, 0.8)' },
                    '& .MuiSlider-rail': { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
                  }}
                />
              </Box>
              <Typography variant="body1" sx={{ mt: 1, color: '#fff', fontWeight: 500 }}>
                {formatDauer(storyDauer)}
              </Typography>
              <Button
                variant="outlined"
                onClick={handleStoryDauerSave}
                disabled={savingDauer}
                sx={{ ...glassButtonSx, mt: 2 }}
              >
                {savingDauer ? 'Speichern...' : 'Speichern'}
              </Button>
            </Box>

            <Divider sx={{ mb: 3, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

            {/* Password Change Section */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ color: '#fff' }}>
                Sicherheit
              </Typography>
              <Button
                variant="outlined"
                startIcon={<LockResetIcon />}
                onClick={handlePasswordChange}
                sx={glassButtonSx}
              >
                Passwort ändern
              </Button>
              <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255, 255, 255, 0.7)' }}>
                Du wirst zum Identity Provider weitergeleitet
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </>
  );
}
