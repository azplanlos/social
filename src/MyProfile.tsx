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
  Typography
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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

export default function MyProfile({ user, token, onAvatarUpdated }: MyProfileProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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
    // Keycloak-style account URL (local), Zitadel has its own account page
    const accountUrl = config.oidc.authority.includes('/realms/')
      ? `${config.oidc.authority}/account/#/security/signingin`
      : `${config.oidc.authority}/ui/console/users/me`;
    window.location.href = accountUrl;
  };

  return (
    <>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/secure')}
          sx={{ mb: 2 }}
        >
          Zurück
        </Button>

        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Mein Profil
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {/* Avatar Section */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={user.avatar_url ? config.assetsUrl + '/' + user.avatar_url : undefined}
                  sx={{ width: 120, height: 120, fontSize: 48 }}
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
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': { backgroundColor: 'primary.dark' }
                  }}
                  size="small"
                  aria-label="Avatar hochladen"
                >
                  <PhotoCameraIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="h6" sx={{ mt: 1 }}>
                {user.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
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

            <Divider sx={{ mb: 3 }} />

            {/* Password Change Section */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="subtitle1" gutterBottom>
                Sicherheit
              </Typography>
              <Button
                variant="outlined"
                startIcon={<LockResetIcon />}
                onClick={handlePasswordChange}
              >
                Passwort ändern
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Du wirst zum Identity Provider weitergeleitet
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </>
  );
}
