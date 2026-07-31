import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, Box, IconButton, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
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
const STORY_DURATION = 5000;

type GroupedStories = {
    autorName: string;
    autorAvatar?: string;
    stories: Story[];
    hasUnseen: boolean;
};

type StoryKreiseProps = {
    token: string | null;
    user?: Person;
};

/**
 * Wiederverwendbare Story-Kreise-Leiste (Instagram-Style) mit integriertem Fullscreen-Viewer.
 * Zeigt Kreise für jeden Autor mit ungesehenen/gesehenen Stories an.
 * Bei Klick öffnet sich die Story direkt im Fullscreen-Viewer.
 */
export default function StoryKreise({ token, user }: StoryKreiseProps) {
    const navigate = useNavigate();
    const [stories, setStories] = useState<Story[]>([]);
    const [erstellenOpen, setErstellenOpen] = useState(false);
    // Fullscreen Viewer State
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
            axios.get<Story[]>('/stories', { headers, withCredentials: true })
                .then(res => setStories(res.data))
                .catch(() => {});
        }
    }, [token]);

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
            closeViewer();
        }
    }, [currentGroup, currentSnapIndex, currentGroupIndex, groupedStories]);

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

    function openViewer(groupIndex: number) {
        setCurrentGroupIndex(groupIndex);
        setCurrentSnapIndex(0);
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
                .catch(() => {});
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

    function handlePointerDown() {
        setPaused(true);
    }
    function handlePointerUp() {
        setPaused(false);
    }

    function handleTouchStart(e: React.TouchEvent) {
        touchStartX.current = e.touches[0].clientX;
    }
    function handleTouchEnd(e: React.TouchEvent) {
        const diff = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(diff) > 80) {
            if (diff < 0) {
                if (currentGroupIndex < groupedStories.length - 1) {
                    setCurrentGroupIndex(prev => prev + 1);
                    setCurrentSnapIndex(0);
                    elapsedRef.current = 0;
                    setProgress(0);
                } else {
                    closeViewer();
                }
            } else {
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

    // Keine Stories vorhanden → nichts anzeigen
    if (stories.length === 0) return null;

    // Berechnung: 8 Kreise sichtbar, jeder 66px breit + gap
    const KREIS_BREITE = 72; // minWidth pro Kreis-Item
    const GAP = 12; // gap 1.5 = 12px
    const SICHTBARE_KREISE = 8;
    const CONTAINER_BREITE = SICHTBARE_KREISE * KREIS_BREITE + (SICHTBARE_KREISE - 1) * GAP;

    return (
        <>
            {/* Story-Kreise Leiste – zentriert, max 8 sichtbar, scrollbar */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
                py: 1.5,
            }}>
            <Box sx={{
                display: 'flex',
                gap: 1.5,
                overflowX: 'auto',
                maxWidth: CONTAINER_BREITE,
                width: '100%',
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
                scrollSnapType: 'x mandatory',
            }}>
                {/* Neue Story erstellen */}
                <Box
                    sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', minWidth: KREIS_BREITE, scrollSnapAlign: 'center' }}
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
                        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', minWidth: KREIS_BREITE, scrollSnapAlign: 'center' }}
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
            </Box>

            {/* Fullscreen Story Viewer */}
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
            <StoryErstellen
                open={erstellenOpen}
                onClose={() => setErstellenOpen(false)}
                onCreated={() => { setErstellenOpen(false); setStories(prev => [...prev]); }}
                token={token}
            />
        </>
    );
}
