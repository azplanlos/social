import * as React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PeopleIcon from '@mui/icons-material/People';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import BarChartIcon from '@mui/icons-material/BarChart';
import EditIcon from '@mui/icons-material/Edit';
import ChatIcon from '@mui/icons-material/Chat';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import HomeIcon from '@mui/icons-material/Home';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { Avatar } from '@mui/material';
import { useNavigate } from 'react-router';
import { Person } from './datenformat/Person';
import { config } from './config';
import { useThemeMode } from './ThemeContext';
import { useBackground, DEFAULT_BACKGROUNDS, LIGHT_BACKGROUNDS } from './BackgroundContext';

export type DrawerOpts = {
    open: boolean, setOpen: (open: boolean) => void, account?: Person
}

export default function TemporaryDrawer(opts: DrawerOpts) {
  const navigate = useNavigate();
  const { mode, toggleTheme } = useThemeMode();
  const { currentBackground, setBackground } = useBackground();
  const isDark = mode === 'dark';

  // Farben je nach Theme-Modus
  const iconColor = isDark ? '#fff' : '#1a1a2e';
  const textColor = isDark ? '#fff' : '#1a1a2e';
  const hoverBg = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.06)';
  const dividerColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
  const drawerBg = isDark ? 'rgba(30, 30, 60, 0.8)' : 'rgba(255, 255, 255, 0.8)';
  const drawerBorder = isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)';
  const drawerShadow = isDark ? '4px 0 32px rgba(0, 0, 0, 0.2)' : '4px 0 32px rgba(0, 0, 0, 0.06)';

  const toggleDrawer = (newOpen: boolean) => () => {
    opts.setOpen(newOpen);
  };

  const handleStart = () => {
    opts.setOpen(false);
    navigate('/secure');
  };

  const handleMyProfile = () => {
    opts.setOpen(false);
    navigate('/profile');
  };

  const handleContactLists = () => {
    opts.setOpen(false);
    navigate('/contactlists');
  };

  const handleBackgrounds = () => {
    opts.setOpen(false);
    navigate('/backgrounds');
  };

  const handleStatistiken = () => {
    opts.setOpen(false);
    navigate('/statistiken');
  };

  const handleBearbeiten = () => {
    opts.setOpen(false);
    navigate('/bearbeiten');
  };

  const handleChat = () => {
    opts.setOpen(false);
    navigate('/chat');
  };

  const handleStories = () => {
    opts.setOpen(false);
    navigate('/stories');
  };

  const DrawerList = (
    <Box sx={{ width: 250, height: '100%', py: 2 }} role="presentation" onClick={toggleDrawer(false)}>
      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleStart}
            sx={{
              mx: 1,
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              '&:hover': { background: hoverBg },
            }}
          >
            <ListItemIcon>
              <HomeIcon sx={{ color: iconColor }} />
            </ListItemIcon>
            <ListItemText primary="Start" slotProps={{ primary: { sx: { color: textColor } } }} />
          </ListItemButton>
        </ListItem>
        <Divider sx={{ borderColor: dividerColor, my: 1 }} />
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleMyProfile}
            sx={{
              mx: 1,
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              '&:hover': { background: hoverBg },
            }}
          >
            <ListItemIcon>
              {opts.account?.avatar_url ? (
                <Avatar
                  src={config.assetsUrl + '/' + opts.account.avatar_url}
                  sx={{
                    width: 32,
                    height: 32,
                    border: isDark ? '2px solid rgba(255, 255, 255, 0.3)' : '2px solid rgba(0, 0, 0, 0.1)',
                  }}
                />
              ) : (
                <AccountCircleIcon sx={{ color: iconColor }} />
              )}
            </ListItemIcon>
            <ListItemText primary="Mein Profil" slotProps={{ primary: { sx: { color: textColor } } }} />
          </ListItemButton>
        </ListItem>
        <Divider sx={{ borderColor: dividerColor, my: 1 }} />
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleContactLists}
            sx={{
              mx: 1,
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              '&:hover': { background: hoverBg },
            }}
          >
            <ListItemIcon>
              <PeopleIcon sx={{ color: iconColor }} />
            </ListItemIcon>
            <ListItemText primary="Kontaktlisten" slotProps={{ primary: { sx: { color: textColor } } }} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleChat}
            sx={{
              mx: 1,
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              '&:hover': { background: hoverBg },
            }}
          >
            <ListItemIcon>
              <ChatIcon sx={{ color: iconColor }} />
            </ListItemIcon>
            <ListItemText primary="Chat" slotProps={{ primary: { sx: { color: textColor } } }} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleStories}
            sx={{
              mx: 1,
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              '&:hover': { background: hoverBg },
            }}
          >
            <ListItemIcon>
              <AutoStoriesIcon sx={{ color: iconColor }} />
            </ListItemIcon>
            <ListItemText primary="Stories" slotProps={{ primary: { sx: { color: textColor } } }} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleBackgrounds}
            sx={{
              mx: 1,
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              '&:hover': { background: hoverBg },
            }}
          >
            <ListItemIcon>
              <WallpaperIcon sx={{ color: iconColor }} />
            </ListItemIcon>
            <ListItemText primary="Hintergrund" slotProps={{ primary: { sx: { color: textColor } } }} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleStatistiken}
            sx={{
              mx: 1,
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              '&:hover': { background: hoverBg },
            }}
          >
            <ListItemIcon>
              <BarChartIcon sx={{ color: iconColor }} />
            </ListItemIcon>
            <ListItemText primary="Statistiken" slotProps={{ primary: { sx: { color: textColor } } }} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleBearbeiten}
            sx={{
              mx: 1,
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              '&:hover': { background: hoverBg },
            }}
          >
            <ListItemIcon>
              <EditIcon sx={{ color: iconColor }} />
            </ListItemIcon>
            <ListItemText primary="Bearbeiten" slotProps={{ primary: { sx: { color: textColor } } }} />
          </ListItemButton>
        </ListItem>
        <Divider sx={{ borderColor: dividerColor, my: 1 }} />
        <ListItem disablePadding>
          <ListItemButton
            onClick={(e) => {
              e.stopPropagation();
              toggleTheme();
              // Beim Wechsel automatisch einen passenden Hintergrund setzen
              const darkBgIds = DEFAULT_BACKGROUNDS.map(bg => bg.id);
              const lightBgIds = LIGHT_BACKGROUNDS.map(bg => bg.id);
              if (isDark) {
                // Wechsel zu Light: wenn aktueller BG ein dunkler ist, auf ersten Light-BG wechseln
                if (darkBgIds.includes(currentBackground.id)) {
                  setBackground(LIGHT_BACKGROUNDS[0]);
                }
              } else {
                // Wechsel zu Dark: wenn aktueller BG ein heller ist, auf ersten Dark-BG wechseln
                if (lightBgIds.includes(currentBackground.id)) {
                  setBackground(DEFAULT_BACKGROUNDS[0]);
                }
              }
            }}
            sx={{
              mx: 1,
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              '&:hover': { background: hoverBg },
            }}
          >
            <ListItemIcon>
              {isDark ? <LightModeIcon sx={{ color: iconColor }} /> : <DarkModeIcon sx={{ color: iconColor }} />}
            </ListItemIcon>
            <ListItemText
              primary={isDark ? 'Helles Design' : 'Dunkles Design'}
              slotProps={{ primary: { sx: { color: textColor } } }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
      <Drawer
        open={opts.open}
        onClose={toggleDrawer(false)}
        slotProps={{
          paper: {
            sx: {
              background: drawerBg,
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              borderRight: drawerBorder,
              boxShadow: drawerShadow,
            }
          }
        }}
      >
        {DrawerList}
      </Drawer>
  );
}
