import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, LinearProgress, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import MicIcon from '@mui/icons-material/Mic';

export interface AudioPlayerProps {
  /** URL zur Audio-Datei */
  src: string;
  /** Dauer in Sekunden (optional, wird sonst aus dem Audio ermittelt) */
  duration?: number;
  /** Akzentfarbe für den Play-Button */
  accentColor?: string;
}

/**
 * Kompakter Audio-Player für Sprachnachrichten im Chat (WhatsApp-Stil).
 */
export default function AudioPlayer({ src, duration, accentColor = '#32d4ae' }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const animFrameRef = useRef<number | null>(null);

  // Audio-Element erstellen
  useEffect(() => {
    const audio = new Audio(src);
    audio.preload = 'metadata';
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (!duration && audio.duration && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    audio.onended = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      audio.pause();
      audio.src = '';
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [src, duration]);

  // Fortschritt tracken
  useEffect(() => {
    const updateProgress = () => {
      if (audioRef.current && playing) {
        setCurrentTime(audioRef.current.currentTime);
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    if (playing) {
      animFrameRef.current = requestAnimationFrame(updateProgress);
    } else if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [playing]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [playing]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !totalDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const newTime = ratio * (totalDuration);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [totalDuration]);

  const formatTime = (seconds: number) => {
    const s = Math.round(seconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 180, maxWidth: 260, py: 0.5 }}>
      {/* Play/Pause Button */}
      <IconButton
        onClick={togglePlay}
        size="small"
        sx={{
          bgcolor: accentColor,
          color: '#fff',
          '&:hover': { bgcolor: accentColor, opacity: 0.85 },
          width: 32,
          height: 32,
        }}
        aria-label={playing ? 'Pause' : 'Abspielen'}
      >
        {playing ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
      </IconButton>

      {/* Fortschrittsanzeige */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.2 }}>
        <Box
          onClick={handleProgressClick}
          sx={{ cursor: 'pointer', py: 0.5 }}
        >
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'rgba(0,0,0,0.1)',
              '& .MuiLinearProgress-bar': {
                bgcolor: accentColor,
                borderRadius: 2,
              },
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#666', fontFamily: 'monospace' }}>
            {playing || currentTime > 0 ? formatTime(currentTime) : formatTime(totalDuration)}
          </Typography>
          <MicIcon sx={{ fontSize: 12, color: accentColor, opacity: 0.7 }} />
        </Box>
      </Box>
    </Box>
  );
}
