import React, { useEffect, useRef, useState } from 'react';
import {
    Avatar,
    AvatarGroup,
    Box,
    Button,
    Chip,
    Container,
    CssBaseline,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Typography,
    Autocomplete,
    TextField,
    ListItemAvatar,
    ListItemText,
    Card,
    CardMedia,
    CardContent,
    CardActions
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axios from 'axios';
import { useNavigate } from 'react-router';
import LiquidGlass from 'liquid-glass-react';
import { Story } from './datenformat/Story';
import { Person } from './datenformat/Person';
import { config } from './config';
import StoryErstellen from './StoryErstellen';

// Liquid Glass Button Styles
const glassButtonSx = {
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(12px) saturate(160%)',
    WebkitBackdropFilter: 'blur(12px) saturate(160%)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '14px',
    color: '#fff',
    textTransform: 'none' as const,
    fontWeight: 500,
    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
};

type StoriesPageProps = {
    token: string | null;
    user?: Person;
};

export default function StoriesPage({ token, user }: StoriesPageProps) {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const [stories, setStories] = useState<Story[]>([]);
    const [selectedStory, setSelectedStory] = useState<Story | null>(null);
    const [zuschauerDialogOpen, setZuschauerDialogOpen] = useState(false);
    const [zuschauerStory, setZuschauerStory] = useState<Story | null>(null);
    const [allUsers, setAllUsers] = useState<Person[]>([]);
    const [neueZuschauer, setNeueZuschauer] = useState<Person[]>([]);
    const [erstellenOpen, setErstellenOpen] = useState(false);

    const headers = {
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: 'Bearer ' + token
    };

    useEffect(() => {
        if (token) {
            fetchStories();
            axios.get<Person[]>('/users', { headers, withCredentials: true })
                .then(res => setAllUsers(res.data));
        }
    }, [token]);

    function fetchStories() {
        axios.get<Story[]>('/stories', { headers, withCredentials: true })
            .then(res => setStories(res.data));
    }

    function openStory(story: Story) {
        setSelectedStory(story);
        // Als gesehen markieren
        axios.post(`/story/${story.id}/gesehen`, null, { headers, withCredentials: true })
            .then(() => fetchStories());
    }

    function openZuschauerDialog(story: Story) {
        setZuschauerStory(story);
        setNeueZuschauer([]);
        setZuschauerDialogOpen(true);
    }

    function zuschauerHinzufuegen() {
        if (!zuschauerStory || neueZuschauer.length === 0) return;

        axios.post(`/story/${zuschauerStory.id}/zuschauer`, neueZuschauer, { headers, withCredentials: true })
            .then(() => {
                setZuschauerDialogOpen(false);
                setZuschauerStory(null);
                setNeueZuschauer([]);
                fetchStories();
            });
    }

    // Stories nach Autor gruppieren
    const storiesByAutor = stories.reduce((acc, story) => {
        const autorName = story.autor?.name || 'Unbekannt';
        if (!acc[autorName]) {
            acc[autorName] = [];
        }
        acc[autorName].push(story);
        return acc;
    }, {} as Record<string, Story[]>);

    // Verfügbare User zum Hinzufügen (ohne bereits vorhandene Zuschauer)
    const verfuegbareUser = zuschauerStory
        ? allUsers.filter(u => 
            !zuschauerStory.zuschauer?.some(z => z.name === u.name) &&
            u.name !== zuschauerStory.autor?.name
          )
        : [];

    return (
        <Container maxWidth="sm" sx={{ mt: '80px', px: { xs: 1, sm: 3 } }} ref={containerRef}>
            <CssBaseline />

            <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate(-1)}
                sx={{ ...glassButtonSx, mb: 2, px: 3, py: 1 }}
            >
                Zurück
            </Button>

            <Typography variant="h5" sx={{ mb: 2 }}>Stories</Typography>

            {/* Story-Kreise oben */}
            <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, mb: 3 }}>
                {Object.entries(storiesByAutor).map(([autorName, autorStories]) => {
                    const latestStory = autorStories[0];
                    const hasUnseen = autorStories.some(s => 
                        !s.angesehen?.some(p => p.name === user?.name)
                    );
                    return (
                        <Box
                            key={autorName}
                            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', minWidth: 78 }}
                            onClick={() => openStory(latestStory)}
                        >
                            <LiquidGlass
                                displacementScale={40}
                                blurAmount={0.06}
                                saturation={140}
                                aberrationIntensity={1.5}
                                elasticity={0.3}
                                cornerRadius={28}
                                padding="3px"
                                mouseContainer={containerRef}
                                overLight={false}
                                style={{ position: 'relative', top: 'auto', left: 'auto', transform: 'none' }}
                            >
                                <Avatar
                                    src={latestStory.autor?.avatar_url ? config.assetsUrl + '/' + latestStory.autor.avatar_url : undefined}
                                    sx={{
                                        width: 56,
                                        height: 56,
                                        border: hasUnseen ? '3px solid #1976d2' : '3px solid rgba(255,255,255,0.4)'
                                    }}
                                >
                                    {autorName?.charAt(0).toUpperCase()}
                                </Avatar>
                            </LiquidGlass>
                            <Typography variant="caption" sx={{ mt: 0.5, textAlign: 'center', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {autorName}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>

            {/* Story-Karten */}
            {stories.map(story => (
                <Card key={story.id} sx={{
                    mb: 2,
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(16px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(140%)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                }}>
                    <CardMedia
                        component="img"
                        image={config.assetsUrl + '/' + story.link}
                        alt={story.titel}
                        sx={{ maxHeight: 300, objectFit: 'cover', cursor: 'pointer' }}
                        onClick={() => openStory(story)}
                    />
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Avatar
                                src={story.autor?.avatar_url ? config.assetsUrl + '/' + story.autor.avatar_url : undefined}
                                sx={{ width: 32, height: 32 }}
                            >
                                {story.autor?.name?.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="subtitle2">{story.autor?.name}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                {new Date(story.datum).toLocaleString()}
                            </Typography>
                        </Box>
                        {story.titel && (
                            <Typography variant="body2" sx={{ mb: 1 }}>{story.titel}</Typography>
                        )}
                        {/* Zuschauer anzeigen */}
                        {story.zuschauer && story.zuschauer.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                <VisibilityIcon fontSize="small" color="action" />
                                <AvatarGroup max={5} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' } }}>
                                    {story.zuschauer.map(z => (
                                        <Avatar key={z.name} src={z.avatar_url ? config.assetsUrl + '/' + z.avatar_url : undefined}>
                                            {z.name?.charAt(0)}
                                        </Avatar>
                                    ))}
                                </AvatarGroup>
                                <Typography variant="caption" color="text.secondary">
                                    {story.zuschauer.length} {story.zuschauer.length === 1 ? 'Person' : 'Personen'}
                                </Typography>
                            </Box>
                        )}
                    </CardContent>
                    {/* Nur der Autor kann Leute hinzufügen */}
                    {story.autor?.name === user?.name && (
                        <CardActions>
                            <Button
                                size="small"
                                startIcon={<PersonAddIcon />}
                                onClick={() => openZuschauerDialog(story)}
                            >
                                Leute hinzufügen
                            </Button>
                        </CardActions>
                    )}
                </Card>
            ))}

            {stories.length === 0 && (
                <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                    Noch keine Stories vorhanden.
                </Typography>
            )}

            {/* FAB zum Erstellen einer neuen Story */}
            <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
                <LiquidGlass
                    displacementScale={50}
                    blurAmount={0.08}
                    saturation={160}
                    aberrationIntensity={2}
                    elasticity={0.25}
                    cornerRadius={28}
                    padding="14px"
                    onClick={() => setErstellenOpen(true)}
                    mouseContainer={containerRef}
                    overLight={false}
                    style={{ position: 'relative', top: 'auto', left: 'auto', transform: 'none' }}
                >
                    <AddIcon sx={{ color: '#fff', fontSize: 28 }} />
                </LiquidGlass>
            </Box>

            {/* Story erstellen Dialog */}
            <StoryErstellen
                open={erstellenOpen}
                onClose={() => setErstellenOpen(false)}
                onCreated={fetchStories}
                token={token}
            />

            {/* Story-Viewer Dialog */}
            <Dialog
                open={selectedStory !== null}
                onClose={() => setSelectedStory(null)}
                maxWidth="sm"
                fullWidth
            >
                {selectedStory && (
                    <>
                        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                                src={selectedStory.autor?.avatar_url ? config.assetsUrl + '/' + selectedStory.autor.avatar_url : undefined}
                                sx={{ width: 32, height: 32 }}
                            >
                                {selectedStory.autor?.name?.charAt(0)}
                            </Avatar>
                            {selectedStory.autor?.name}
                            <IconButton sx={{ ml: 'auto' }} onClick={() => setSelectedStory(null)}>
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent sx={{ p: 0 }}>
                            <img
                                src={config.assetsUrl + '/' + selectedStory.link}
                                alt={selectedStory.titel}
                                style={{ width: '100%', display: 'block' }}
                            />
                            {selectedStory.titel && (
                                <Typography sx={{ p: 2 }}>{selectedStory.titel}</Typography>
                            )}
                        </DialogContent>
                    </>
                )}
            </Dialog>

            {/* Zuschauer hinzufügen Dialog */}
            <Dialog
                open={zuschauerDialogOpen}
                onClose={() => setZuschauerDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Leute zur Story hinzufügen</DialogTitle>
                <DialogContent>
                    {zuschauerStory && zuschauerStory.zuschauer && zuschauerStory.zuschauer.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary">Bereits hinzugefügt:</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                {zuschauerStory.zuschauer.map(z => (
                                    <Chip
                                        key={z.name}
                                        avatar={<Avatar src={z.avatar_url ? config.assetsUrl + '/' + z.avatar_url : undefined}>{z.name?.charAt(0)}</Avatar>}
                                        label={z.name}
                                        size="small"
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}
                    <Autocomplete
                        multiple
                        options={verfuegbareUser}
                        getOptionLabel={(option) => option.name}
                        value={neueZuschauer}
                        onChange={(_, newValue) => setNeueZuschauer(newValue)}
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
                            <TextField {...params} label="Personen auswählen" variant="outlined" fullWidth />
                        )}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setZuschauerDialogOpen(false)}>Abbrechen</Button>
                    <Button
                        variant="contained"
                        onClick={zuschauerHinzufuegen}
                        disabled={neueZuschauer.length === 0}
                        startIcon={<PersonAddIcon />}
                    >
                        Hinzufügen
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
