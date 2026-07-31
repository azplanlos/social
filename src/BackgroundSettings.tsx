import React, { useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import GradientIcon from '@mui/icons-material/Gradient';
import { useNavigate } from 'react-router';
import { useBackground, BackgroundOption, DEFAULT_BACKGROUNDS, LIGHT_BACKGROUNDS } from './BackgroundContext';
import { useThemeMode } from './ThemeContext';

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

function BackgroundPreview({ bg, selected, onClick, onDelete }: {
  bg: BackgroundOption;
  selected: boolean;
  onClick: () => void;
  onDelete?: () => void;
}) {
  const previewStyle: React.CSSProperties = bg.type === 'image'
    ? { background: `url(${bg.value}) center/cover no-repeat` }
    : { background: bg.value };

  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        width: '100%',
        paddingTop: '60%',
        borderRadius: '14px',
        overflow: 'hidden',
        cursor: 'pointer',
        border: selected ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)',
        boxShadow: selected
          ? '0 0 0 2px rgba(255,255,255,0.5), 0 4px 20px rgba(0,0,0,0.3)'
          : '0 2px 8px rgba(0,0,0,0.2)',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'scale(1.03)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        },
      }}
    >
      <Box sx={{ position: 'absolute', inset: 0, ...previewStyle }} />
      {selected && (
        <CheckCircleIcon
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: '#fff',
            fontSize: 24,
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
          }}
        />
      )}
      {onDelete && (
        <IconButton
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          size="small"
          sx={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            '&:hover': { background: 'rgba(220,38,38,0.8)' },
          }}
          aria-label="Hintergrund löschen"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      )}
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          color: '#fff',
          textShadow: '0 1px 4px rgba(0,0,0,0.7)',
          fontWeight: 500,
        }}
      >
        {bg.name}
      </Typography>
    </Box>
  );
}

export default function BackgroundSettings() {
  const navigate = useNavigate();
  const { currentBackground, backgrounds, setBackground, addCustomBackground, removeCustomBackground } = useBackground();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'image' | 'gradient'>('image');
  const [customName, setCustomName] = useState('');
  const [customGradient, setCustomGradient] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const customBackgrounds = backgrounds.filter(bg => bg.custom);
  const standardBackgrounds = isDark ? DEFAULT_BACKGROUNDS : LIGHT_BACKGROUNDS;

  const handleOpenDialog = (mode: 'image' | 'gradient') => {
    setDialogMode(mode);
    setCustomName('');
    setCustomGradient('');
    setPreviewImage(null);
    setDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;

    if (dialogMode === 'image' && previewImage) {
      addCustomBackground(customName.trim(), previewImage, 'image');
    } else if (dialogMode === 'gradient' && customGradient.trim()) {
      addCustomBackground(customName.trim(), customGradient.trim(), 'gradient');
    } else {
      return;
    }

    setDialogOpen(false);
  };

  return (
    <>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ mt: '80px', pb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ ...glassButtonSx, mb: 2, px: 3, py: 1 }}
        >
          Zurück
        </Button>

        <Card sx={glassCardSx}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
              Hintergrund
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
              Wähle einen Standard-Hintergrund oder füge deinen eigenen hinzu.
            </Typography>
            <Divider sx={{ mb: 3, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

            {/* Standard-Hintergründe */}
            <Typography variant="subtitle1" sx={{ color: '#fff', mb: 1.5, fontWeight: 500 }}>
              Standard
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 3 }}>
              {standardBackgrounds.map(bg => (
                <BackgroundPreview
                  key={bg.id}
                  bg={bg}
                  selected={currentBackground.id === bg.id}
                  onClick={() => setBackground(bg)}
                />
              ))}
            </Box>

            {/* Eigene Hintergründe */}
            <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
            <Typography variant="subtitle1" sx={{ color: '#fff', mb: 1.5, fontWeight: 500 }}>
              Eigene Hintergründe
            </Typography>

            {customBackgrounds.length > 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 2 }}>
                {customBackgrounds.map(bg => (
                  <BackgroundPreview
                    key={bg.id}
                    bg={bg}
                    selected={currentBackground.id === bg.id}
                    onClick={() => setBackground(bg)}
                    onDelete={() => removeCustomBackground(bg.id)}
                  />
                ))}
              </Box>
            )}

            {customBackgrounds.length === 0 && (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 2 }}>
                Noch keine eigenen Hintergründe hinzugefügt.
              </Typography>
            )}

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                startIcon={<AddPhotoAlternateIcon />}
                onClick={() => handleOpenDialog('image')}
                sx={glassButtonSx}
              >
                Bild hinzufügen
              </Button>
              <Button
                startIcon={<GradientIcon />}
                onClick={() => handleOpenDialog('gradient')}
                sx={glassButtonSx}
              >
                Gradient hinzufügen
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>

      {/* Dialog zum Hinzufügen */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {dialogMode === 'image' ? 'Bild als Hintergrund' : 'Eigenen Gradient erstellen'}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
            placeholder="z.B. Mein Foto"
          />

          {dialogMode === 'image' ? (
            <>
              <Button
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
                sx={{ ...glassButtonSx, mb: 2 }}
              >
                Bild auswählen
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              {previewImage && (
                <Box
                  sx={{
                    width: '100%',
                    height: 120,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: `url(${previewImage}) center/cover no-repeat`,
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                />
              )}
            </>
          ) : (
            <>
              <TextField
                label="CSS Gradient"
                fullWidth
                value={customGradient}
                onChange={e => setCustomGradient(e.target.value)}
                placeholder="linear-gradient(135deg, #ff0000, #0000ff)"
                helperText="Gib einen gültigen CSS-Gradient ein"
                sx={{ mb: 2 }}
              />
              {customGradient && (
                <Box
                  sx={{
                    width: '100%',
                    height: 80,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: customGradient,
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                />
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Abbrechen
          </Button>
          <Button
            onClick={handleAddCustom}
            disabled={!customName.trim() || (dialogMode === 'image' ? !previewImage : !customGradient.trim())}
          >
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
