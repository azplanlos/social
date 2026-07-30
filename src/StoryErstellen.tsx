import React, { useEffect, useState } from 'react';
import {
    Autocomplete,
    Avatar,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    ListItemAvatar,
    ListItemText,
    TextField,
    Typography,
    CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SendIcon from '@mui/icons-material/Send';
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
    const [zuschauer, setZuschauer] = useState<Person[]>([]);
    const [allUsers, setAllUsers] = useState<Person[]>([]);
    const [loading, setLoading] = useState(false);

    const headers = {
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: 'Bearer ' + token
    };

    useEffect(() => {
        if (open && token) {
            axios.get<Person[]>('/users', { headers, withCredentials: true })
                .then(res => setAllUsers(res.data));
        }
    }, [open, token]);

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const compressor = new Compress();
        compressor.compress([file], {
            quality: 0.8,
            maxWidth: 800,
            maxHeight: 800,
        }).then(results => {
            const compressed = Compress.convertBase64ToFile(results[0].data, results[0].ext);
            setBild(compressed);
            setBildPreview(URL.createObjectURL(compressed));
        });
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
    }

    function handleClose() {
        resetForm();
        onClose();
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
                Neue Story erstellen
                <IconButton sx={{ ml: 'auto' }} onClick={handleClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                {/* Bild-Auswahl */}
                {!bildPreview ? (
                    <Box
                        sx={{
                            border: '2px dashed',
                            borderColor: 'divider',
                            borderRadius: 2,
                            p: 4,
                            textAlign: 'center',
                            cursor: 'pointer',
                            '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' }
                        }}
                        component="label"
                    >
                        <input type="file" accept="image/*" hidden onChange={handleFileSelect} />
                        <PhotoCameraIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                        <Typography color="text.secondary">Foto auswählen</Typography>
                    </Box>
                ) : (
                    <Box sx={{ position: 'relative', mb: 2 }}>
                        <img
                            src={bildPreview}
                            alt="Vorschau"
                            style={{ width: '100%', borderRadius: 8, display: 'block' }}
                        />
                        <IconButton
                            sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}
                            onClick={() => { setBild(null); setBildPreview(null); }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
                )}

                {/* Titel */}
                <TextField
                    label="Titel (optional)"
                    variant="outlined"
                    fullWidth
                    value={titel}
                    onChange={(e) => setTitel(e.target.value)}
                    sx={{ mt: 2, mb: 2 }}
                />

                {/* Zuschauer-Auswahl */}
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Wer darf die Story sehen?
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Leer lassen = alle können die Story sehen
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
                        <TextField {...params} label="Personen auswählen" variant="outlined" />
                    )}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Abbrechen</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!bild || loading}
                    startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
                >
                    Story teilen
                </Button>
            </DialogActions>
        </Dialog>
    );
}
