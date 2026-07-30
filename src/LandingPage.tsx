import React, { useRef } from 'react';
import { Box, Container, Typography } from '@mui/material';
import { People, PhotoCamera, Favorite } from '@mui/icons-material';
import LiquidGlass from 'liquid-glass-react';

interface LandingPageProps {
  onLogin: () => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <Box className="landing-page">
      {/* Hero Section */}
      <Box className="landing-hero" ref={heroRef}>
        <Container maxWidth="sm" sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            <img
              src="/Social_logo_2.ico"
              alt="Social Logo"
              style={{ width: 56, height: 56 }}
            />
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 700,
                color: '#fff',
                letterSpacing: 2,
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              SOCIAL
            </Typography>
          </Box>
          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255,255,255,0.9)',
              mb: 4,
              fontWeight: 300,
              lineHeight: 1.6,
            }}
          >
            Teile Momente mit deinen Freunden und Familie.
            Deine private Community wartet auf dich.
          </Typography>

          {/* Liquid Glass Login Button */}
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <LiquidGlass
              displacementScale={50}
              blurAmount={0.08}
              saturation={160}
              aberrationIntensity={2}
              elasticity={0.25}
              cornerRadius={50}
              padding="14px 48px"
              onClick={onLogin}
              mouseContainer={heroRef}
              overLight={false}
              style={{ position: 'relative', top: 'auto', left: 'auto', transform: 'none' }}
            >
              <span style={{ 
                color: '#fff', 
                fontWeight: 600, 
                fontSize: '1.1rem',
                textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                letterSpacing: '0.5px',
              }}>
                Anmelden
              </span>
            </LiquidGlass>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
            gap: 4,
          }}
        >
          {/* Feature Card 1 */}
          <Box sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(12px) saturate(140%)',
            WebkitBackdropFilter: 'blur(12px) saturate(140%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            },
          }}>
            <PhotoCamera sx={{ fontSize: 48, color: '#1976d2', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Fotos teilen
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Lade Bilder hoch und teile besondere Momente mit deiner Community.
            </Typography>
          </Box>

          {/* Feature Card 2 */}
          <Box sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(12px) saturate(140%)',
            WebkitBackdropFilter: 'blur(12px) saturate(140%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            },
          }}>
            <People sx={{ fontSize: 48, color: '#1976d2', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Verbunden bleiben
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Bleib immer mit deinen Freunden und Familie in Kontakt.
            </Typography>
          </Box>

          {/* Feature Card 3 */}
          <Box sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(12px) saturate(140%)',
            WebkitBackdropFilter: 'blur(12px) saturate(140%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            },
          }}>
            <Favorite sx={{ fontSize: 48, color: '#1976d2', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Reaktionen
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Zeige deinen Freunden, dass dir ihre Beiträge gefallen.
            </Typography>
          </Box>
        </Box>
      </Container>

      {/* Footer */}
      <Box
        sx={{
          textAlign: 'center',
          py: 3,
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(8px)',
          color: 'text.secondary',
        }}
      >
        <Typography variant="body2">
          &copy; {new Date().getFullYear()} Social &mdash; Deine private Community
        </Typography>
      </Box>
    </Box>
  );
}
