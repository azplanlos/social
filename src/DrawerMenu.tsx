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
import { Avatar } from '@mui/material';
import { useNavigate } from 'react-router';
import { Person } from './datenformat/Person';

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

  const DrawerList = (
    <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)}>
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleMyProfile}>
            <ListItemIcon>
              {opts.account?.avatar_url ? (
                <Avatar src={opts.account.avatar_url} sx={{ width: 32, height: 32 }} />
              ) : (
                <AccountCircleIcon />
              )}
            </ListItemIcon>
            <ListItemText primary="Mein Profil" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleContactLists}>
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText primary="Kontaktlisten" />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
    </Box>
  );

  return (
      <Drawer open={opts.open} onClose={toggleDrawer(false)}>
        {DrawerList}
      </Drawer>
  );
}
