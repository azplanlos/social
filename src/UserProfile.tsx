import { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  CssBaseline,
  Divider,
  Typography
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router';
import { Person } from './datenformat/Person';
import { Beitrag } from './datenformat/Beitrag';
import BeitragCard from './BeitragCard';
import axios from 'axios';
import { config } from './config';

// Gemeinsame Liquid Glass Card Styles
const glassCardSx = {
  background: 'rgba(255, 255, 255, 0.12)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '20px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
  color: '#fff',
};

// Gemeinsame Liquid Glass Button Styles
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

export type UserProfileProps = {
  token: string | null;
};

export default function UserProfile({ token }: UserProfileProps) {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<Person | null>(null);
  const [beitraege, setBeitraege] = useState<Beitrag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name || !token) return;

    setLoading(true);
    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      Authorization: 'Bearer ' + token,
    };

    Promise.all([
      axios.get<Person>(`/user/${encodeURIComponent(name)}`, { headers, withCredentials: true }),
      axios.get<Beitrag[]>(`/beitraege/user/${encodeURIComponent(name)}`, { headers, withCredentials: true }),
    ])
      .then(([personRes, beitraegeRes]) => {
        setPerson(personRes.data);
        setBeitraege(beitraegeRes.data);
      })
      .catch((err) => {
        console.error('Fehler beim Laden des Profils', err);
      })
      .finally(() => setLoading(false));
  }, [name, token]);

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!person) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ ...glassButtonSx, mb: 2, px: 3, py: 1 }}
        >
          Zurück
        </Button>
        <Typography variant="h6" sx={{ color: '#fff' }}>
          Nutzer nicht gefunden.
        </Typography>
      </Container>
    );
  }

  return (
    <>
      <CssBaseline />
      <Container maxWidth="sm" sx={{ mt: 4, px: { xs: 1, sm: 3 } }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ ...glassButtonSx, mb: 2, px: 3, py: 1 }}
        >
          Zurück
        </Button>

        <Card sx={{ ...glassCardSx, mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
              <Avatar
                src={person.avatar_url ? config.assetsUrl + '/' + person.avatar_url : undefined}
                sx={{
                  width: 120,
                  height: 120,
                  fontSize: 48,
                  border: '3px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
                }}
              >
                {person.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h5" sx={{ mt: 2, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                {person.name}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {beitraege.length} {beitraege.length === 1 ? 'Beitrag' : 'Beiträge'}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

        {beitraege.length === 0 ? (
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>
            Keine Beiträge vorhanden.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            {beitraege.map((beitrag) => (
              <BeitragCard
                key={beitrag.id}
                beitrag={beitrag}
                bearbeiten={false}
                refetch={() => {}}
                token={token}
              />
            ))}
          </Box>
        )}
      </Container>
    </>
  );
}
