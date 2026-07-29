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
import { Avatar } from '@mui/material';
import { useNavigate } from 'react-router';
import { Person } from './datenformat/Person';
import { config } from './config';

export type DrawerOpts = {
    open: boolean, setOpen: (open: boolean) => void, account?: Person
}

export default function TemporaryDrawer(opts: DrawerOpts) {
  const navigate = useNavigate();

  const toggleDrawer = (newOpen: boolean) => () => {
    opts.setOpen(newOpen);
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

  const DrawerList = (
    <Box sx={{ width: 250, height: '100%', py: 2 }} role="presentation" onClick={toggleDrawer(false)}>
      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleMyProfile}
            sx={{
              mx: 1,
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.15)',
              },
            }}
          >
            <ListItemIcon>
              {opts.account?.avatar_url ? (
                <Avatar
                  src={config.assetsUrl + '/' + opts.account.avatar_url}
                  sx={{
                    width: 32,
                    height: 32,
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                  }}
                />
              ) : (
                <AccountCircleIcon sx={{ color: '#fff' }} />
              )}
            </ListItemIcon>
            <ListItemText primary="Mein Profil" slotProps={{ primary: { sx: { color: '#fff' } } }} />
          </ListItemButton>
        </ListItem>
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.15)', my: 1 }} />
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleContactLists}
            sx={{
              mx: 1,
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.15)',
              },
            }}
          >
            <ListItemIcon>
              <PeopleIcon sx={{ color: '#fff' }} />
            </ListItemIcon>
            <ListItemText primary="Kontaktlisten" slotProps={{ primary: { sx: { color: '#fff' } } }} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleBackgrounds}
            sx={{
              mx: 1,
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.15)',
              },
            }}
          >
            <ListItemIcon>
              <WallpaperIcon sx={{ color: '#fff' }} />
            </ListItemIcon>
            <ListItemText primary="Hintergrund" slotProps={{ primary: { sx: { color: '#fff' } } }} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleStatistiken}
            sx={{
              mx: 1,
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.15)',
              },
            }}
          >
            <ListItemIcon>
              <BarChartIcon sx={{ color: '#fff' }} />
            </ListItemIcon>
            <ListItemText primary="Statistiken" slotProps={{ primary: { sx: { color: '#fff' } } }} />
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
              background: 'rgba(30, 30, 60, 0.8)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              borderRight: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '4px 0 32px rgba(0, 0, 0, 0.2)',
            }
          }
        }}
      >
        {DrawerList}
      </Drawer>
  );
}
