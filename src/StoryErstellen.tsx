import React, { useEffect, useRef, useState } from 'react';
import {
    Autocomplete,
    Avatar,
    Box,
    Button,
    CircularProgress,
    IconButton,
    ListItemAvatar,
    ListItemText,
    Slide,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import GroupIcon from '@mui/icons-material/Group';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import axios from 'axios';
import Compress from 'compress.js';
import { Person } from './datenformat/Person';
import { config } from './config';

type StoryErstellenProps = {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
    token: string | null;
};

export default function StoryErstellen({ open, onClose, onCreated, token }: StoryErstellenProps) {
    const [bild, setBild] = useState<Blob | null>(null);
    const [bildPreview, setBildPreview] = useState<string | null>(null);
    const [titel, setTitel] = useState('');
    const [showTitelInput, setShowTitelInput] = useState(false);
    const [zuschauer, setZuschauer] = useState<Person[]>([]);
    const [showZuschauerPanel, setShowZuschauerPanel] = useState(false);
    const [allUsers, setAllUsers] = useState<Person[]>([]);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'pick' | 'preview'>('pick');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const titelInputRef = useRef<HTMLInputElement>(null);

    const headers = {
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: 'Bearer ' + token
    };

    useEffect(() => {
        if (open && token) {
            axios.get<Person[]>('/users', { headers, withCredentials: true })
                .then(res => setAllUsers(res.data))
                .catch(() => {});
        }
    }, [open, token]);

    useEffect(() => {
        if (showTitelInput && titelInputRef.current) {
            titelInputRef.current.focus();
        }
    }, [showTitelInput]);

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type.startsWith('video/')) {
            setBild(file);
            setBildPreview(URL.createObjectURL(file));
            setStep('preview');
        } else {
            const compressor = new Compress();
            compressor.compress([file], {
                quality: 0.85,
                maxWidth: 1080,
                maxHeight: 1920,
            }).then(results => {
                const compressed = Compress.convertBase64ToFile(results[0].data, results[0].ext);
                setBild(compressed);
                setBildPreview(URL.createObjectURL(compressed));
                setStep('preview');
            });
        }
    }

    function handleSubmit() {
        if (!bild) return;
        setLoading(true);

        const formData = new FormData();
        formData.append('file', bild);

        axios.post('/foto', formData, {
            headers: {
                'content-type': 'multipart/form-data',
                ...headers
            },
            withCredentials: true
        }).then(response => {
            const bildUrl = response.data;
            return axios.post('/story', {
                link: bildUrl,
                titel: titel,
                zuschauer: zuschauer
            }, { headers, withCredentials: true });
        }).then(() => {
            setLoading(false);
            resetForm();
            onCreated();
            onClose();
        }).catch(() => {
            setLoading(false);
        });
    }

    function resetForm() {
        setBild(null);
        setBildPreview(null);
        setTitel('');
        setZuschauer([]);
        setShowTitelInput(false);
        setShowZuschauerPanel(false);
        setStep('pick');
    }

    function handleClose() {
        resetForm();
        onClose();
    }

    if (!open) return null;

    return (
        <Slide direction="up" in={open} mountOnEnter unmountOnExit>
            <Box sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 10000,
                bgcolor: '#000',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* === STEP 1: Bild auswählen === */}
                {step === 'pick' && (
                    <Box sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                    }}>
                        {/* Header */}
                        <Box sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            display: 'flex',
                            alignItems: 'center',
                            px: 2,
                            py: 1.5,
                            zIndex: 10,
                        }}>
                            <IconButton onClick={handleClose} sx={{ color: '#fff' }}>
                                <CloseIcon />
                            </IconButton>
                            <Typography sx={{
                                flex: 1,
                                textAlign: 'center',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '1.1rem',
                                letterSpacing: '0.02em',
                            }}>
                                Neue Story
                            </Typography>
                            <Box sx={{ width: 40 }} /> {/* Spacer */}
                        </Box>

                        {/* Animierter Hintergrund */}
                        <Box sx={{
                            position: 'absolute',
                            inset: 0,
                            background: 'radial-gradient(ellipse at 30% 20%, rgba(124, 77, 255, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(25, 118, 210, 0.12) 0%, transparent 50%)',
                        }} />

                        {/* Auswahlbereich */}
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 3,
                            zIndex: 5,
                        }}>
                            {/* Großer Upload-Button */}
                            <Box
                                component="label"
                                sx={{
                                    width: 160,
                                    height: 160,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, rgba(124, 77, 255, 0.3), rgba(25, 118, 210, 0.3))',
                                    backdropFilter: 'blur(20px)',
                                    border: '2px solid rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    boxShadow: '0 8px 40px rgba(124, 77, 255, 0.2)',
                                    '&:hover': {
                                        transform: 'scale(1.05)',
                                        boxShadow: '0 12px 50px rgba(124, 77, 255, 0.35)',
                                        borderColor: 'rgba(255,255,255,0.4)',
                                    },
                                    '&:active': {
                                        transform: 'scale(0.98)',
                                    },
                                }}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    hidden
                                    onChange={handleFileSelect}
                                />
                                <ImageIcon sx={{ fontSize: 48, color: '#fff', mb: 1 }} />
                                <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', fontWeight: 500 }}>
                                    Galerie
                                </Typography>
                            </Box>

                            <Typography sx={{
                                color: 'rgba(255,255,255,0.5)',
                                fontSize: '0.82rem',
                                textAlign: 'center',
                                maxWidth: 240,
                            }}>
                                Wähle ein Foto oder Video aus deiner Galerie
                            </Typography>
                        </Box>
                    </Box>
                )}

                {/* === STEP 2: Vorschau & Bearbeiten === */}
                {step === 'preview' && bildPreview && (
                    <Box sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                    }}>
                        {/* Bild-Vorschau als Hintergrund */}
                        <Box sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                        }}>
                            {/* Blurred Background */}
                            <Box
                                component="img"
                                src={bildPreview}
                                sx={{
                                    position: 'absolute',
                                    inset: -20,
                                    width: 'calc(100% + 40px)',
                                    height: 'calc(100% + 40px)',
                                    objectFit: 'cover',
                                    filter: 'blur(30px) brightness(0.4)',
                                }}
                            />
                            {/* Hauptbild */}
                            <Box
                                component="img"
                                src={bildPreview}
                                sx={{
                                    position: 'relative',
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain',
                                    borderRadius: '12px',
                                }}
                            />
                        </Box>

                        {/* Header Overlay */}
                        <Box sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            display: 'flex',
                            alignItems: 'center',
                            px: 1.5,
                            py: 1,
                            zIndex: 10,
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
                            paddingBottom: 4,
                        }}>
                            <IconButton onClick={() => { setStep('pick'); setBild(null); setBildPreview(null); }} sx={{ color: '#fff' }}>
                                <ArrowBackIcon />
                            </IconButton>
                            <Typography sx={{
                                flex: 1,
                                textAlign: 'center',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '1rem',
                            }}>
                                Vorschau
                            </Typography>
                            <Box sx={{ width: 40 }} />
                        </Box>

                        {/* Titel-Overlay (wenn aktiv) */}
                        {showTitelInput && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    zIndex: 20,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: 'rgba(0,0,0,0.6)',
                                    backdropFilter: 'blur(4px)',
                                    px: 3,
                                }}
                                onClick={(e) => {
                                    if (e.target === e.currentTarget) setShowTitelInput(false);
                                }}
                            >
                                <TextField
                                    inputRef={titelInputRef}
                                    value={titel}
                                    onChange={(e) => setTitel(e.target.value)}
                                    placeholder="Text hinzufügen..."
                                    variant="standard"
                                    multiline
                                    maxRows={4}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            setShowTitelInput(false);
                                        }
                                    }}
                                    sx={{
                                        width: '100%',
                                        maxWidth: 340,
                                        '& .MuiInput-root': {
                                            color: '#fff',
                                            fontSize: '1.4rem',
                                            fontWeight: 600,
                                            textAlign: 'center',
                                            '&::before, &::after': { display: 'none' },
                                        },
                                        '& .MuiInputBase-input': {
                                            textAlign: 'center',
                                            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                                        },
                                        '& .MuiInputBase-input::placeholder': {
                                            color: 'rgba(255,255,255,0.6)',
                                            opacity: 1,
                                        },
                                    }}
                                />
                            </Box>
                        )}

                        {/* Titel anzeigen (wenn gesetzt und nicht im Edit-Modus) */}
                        {titel && !showTitelInput && (
                            <Box sx={{
                                position: 'absolute',
                                top: '50%',
                                left: 0,
                                right: 0,
                                transform: 'translateY(-50%)',
                                textAlign: 'center',
                                px: 3,
                                zIndex: 8,
                                pointerEvents: 'none',
                            }}>
                                <Typography sx={{
                                    color: '#fff',
                                    fontSize: '1.4rem',
                                    fontWeight: 600,
                                    textShadow: '0 2px 12px rgba(0,0,0,0.7)',
                                    wordBreak: 'break-word',
                                }}>
                                    {titel}
                                </Typography>
                            </Box>
                        )}

                        {/* Zuschauer-Panel */}
                        {showZuschauerPanel && (
                            <Box sx={{
                                position: 'absolute',
                                bottom: 80,
                                left: 0,
                                right: 0,
                                zIndex: 20,
                                px: 2,
                            }}>
                                <Box sx={{
                                    background: 'rgba(30, 30, 30, 0.92)',
                                    backdropFilter: 'blur(20px) saturate(150%)',
                                    borderRadius: '20px',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    p: 2.5,
                                    boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                        <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
                                            Wer darf sehen?
                                        </Typography>
                                        <IconButton size="small" onClick={() => setShowZuschauerPanel(false)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                            <CheckCircleIcon />
                                        </IconButton>
                                    </Box>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 1.5 }}>
                                        Leer = alle können die Story sehen
                                    </Typography>
                                    <Autocomplete
                                        multiple
                                        options={allUsers}
                                        getOptionLabel={(option) => option.name}
                                        value={zuschauer}
                                        onChange={(_, newValue) => setZuschauer(newValue)}
                                        isOptionEqualToValue={(option, value) => option.name === value.name}
                                        renderOption={(props, option) => (
                                            <li {...props} key={option.name}>
                                                <ListItemAvatar>
                                                    <Avatar src={option.avatar_url ? config.assetsUrl + '/' + option.avatar_url : undefined} sx={{ width: 32, height: 32 }}>
                                                        {option.name?.charAt(0).toUpperCase()}
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText primary={option.name} />
                                            </li>
                                        )}

                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                placeholder="Personen suchen..."
                                                variant="outlined"
                                                size="small"
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        color: '#fff',
                                                        bgcolor: 'rgba(255,255,255,0.06)',
                                                        borderRadius: '12px',
                                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                                                        '&.Mui-focused fieldset': { borderColor: 'rgba(124, 77, 255, 0.6)' },
                                                    },
                                                    '& .MuiInputBase-input::placeholder': {
                                                        color: 'rgba(255,255,255,0.4)',
                                                        opacity: 1,
                                                    },
                                                }}
                                            />
                                        )}
                                        slotProps={{
                                            paper: {
                                                sx: {
                                                    bgcolor: 'rgba(30, 30, 30, 0.95)',
                                                    backdropFilter: 'blur(16px)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '12px',
                                                    color: '#fff',
                                                    '& .MuiAutocomplete-option': {
                                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                                                    },
                                                },
                                            },
                                        }}
                                    />
                                </Box>
                            </Box>
                        )}

                        {/* Untere Toolbar */}
                        <Box sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 2,
                            py: 2,
                            zIndex: 15,
                            background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
                            paddingTop: 5,
                        }}>
                            {/* Tools Links */}
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {/* Text-Button */}
                                <IconButton
                                    onClick={() => setShowTitelInput(!showTitelInput)}
                                    sx={{
                                        color: titel ? '#7c4dff' : '#fff',
                                        bgcolor: 'rgba(255,255,255,0.1)',
                                        backdropFilter: 'blur(8px)',
                                        width: 44,
                                        height: 44,
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                                    }}
                                >
                                    <TextFieldsIcon />
                                </IconButton>

                                {/* Zuschauer-Button */}
                                <IconButton
                                    onClick={() => setShowZuschauerPanel(!showZuschauerPanel)}
                                    sx={{
                                        color: zuschauer.length > 0 ? '#7c4dff' : '#fff',
                                        bgcolor: 'rgba(255,255,255,0.1)',
                                        backdropFilter: 'blur(8px)',
                                        width: 44,
                                        height: 44,
                                        position: 'relative',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                                    }}
                                >
                                    <GroupIcon />
                                    {zuschauer.length > 0 && (
                                        <Box sx={{
                                            position: 'absolute',
                                            top: 2,
                                            right: 2,
                                            width: 16,
                                            height: 16,
                                            borderRadius: '50%',
                                            bgcolor: '#7c4dff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <Typography sx={{ color: '#fff', fontSize: '0.6rem', fontWeight: 700 }}>
                                                {zuschauer.length}
                                            </Typography>
                                        </Box>
                                    )}
                                </IconButton>
                            </Box>

                            {/* Senden-Button */}
                            <Button
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={!bild || loading}
                                startIcon={loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <SendIcon />}
                                sx={{
                                    borderRadius: '50px',
                                    px: 3,
                                    py: 1.2,
                                    background: 'linear-gradient(135deg, #7c4dff 0%, #1976d2 100%)',
                                    color: '#fff',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    textTransform: 'none',
                                    boxShadow: '0 4px 20px rgba(124, 77, 255, 0.4)',
                                    border: 'none',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #9c6fff 0%, #2196f3 100%)',
                                        boxShadow: '0 6px 28px rgba(124, 77, 255, 0.5)',
                                        transform: 'translateY(-1px)',
                                    },
                                    '&:disabled': {
                                        background: 'rgba(255,255,255,0.15)',
                                        color: 'rgba(255,255,255,0.4)',
                                        boxShadow: 'none',
                                    },
                                }}
                            >
                                Story teilen
                            </Button>
                        </Box>
                    </Box>
                )}
            </Box>
        </Slide>
    );
}
