import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';

export interface VoiceRecorderProps {
  onSend: (audioFile: File, durationSeconds: number) => void;
  onCancel: () => void;
  /** Farbe des Aufnahme-Buttons */
  accentColor?: string;
}

/**
 * Sprachnachrichten-Aufnahme-Komponente.
 * Nutzt die MediaRecorder API um Audio aufzunehmen und als WebM/OGG-Datei zurückzugeben.
 */
export default function VoiceRecorder({ onSend, onCancel, accentColor = '#32d4ae' }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0); // Sekunden
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Timer starten/stoppen
  useEffect(() => {
    if (recording) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording]);

  // Aufnahme starten
  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Bevorzugtes Format: webm/opus, Fallback: was der Browser unterstützt
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        // Stream-Tracks stoppen
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };

      recorder.start(100); // Daten alle 100ms sammeln
      setRecording(true);
      setElapsed(0);
    } catch (err: any) {
      console.error('Mikrofon-Zugriff fehlgeschlagen:', err);
      setError('Mikrofon-Zugriff verweigert');
    }
  }, []);

  // Aufnahme stoppen
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  // Aufnahme verwerfen
  const handleDiscard = useCallback(() => {
    setAudioBlob(null);
    setElapsed(0);
    onCancel();
  }, [onCancel]);

  // Aufnahme senden
  const handleSend = useCallback(() => {
    if (!audioBlob) return;
    const extension = audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
    const file = new File([audioBlob], `sprachnachricht.${extension}`, { type: audioBlob.type });
    onSend(file, elapsed);
    setAudioBlob(null);
    setElapsed(0);
  }, [audioBlob, elapsed, onSend]);

  // Cleanup beim Unmounten
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Fehler-Anzeige
  if (error) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
        <Typography variant="body2" color="error">{error}</Typography>
        <IconButton size="small" onClick={onCancel}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  }

  // Aufnahme-UI: Aufnehmen oder Vorschau
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', px: 1 }}>
      {!recording && !audioBlob && (
        // Startbutton
        <IconButton
          onClick={startRecording}
          sx={{ color: accentColor }}
          aria-label="Sprachnachricht aufnehmen"
        >
          <MicIcon />
        </IconButton>
      )}

      {recording && (
        <>
          {/* Aufnahme-Indikator */}
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: '#e74c3c',
              animation: 'pulse 1s infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.3 },
              },
            }}
          />
          <Typography variant="body2" sx={{ fontFamily: 'monospace', minWidth: 40 }}>
            {formatTime(elapsed)}
          </Typography>
          <Box sx={{ flex: 1 }} />
          {/* Verwerfen */}
          <IconButton onClick={() => { stopRecording(); handleDiscard(); }} size="small" color="error" aria-label="Aufnahme abbrechen">
            <DeleteIcon fontSize="small" />
          </IconButton>
          {/* Stoppen & Senden */}
          <IconButton onClick={stopRecording} sx={{ color: accentColor }} aria-label="Aufnahme stoppen">
            <StopIcon />
          </IconButton>
        </>
      )}

      {!recording && audioBlob && (
        <>
          {/* Vorschau nach Aufnahme */}
          <MicIcon sx={{ color: accentColor, fontSize: 20 }} />
          <Typography variant="body2" sx={{ fontFamily: 'monospace', minWidth: 40 }}>
            {formatTime(elapsed)}
          </Typography>
          <Box sx={{ flex: 1 }} />
          {/* Verwerfen */}
          <IconButton onClick={handleDiscard} size="small" color="error" aria-label="Sprachnachricht verwerfen">
            <DeleteIcon fontSize="small" />
          </IconButton>
          {/* Senden */}
          <IconButton onClick={handleSend} sx={{ color: accentColor }} aria-label="Sprachnachricht senden">
            <SendIcon />
          </IconButton>
        </>
      )}
    </Box>
  );
}
