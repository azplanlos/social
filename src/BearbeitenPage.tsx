import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    CardMedia,
    Container,
    CssBaseline,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    TextField,
    Typography,
    Snackbar,
    Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import axios from 'axios';
import { useNavigate } from 'react-router';
import { Beitrag } from './datenformat/Beitrag';
import { config } from './config';

export type BearbeitenPageProps = {
    token: string | null;
};

// Liquid Glass Card Styles
const glassCardSx = {
    background: 'rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '20px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
    color: '#fff',
};

// Liquid Glass Button Styles
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

export default function BearbeitenPage({ token }: BearbeitenPageProps) {
    const navigate = useNavigate();
    const [beitraege, setBeitraege] = useState<Beitrag[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBeitrag, setSelectedBeitrag] = useState<Beitrag | null>(null);
    const [titel, setTitel] = useState('');
    const [beschreibung, setBeschreibung] = useState('');
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    const headers = {
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: 'Bearer ' + token
    };

    const fetchEigeneBeitraege = () => {
        setLoading(true);
        axios.get<Beitrag[]>('/beitraege/eigene', { headers, withCredentials: true })
            .then(res => {
                setBeitraege(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Fehler beim Laden der eigenen Beiträge', err);
                setLoading(false);
            });
    };

    useEffect(() => {
        if (token) {
            fetchEigeneBeitraege();
        }
    }, [token]);

    const handleSelect = (beitrag: Beitrag) => {
        setSelectedBeitrag(beitrag);
        setTitel(beitrag.titel || '');
        setBeschreibung(beitrag.beschreibung || '');
    };

    const handleSave = () => {
        if (!selectedBeitrag) return;
        setSaving(true);
        axios.put('/beitrag/' + selectedBeitrag.id, { titel, beschreibung }, { headers, withCredentials: true })
            .then(() => {
                setSnackbar({ open: true, message: 'Beitrag erfolgreich gespeichert!', severity: 'success' });
                setSaving(false);
                // Aktualisiere den Beitrag in der Liste
                setBeitraege(prev => prev.map(b => b.id === selectedBeitrag.id ? { ...b, titel, beschreibung } : b));
                setSelectedBeitrag(prev => prev ? { ...prev, titel, beschreibung } : null);
            })
            .catch(err => {
                console.error('Fehler beim Speichern', err);
                setSnackbar({ open: true, message: 'Fehler beim Speichern des Beitrags.', severity: 'error' });
                setSaving(false);
            });
    };

    const handleBack = () => {
        if (selectedBeitrag) {
            setSelectedBeitrag(null);
        } else {
            navigate('/secure');
        }
    };

    return (
        <>
            <CssBaseline />
            <Container maxWidth="sm" sx={{ mt: 4, pb: 4 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={handleBack}
                    sx={{ ...glassButtonSx, mb: 2, px: 3, py: 1 }}
                >
                    Zurück
                </Button>

                {!selectedBeitrag ? (
                    // Liste der eigenen Beiträge
                    <Card sx={glassCardSx}>
                        <CardContent>
                            <Typography variant="h5" sx={{ color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.3)', mb: 2 }}>
                                Beitrag bearbeiten
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                                Wähle einen deiner Beiträge aus, um ihn zu bearbeiten.
                            </Typography>
                            <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                    <CircularProgress sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                                </Box>
                            ) : beitraege.length === 0 ? (
                                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    Du hast noch keine Beiträge erstellt.
                                </Typography>
                            ) : (
                                <List>
                                    {beitraege.map(beitrag => (
                                        <ListItem
                                            key={beitrag.id}
                                            onClick={() => handleSelect(beitrag)}
                                            sx={{
                                                mb: 1,
                                                borderRadius: '12px',
                                                background: 'rgba(255, 255, 255, 0.06)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    background: 'rgba(255, 255, 255, 0.12)',
                                                    transform: 'translateX(4px)',
                                                },
                                            }}
                                        >
                                            <ListItemAvatar>
                                                <Avatar
                                                    variant="rounded"
                                                    src={beitrag.link ? config.assetsUrl + '/' + beitrag.link : undefined}
                                                    sx={{ width: 48, height: 48, borderRadius: '8px' }}
                                                />
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={beitrag.titel || '(Ohne Titel)'}
                                                secondary={beitrag.datum ? new Date(beitrag.datum).toLocaleString() : ''}
                                                slotProps={{
                                                    primary: { sx: { color: '#fff', fontWeight: 500 } },
                                                    secondary: { sx: { color: 'rgba(255, 255, 255, 0.6)' } },
                                                }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    // Bearbeitungsansicht
                    <Card sx={glassCardSx}>
                        <CardContent>
                            <Typography variant="h5" sx={{ color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.3)', mb: 2 }}>
                                Beitrag bearbeiten
                            </Typography>
                            <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

                            {selectedBeitrag.link && (
                                <CardMedia
                                    component="img"
                                    image={config.assetsUrl + '/' + selectedBeitrag.link}
                                    alt={selectedBeitrag.titel}
                                    sx={{ borderRadius: '12px', mb: 2, maxHeight: 250, objectFit: 'cover' }}
                                />
                            )}

                            <TextField
                                label="Titel"
                                variant="outlined"
                                fullWidth
                                value={titel}
                                onChange={e => setTitel(e.target.value)}
                                disabled={saving}
                                sx={{
                                    mb: 2,
                                    '& .MuiOutlinedInput-root': {
                                        color: '#fff',
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                        '&.Mui-focused fieldset': { borderColor: '#fff' },
                                    },
                                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.6)' },
                                    '& .MuiInputLabel-root.Mui-focused': { color: '#fff' },
                                }}
                            />

                            <TextField
                                label="Beschreibung"
                                variant="outlined"
                                fullWidth
                                multiline
                                rows={4}
                                value={beschreibung}
                                onChange={e => setBeschreibung(e.target.value)}
                                disabled={saving}
                                sx={{
                                    mb: 3,
                                    '& .MuiOutlinedInput-root': {
                                        color: '#fff',
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                        '&.Mui-focused fieldset': { borderColor: '#fff' },
                                    },
                                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.6)' },
                                    '& .MuiInputLabel-root.Mui-focused': { color: '#fff' },
                                }}
                            />

                            <Button
                                startIcon={saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <SaveIcon />}
                                onClick={handleSave}
                                disabled={saving}
                                sx={{ ...glassButtonSx, px: 4, py: 1.5 }}
                            >
                                Speichern
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={4000}
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                >
                    <Alert
                        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                        severity={snackbar.severity}
                        sx={{ width: '100%' }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Container>
        </>
    );
}
