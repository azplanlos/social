import React, { useEffect, useRef, useState, useCallback } from 'react';
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axios from 'axios';
import { useNavigate } from 'react-router';
import { Story } from './datenformat/Story';
import { Person } from './datenformat/Person';
import { config } from './config';
import StoryErstellen from './StoryErstellen';

// Instagram-Style Gradient für ungesehene Stories
const STORY_GRADIENT = 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)';
const STORY_SEEN_BORDER = '#555';
const STORY_DURATION = 5000; // 5 Sekunden pro Story-Snap

type StoriesPageProps = {
    token: string | null;
    user?: Person;
};

type GroupedStories = {
    autorName: string;
    autorAvatar?: string;
    stories: Story[];
    hasUnseen: boolean;
};

export default function StoriesPage({ token, user }: StoriesPageProps) {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const [stories, setStories] = useState<Story[]>([]);
    const [zuschauerDialogOpen, setZuschauerDialogOpen] = useState(false);
    const [zuschauerStory, setZuschauerStory] = useState<Story | null>(null);
    const [allUsers, setAllUsers] = useState<Person[]>([]);
    const [neueZuschauer, setNeueZuschauer] = useState<Person[]>([]);
    const [erstellenOpen, setErstellenOpen] = useState(false);

    // Fullscreen Story Viewer State
    const [viewerOpen, setViewerOpen] = useState(false);
    const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
    const [currentSnapIndex, setCurrentSnapIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);
    const elapsedRef = useRef<number>(0);
    const touchStartX = useRef<number>(0);

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

    // Stories nach Autor gruppieren
    const groupedStories: GroupedStories[] = React.useMemo(() => {
        const groups: Record<string, GroupedStories> = {};
        stories.forEach(story => {
            const autorName = story.autor?.name || 'Unbekannt';
            if (!groups[autorName]) {
                groups[autorName] = {
                    autorName,
                    autorAvatar: story.autor?.avatar_url,
                    stories: [],
                    hasUnseen: false
                };
            }
            groups[autorName].stories.push(story);
            if (!story.angesehen?.some(p => p.name === user?.name)) {
                groups[autorName].hasUnseen = true;
            }
        });
        return Object.values(groups);
    }, [stories, user]);

    // --- Fullscreen Viewer Logik ---

    const currentGroup = groupedStories[currentGroupIndex];
    const currentStory = currentGroup?.stories[currentSnapIndex];

    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
            const elapsed = elapsedRef.current + (Date.now() - startTimeRef.current);
            const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
            setProgress(pct);
            if (pct >= 100) {
                clearInterval(timerRef.current!);
                timerRef.current = null;
                goToNextSnap();
            }
        }, 30);
    }, [currentGroupIndex, currentSnapIndex, groupedStories]);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            elapsedRef.current += Date.now() - startTimeRef.current;
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const resetAndStartTimer = useCallback(() => {
        elapsedRef.current = 0;
        setProgress(0);
        startTimer();
    }, [startTimer]);

    // Nächster Snap oder nächste Story-Gruppe
    const goToNextSnap = useCallback(() => {
        if (!currentGroup) return;
        if (currentSnapIndex < currentGroup.stories.length - 1) {
            setCurrentSnapIndex(prev => prev + 1);
            elapsedRef.current = 0;
            setProgress(0);
        } else if (currentGroupIndex < groupedStories.length - 1) {
            setCurrentGroupIndex(prev => prev + 1);
            setCurrentSnapIndex(0);
            elapsedRef.current = 0;
            setProgress(0);
        } else {
            // Letzte Story, Viewer schließen
            closeViewer();
        }
    }, [currentGroup, currentSnapIndex, currentGroupIndex, groupedStories]);

    // Vorheriger Snap oder vorherige Story-Gruppe
    const goToPrevSnap = useCallback(() => {
        if (currentSnapIndex > 0) {
            setCurrentSnapIndex(prev => prev - 1);
            elapsedRef.current = 0;
            setProgress(0);
        } else if (currentGroupIndex > 0) {
            const prevGroup = groupedStories[currentGroupIndex - 1];
            setCurrentGroupIndex(prev => prev - 1);
            setCurrentSnapIndex(prevGroup.stories.length - 1);
            elapsedRef.current = 0;
            setProgress(0);
        }
    }, [currentSnapIndex, currentGroupIndex, groupedStories]);

    function openViewer(groupIndex: number, snapIndex: number = 0) {
        setCurrentGroupIndex(groupIndex);
        setCurrentSnapIndex(snapIndex);
        setProgress(0);
        elapsedRef.current = 0;
        setPaused(false);
        setViewerOpen(true);
    }

    function closeViewer() {
        setViewerOpen(false);
        stopTimer();
        setProgress(0);
        elapsedRef.current = 0;
    }

    // Deep-Link: ?story=<id> automatisch öffnen
    const deepLinkHandledRef = useRef(false);
    useEffect(() => {
        if (deepLinkHandledRef.current) return;
        if (stories.length === 0 || groupedStories.length === 0) return;
        const params = new URLSearchParams(window.location.search);
        const storyParam = params.get('story');
        if (!storyParam) return;

        // Finde die Gruppe und den Snap-Index für die angegebene Story
        for (let gi = 0; gi < groupedStories.length; gi++) {
            const si = groupedStories[gi].stories.findIndex(s => s.id === storyParam);
            if (si >= 0) {
                openViewer(gi, si);
                deepLinkHandledRef.current = true;
                break;
            }
        }
        // URL aufräumen
        window.history.replaceState({}, '', window.location.pathname);
    }, [stories, groupedStories]);

    // Timer starten/neustarten wenn sich Snap ändert
    useEffect(() => {
        if (viewerOpen && !paused) {
            resetAndStartTimer();
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [viewerOpen, currentGroupIndex, currentSnapIndex]);

    // Pause/Resume
    useEffect(() => {
        if (!viewerOpen) return;
        if (paused) {
            stopTimer();
        } else {
            startTimer();
        }
    }, [paused]);

    // Als gesehen markieren
    useEffect(() => {
        if (viewerOpen && currentStory && token) {
            axios.post(`/story/${currentStory.id}/gesehen`, null, { headers, withCredentials: true })
                .catch(() => { /* silent */ });
        }
    }, [viewerOpen, currentStory?.id]);

    // Tap-Handler: links = zurück, rechts = weiter
    function handleViewerTap(e: React.MouseEvent<HTMLDivElement>) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;

        if (x < width * 0.3) {
            goToPrevSnap();
        } else {
            goToNextSnap();
        }
    }

    // Long Press für Pause
    function handlePointerDown() {
        setPaused(true);
    }
    function handlePointerUp() {
        setPaused(false);
    }

    // Swipe-Gesten
    function handleTouchStart(e: React.TouchEvent) {
        touchStartX.current = e.touches[0].clientX;
    }
    function handleTouchEnd(e: React.TouchEvent) {
        const diff = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(diff) > 80) {
            if (diff < 0) {
                // Swipe links = nächste Gruppe
                if (currentGroupIndex < groupedStories.length - 1) {
                    setCurrentGroupIndex(prev => prev + 1);
                    setCurrentSnapIndex(0);
                    elapsedRef.current = 0;
                    setProgress(0);
                } else {
                    closeViewer();
                }
            } else {
                // Swipe rechts = vorherige Gruppe
                if (currentGroupIndex > 0) {
                    const prevGroup = groupedStories[currentGroupIndex - 1];
                    setCurrentGroupIndex(prev => prev - 1);
                    setCurrentSnapIndex(prevGroup.stories.length - 1);
                    elapsedRef.current = 0;
                    setProgress(0);
                }
            }
        }
    }

    // Zuschauer Dialog
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

    const verfuegbareUser = zuschauerStory
        ? allUsers.filter(u =>
            !zuschauerStory.zuschauer?.some(z => z.name === u.name) &&
            u.name !== zuschauerStory.autor?.name
        )
        : [];

    return (
        <Box ref={containerRef} sx={{ minHeight: '100vh' }}>
            <CssBaseline />

            {/* Header */}
            <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate(-1)}
                    sx={{ color: '#fff', textTransform: 'none', fontWeight: 500 }}
                >
                    Zurück
                </Button>
            </Box>

            {/* Instagram-Style Story-Kreise */}
            <Box sx={{
                display: 'flex',
                gap: 1.5,
                overflowX: 'auto',
                px: 2,
                py: 1.5,
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none'
            }}>
                {/* Neue Story erstellen */}
                <Box
                    sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', minWidth: 72 }}
                    onClick={() => setErstellenOpen(true)}
                >
                    <Box sx={{
                        width: 66,
                        height: 66,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px dashed rgba(255,255,255,0.5)',
                    }}>
                        <Avatar sx={{ width: 58, height: 58, bgcolor: 'rgba(255,255,255,0.1)' }}>
                            <AddIcon sx={{ color: '#fff', fontSize: 28 }} />
                        </Avatar>
                    </Box>
                    <Typography variant="caption" sx={{
                        mt: 0.5,
                        textAlign: 'center',
                        maxWidth: 66,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '0.68rem',
                        color: 'rgba(255,255,255,0.8)'
                    }}>
                        Deine Story
                    </Typography>
                </Box>

                {/* Story-Kreise pro Autor */}
                {groupedStories.map((group, groupIndex) => (
                    <Box
                        key={group.autorName}
                        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', minWidth: 72 }}
                        onClick={() => openViewer(groupIndex)}
                    >
                        <Box sx={{
                            width: 66,
                            height: 66,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: group.hasUnseen ? STORY_GRADIENT : STORY_SEEN_BORDER,
                            padding: '3px',
                        }}>
                            <Avatar
                                src={group.autorAvatar ? config.assetsUrl + '/' + group.autorAvatar : undefined}
                                sx={{
                                    width: 58,
                                    height: 58,
                                    border: '3px solid #000',
                                }}
                            >
                                {group.autorName?.charAt(0).toUpperCase()}
                            </Avatar>
                        </Box>
                        <Typography variant="caption" sx={{
                            mt: 0.5,
                            textAlign: 'center',
                            maxWidth: 66,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '0.68rem',
                            color: 'rgba(255,255,255,0.8)'
                        }}>
                            {group.autorName}
                        </Typography>
                    </Box>
                ))}
            </Box>

            {/* Story-Karten darunter (Übersicht) */}
            <Container maxWidth="sm" sx={{ mt: 2, px: { xs: 1, sm: 3 } }}>
                {stories.map(story => (
                    <Box key={story.id} sx={{
                        mb: 2,
                        background: 'rgba(255, 255, 255, 0.06)',
                        backdropFilter: 'blur(16px) saturate(140%)',
                        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                    }}>
                        {/* Story-Bild */}
                        <Box
                            sx={{ position: 'relative', cursor: 'pointer' }}
                            onClick={() => {
                                const gIdx = groupedStories.findIndex(g => g.autorName === story.autor?.name);
                                const sIdx = gIdx >= 0 ? groupedStories[gIdx].stories.findIndex(s => s.id === story.id) : 0;
                                if (gIdx >= 0) openViewer(gIdx, sIdx >= 0 ? sIdx : 0);
                            }}
                        >
                            <Box
                                component="img"
                                src={config.assetsUrl + '/' + story.link}
                                alt={story.titel}
                                sx={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' }}
                            />
                        </Box>

                        {/* Info */}
                        <Box sx={{ p: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Avatar
                                    src={story.autor?.avatar_url ? config.assetsUrl + '/' + story.autor.avatar_url : undefined}
                                    sx={{ width: 28, height: 28 }}
                                >
                                    {story.autor?.name?.charAt(0).toUpperCase()}
                                </Avatar>
                                <Typography variant="subtitle2" sx={{ fontSize: '0.82rem' }}>{story.autor?.name}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', fontSize: '0.7rem' }}>
                                    {new Date(story.datum).toLocaleString()}
                                </Typography>
                            </Box>
                            {story.titel && (
                                <Typography variant="body2" sx={{ fontSize: '0.82rem', mt: 0.5 }}>{story.titel}</Typography>
                            )}
                            {/* Zuschauer */}
                            {story.zuschauer && story.zuschauer.length > 0 && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                                    <VisibilityIcon sx={{ fontSize: 14 }} color="action" />
                                    <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 20, height: 20, fontSize: '0.65rem' } }}>
                                        {story.zuschauer.map(z => (
                                            <Avatar key={z.name} src={z.avatar_url ? config.assetsUrl + '/' + z.avatar_url : undefined}>
                                                {z.name?.charAt(0)}
                                            </Avatar>
                                        ))}
                                    </AvatarGroup>
                                </Box>
                            )}
                            {/* Zuschauer hinzufügen */}
                            {story.autor?.name === user?.name && (
                                <Button
                                    size="small"
                                    startIcon={<PersonAddIcon sx={{ fontSize: 14 }} />}
                                    onClick={() => openZuschauerDialog(story)}
                                    sx={{ mt: 0.5, textTransform: 'none', fontSize: '0.75rem' }}
                                >
                                    Leute hinzufügen
                                </Button>
                            )}
                        </Box>
                    </Box>
                ))}

                {stories.length === 0 && (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                        Noch keine Stories vorhanden.
                    </Typography>
                )}
            </Container>

            {/* ============================================= */}
            {/* INSTAGRAM-STYLE FULLSCREEN STORY VIEWER       */}
            {/* ============================================= */}
            {viewerOpen && currentGroup && currentStory && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 9999,
                        bgcolor: '#000',
                        display: 'flex',
                        flexDirection: 'column',
                        userSelect: 'none',
                    }}
                    onClick={handleViewerTap}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Story-Bild Vollbild */}
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Box
                            component="img"
                            src={config.assetsUrl + '/' + currentStory.link}
                            alt={currentStory.titel}
                            sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                            }}
                        />
                    </Box>

                    {/* Progress Bars oben */}
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        display: 'flex',
                        gap: '3px',
                        px: 1,
                        pt: '8px',
                        zIndex: 10,
                    }}>
                        {currentGroup.stories.map((_, idx) => (
                            <Box key={idx} sx={{
                                flex: 1,
                                height: 2.5,
                                borderRadius: 1,
                                bgcolor: 'rgba(255,255,255,0.3)',
                                overflow: 'hidden',
                            }}>
                                <Box sx={{
                                    height: '100%',
                                    borderRadius: 1,
                                    bgcolor: '#fff',
                                    width: idx < currentSnapIndex
                                        ? '100%'
                                        : idx === currentSnapIndex
                                            ? `${progress}%`
                                            : '0%',
                                    transition: idx === currentSnapIndex ? 'none' : 'width 0.2s',
                                }} />
                            </Box>
                        ))}
                    </Box>

                    {/* Header: Avatar + Name + Close */}
                    <Box sx={{
                        position: 'absolute',
                        top: 18,
                        left: 0,
                        right: 0,
                        display: 'flex',
                        alignItems: 'center',
                        px: 2,
                        zIndex: 10,
                    }}>
                        <Avatar
                            src={currentGroup.autorAvatar ? config.assetsUrl + '/' + currentGroup.autorAvatar : undefined}
                            sx={{ width: 32, height: 32, border: '2px solid #fff' }}
                        >
                            {currentGroup.autorName?.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography sx={{ ml: 1, color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>
                            {currentGroup.autorName}
                        </Typography>
                        <Typography sx={{ ml: 1, color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem' }}>
                            {currentStory.datum ? new Date(currentStory.datum).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Typography>
                        <IconButton
                            sx={{ ml: 'auto', color: '#fff' }}
                            onClick={(e) => { e.stopPropagation(); closeViewer(); }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {/* Titel unten */}
                    {currentStory.titel && (
                        <Box sx={{
                            position: 'absolute',
                            bottom: 40,
                            left: 0,
                            right: 0,
                            textAlign: 'center',
                            px: 3,
                            zIndex: 10,
                        }}>
                            <Typography sx={{
                                color: '#fff',
                                fontSize: '1rem',
                                fontWeight: 500,
                                textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                            }}>
                                {currentStory.titel}
                            </Typography>
                        </Box>
                    )}

                    {/* Zuschauer-Info unten links (nur eigene Stories) */}
                    {currentStory.autor?.name === user?.name && currentStory.angesehen && currentStory.angesehen.length > 0 && (
                        <Box sx={{
                            position: 'absolute',
                            bottom: 12,
                            left: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            zIndex: 10,
                        }}>
                            <VisibilityIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }} />
                            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
                                {currentStory.angesehen.length}
                            </Typography>
                        </Box>
                    )}
                </Box>
            )}

            {/* Story erstellen Dialog */}
            <StoryErstellen
                open={erstellenOpen}
                onClose={() => setErstellenOpen(false)}
                onCreated={fetchStories}
                token={token}
            />

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
        </Box>
    );
}
