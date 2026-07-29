import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import axios from 'axios';
import useAxios from 'axios-hooks';
import BeitragCard from './BeitragCard';
import { Beitrag } from './datenformat/Beitrag';
import { CircularProgress, Container, CssBaseline, IconButton, Button, Snackbar, Alert } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import liquidGlassTheme from './theme';
import Navbar from './Navbar';
import DrawerMenu from './DrawerMenu';
import NeuerBeitragButton from './NeuerBeitragButton';
import FotoUpload from './FotoUpload';
import { Person } from './datenformat/Person';
import Compress from 'compress.js';
import { useSessionStorage } from '@uidotdev/usehooks';
import ImageViewer from 'simple-image-viewer-react19';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Notifications } from '@mui/icons-material';
import Token from './Token';
import MyProfile from './MyProfile';
import ContactListPage from './ContactListPage';
import PullToRefresh from './PullToRefresh';
import LandingPage from './LandingPage';
import { config } from './config';
import { usePushNotifications } from './usePushNotifications';
import { BackgroundProvider } from './BackgroundContext';
import BackgroundSettings from './BackgroundSettings';
import StatistikenPage from './StatistikenPage';

// Set axios base URL from config (empty string for local dev = relative URLs via proxy)
axios.defaults.baseURL = config.apiUrl;

// Redirect to login on 401 responses (token expired or invalid)
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem("token");
      // Only redirect if not already on the landing page to avoid infinite reload loops
      if (window.location.pathname !== "/") {
        // Trigger login with current path as state so we return here after auth
        triggerLogin(window.location.pathname + window.location.search);
      }
    }
    return Promise.reject(error);
  }
);

/** Starts the OIDC login flow. targetPath is encoded in the state parameter so we can navigate back after auth. */
function triggerLogin(targetPath: string = '/secure') {
  const authorizeUrl = config.oidc.authority.includes('/realms/')
    ? `${config.oidc.authority}/protocol/openid-connect/auth`
    : `${config.oidc.authority}/oauth/v2/authorize`;
  const redirectUri = window.location.origin + config.oidc.redirectPath;
  const nonce = Math.random().toString(36).substring(2);
  const state = encodeURIComponent(targetPath);
  window.location.href = `${authorizeUrl}?response_type=id_token%20token&client_id=${config.oidc.clientId}&scope=${encodeURIComponent(config.oidc.scope)}&redirect_uri=${encodeURIComponent(redirectUri)}&nonce=${nonce}&state=${state}`;
}

interface PageResponse {
  content: Beitrag[];
  last: boolean;
  number: number;
  totalPages: number;
  totalElements: number;
}


function App() {

  const [token, setToken] = useSessionStorage<string | null>("token", null);

  // Register push notifications when user is authenticated
  const { pushState, subscribeToPush } = usePushNotifications(token);

  const [{data: user, loading: loadingUser, error: userError}, refetchUser] = useAxios<Person>({
    url: '/account',
    headers: { "X-Requested-With": 'XMLHttpRequest',
      Authorization: 'Bearer ' + token
    },
    withCredentials: true
  }, { manual: !token });
  const [open, setOpen] = React.useState(false);
  const [bild, setBild] = React.useState<Blob>();

  // Infinite scrolling state
  const [beitraege, setBeitraege] = useState<Beitrag[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  // Deep link: target beitrag ID from query parameter
  const [targetBeitragId, setTargetBeitragId] = useState<string | null>(null);
  const targetScrolledRef = useRef(false);

  const fetchPage = useCallback((pageNum: number, reset: boolean = false): Promise<void> => {
    if (loading) return Promise.resolve();
    setLoading(true);
    return axios.get<PageResponse>('/beitraege', {
      params: { page: pageNum, size: 10 },
      headers: { "X-Requested-With": 'XMLHttpRequest', Authorization: 'Bearer ' + token },
      withCredentials: true
    }).then(response => {
      const data = response.data;
      setBeitraege(prev => reset ? data.content : [...prev, ...data.content]);
      setHasMore(!data.last);
      setPage(data.number);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [token, loading]);

  // Initial load
  useEffect(() => {
    if (token) {
      fetchPage(0, true);
    } else if (window.location.pathname === '/secure') {
      // No token but on /secure (e.g. from push notification deep link)
      // Trigger login flow with current path+query as state
      triggerLogin(window.location.pathname + window.location.search);
    }
  }, [token]);

  // Read deep link query parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const beitragParam = params.get('beitrag');
    if (beitragParam) {
      setTargetBeitragId(beitragParam);
      targetScrolledRef.current = false;
    }
  }, []);

  // Deep link: keep loading pages until target beitrag is found, then scroll to it
  useEffect(() => {
    if (!targetBeitragId || targetScrolledRef.current) return;

    const targetIndex = beitraege.findIndex(b => b.id === targetBeitragId);
    if (targetIndex >= 0) {
      // Found it — scroll to it
      setTimeout(() => {
        const el = refs.current[targetIndex];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetScrolledRef.current = true;
          setTargetBeitragId(null);
          // Clean up the URL query param
          window.history.replaceState({}, '', window.location.pathname);
        }
      }, 100);
    } else if (hasMore && !loading) {
      // Not found yet — load next page
      fetchPage(page + 1);
    }
  }, [beitraege, targetBeitragId, hasMore, loading, page, fetchPage]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchPage(page + 1);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, page, fetchPage]);

  const refetch = useCallback(() => {
    setBeitraege([]);
    setPage(0);
    setHasMore(true);
    return fetchPage(0, true);
  }, [fetchPage]);

  const [bearbeiten, setBearbeiten] = React.useState(false);
  const [upload, setUpload] = React.useState(false);
  const [titel, setTitel] = React.useState("");
  const [beschreibung, setBeschreibung] = React.useState("");
  const [disabled, setDisabled] = React.useState(false);
  const [empfaenger, setEmpfaenger] = React.useState<Person[]>([]);
  const [visibleState, setVisibleState] = React.useState<string[]>([]);
  const refs = useRef<Element[]>([]);
  const [currentImage, setCurrentImage] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  let cards;
  useEffect(() => {
    console.log("data " + beitraege?.length);
    refs.current = refs.current.slice(0, beitraege?.length || 0);
  }, [beitraege]);
  if (!loading || beitraege.length > 0) {
    cards = beitraege.map((beitrag, i) => <div key={beitrag.id} ref={el => { if (el) refs.current[i] = el}}>
      <BeitragCard beitrag={beitrag} bearbeiten={false} user={user} refetch={refetch} onClick={() => openImageViewer(i)} token={token} />
      </div>
      );
  }

  const openImageViewer = useCallback((index: number) => {
    setCurrentImage(index);
    setIsViewerOpen(true);
  }, []);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.filter(e => e.isIntersecting).forEach(e => {
            const index = refs.current.indexOf(e.target);
            const beitrag = beitraege[index];
            if (!beitrag) return;
            console.log('sichtbar', index, e);
            if (!visibleState.includes(beitrag.id)) {
              console.log("update", index);
              visibleState.push(beitrag.id);
              axios.post("/beitrag/" + beitrag.id + "/gelesen", null, {
                headers: { "X-Requested-With": 'XMLHttpRequest',
                Authorization: 'Bearer ' + token
               },
                withCredentials: true
              }).then(resp => {
                console.log("Gelesen-Response:", resp.status);
              }, error => {
                console.log("Gelesen-Error:", error);
              });
            }
          });
        },
      { threshold: 0.25, rootMargin: "50px" }
    );
    refs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [beitraege, user]);

  function loadBild(file: File) {
    const compressor = new Compress();

    compressor.compress([file], {
      quality: 0.8,
      maxWidth: 500,
      maxHeight: 500,
    }).then(file => {
      setBild(Compress.convertBase64ToFile(file[0].data, file[0].ext));
    });
  }

  function finishBearbeiten(b: boolean): void {
    if (bearbeiten === true && b === false) {
      refetch();
      setEmpfaenger([]);
    }
    setBearbeiten(b);
  }

  

  return (
    <BackgroundProvider>
    <ThemeProvider theme={liquidGlassTheme}>
    <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage onLogin={() => triggerLogin('/secure')} />} />
          <Route path={config.oidc.redirectPath} element={<Token setToken={setToken} />} />
          <Route path="/profile" element={
            user ? <MyProfile user={user} token={token} onAvatarUpdated={refetchUser} /> : <></>
          } />
          <Route path="/contactlists" element={
            <ContactListPage token={token} />
          } />
          <Route path="/backgrounds" element={
            <BackgroundSettings />
          } />
          <Route path="/statistiken" element={
            <StatistikenPage token={token} />
          } />
          <Route path="/secure" element={
            <>
              { isViewerOpen &&
                <ImageViewer
                  src={ beitraege.map(beitrag => config.assetsUrl + '/' + beitrag.link) }
                  alt={ beitraege.map(b => b.titel) }
                  disableScroll={ true }
                  closeOnClickOutside={ true }
                  closeOnClickInside={ true }
                  currentIndex={currentImage}
                  onClose={() => setIsViewerOpen(false)}
                />
              }
              {!isViewerOpen && user && <>
              <CssBaseline />
              <Navbar drawerOpen={setOpen} account={user} token={token} />
              <DrawerMenu open={open} setOpen={setOpen} account={user} />
              <NeuerBeitragButton fotoUpload={() => setUpload(true)} />
              <FotoUpload waehlen={upload} onSelected={(file: File) => {setBearbeiten(true); setUpload(false); loadBild(file)}} />
              <PullToRefresh onRefresh={refetch}>
              <Container maxWidth="sm" sx={{marginTop: "64px"}}>
                {pushState === 'prompt' && (
                  <Alert
                    severity="info"
                    sx={{ mb: 2 }}
                    action={
                      <Button color="inherit" size="small" startIcon={<Notifications />} onClick={subscribeToPush}>
                        Aktivieren
                      </Button>
                    }
                  >
                    Push-Benachrichtigungen aktivieren, um über neue Beiträge informiert zu werden.
                  </Alert>
                )}
                {bearbeiten && <BeitragCard bearbeiten user={user} bild={bild} titel={titel} beschreibung={beschreibung} setTitel={setTitel}
                setBeschreibung={setBeschreibung} setBearbeiten={finishBearbeiten} disabled={disabled} setDisabled={setDisabled} empfaenger={empfaenger} setEmpfaenger={setEmpfaenger} refetch={refetch} token={token}></BeitragCard>}
                {cards}
                {hasMore && <div ref={loaderRef} style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                  <CircularProgress />
                </div>}
              </Container>
              </PullToRefresh>
              </>
              }
              </>
          } />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
    </BackgroundProvider>
  );
}

export default App;
