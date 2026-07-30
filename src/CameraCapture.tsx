import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import ReplayIcon from '@mui/icons-material/Replay';
import FlipCameraIosIcon from '@mui/icons-material/FlipCameraIos';

export type CameraCaptureProps = {
  open: boolean;
  onCapture: (file: File) => void;
  onClose: () => void;
};

function CameraCapture({ open, onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    try {
      // Vorherigen Stream stoppen
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Kamera-Zugriff fehlgeschlagen:', err);
      setError('Kamera konnte nicht geöffnet werden. Bitte erlaube den Kamera-Zugriff.');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) {
      startCamera(facingMode);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setError(null);
    onClose();
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (!capturedImage) return;

    // Data-URL in File umwandeln
    const byteString = atob(capturedImage.split(',')[1]);
    const mimeString = capturedImage.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    const file = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' });

    onCapture(file);
    setCapturedImage(null);
    handleClose();
  };

  const handleFlipCamera = () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  if (!open) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        backgroundColor: '#000',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Obere Leiste mit Schliessen-Button */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
        }}
      >
        <IconButton onClick={handleClose} sx={{ color: '#fff' }}>
          <CloseIcon fontSize="large" />
        </IconButton>
        {!capturedImage && !error && (
          <IconButton onClick={handleFlipCamera} sx={{ color: '#fff' }}>
            <FlipCameraIosIcon fontSize="large" />
          </IconButton>
        )}
      </Box>

      {/* Kamera-Vorschau oder aufgenommenes Bild */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {error ? (
          <Typography variant="h6" sx={{ color: '#fff', textAlign: 'center', px: 3 }}>
            {error}
          </Typography>
        ) : capturedImage ? (
          <img
            src={capturedImage}
            alt="Aufgenommenes Foto"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
      </Box>

      {/* Untere Steuerungsleiste */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 4,
          py: 4,
          background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
        }}
      >
        {capturedImage ? (
          <>
            {/* Nochmal aufnehmen */}
            <IconButton
              onClick={handleRetake}
              sx={{
                color: '#fff',
                backgroundColor: 'rgba(255,255,255,0.2)',
                width: 56,
                height: 56,
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
              }}
            >
              <ReplayIcon fontSize="large" />
            </IconButton>

            {/* Bestätigen */}
            <IconButton
              onClick={handleConfirm}
              sx={{
                color: '#fff',
                backgroundColor: '#4caf50',
                width: 64,
                height: 64,
                '&:hover': { backgroundColor: '#388e3c' },
              }}
            >
              <CheckIcon fontSize="large" />
            </IconButton>
          </>
        ) : (
          !error && (
            /* Auslöser-Button */
            <IconButton
              onClick={handleCapture}
              sx={{
                width: 72,
                height: 72,
                border: '4px solid #fff',
                backgroundColor: 'rgba(255,255,255,0.2)',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
                '&:active': { backgroundColor: 'rgba(255,255,255,0.5)', transform: 'scale(0.92)' },
                transition: 'all 0.1s ease',
              }}
            >
              <CameraAltIcon sx={{ color: '#fff', fontSize: 32 }} />
            </IconButton>
          )
        )}
      </Box>

      {/* Verstecktes Canvas zum Aufnehmen des Bildes */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </Box>
  );
}

export default CameraCapture;
