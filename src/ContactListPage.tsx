import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Container,
    CssBaseline,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemText,
    TextField,
    Typography,
    Autocomplete,
    Avatar,
    ListItemAvatar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import axios from 'axios';
import { useNavigate } from 'react-router';
import { Person } from './datenformat/Person';
import { ContactList } from './datenformat/ContactList';
import { config } from './config';

export type ContactListPageProps = {
    token: string | null;
};

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

// Liquid Glass IconButton Styles
const glassIconButtonSx = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#fff',
    transition: 'all 0.2s ease',
    '&:hover': {
        background: 'rgba(255, 255, 255, 0.2)',
        transform: 'scale(1.05)',
    },
};

export default function ContactListPage({ token }: ContactListPageProps) {
    const navigate = useNavigate();
    const [contactLists, setContactLists] = useState<ContactList[]>([]);
    const [allUsers, setAllUsers] = useState<Person[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingList, setEditingList] = useState<ContactList | null>(null);
    const [listName, setListName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<Person[]>([]);

    const headers = {
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: 'Bearer ' + token
    };

    const fetchContactLists = () => {
        axios.get<ContactList[]>('/contactlists', { headers, withCredentials: true })
            .then(res => setContactLists(res.data))
            .catch(err => console.error('Fehler beim Laden der Kontaktlisten', err));
    };

    const fetchAllUsers = () => {
        axios.get<Person[]>('/users', { headers, withCredentials: true })
            .then(res => setAllUsers(res.data))
            .catch(err => console.error('Fehler beim Laden der Benutzer', err));
    };

    useEffect(() => {
        if (token) {
            fetchContactLists();
            fetchAllUsers();
        }
    }, [token]);

    const openCreateDialog = () => {
        setEditingList(null);
        setListName('');
        setSelectedMembers([]);
        setDialogOpen(true);
    };

    const openEditDialog = (list: ContactList) => {
        setEditingList(list);
        setListName(list.name);
        setSelectedMembers(list.members || []);
        setDialogOpen(true);
    };

    const handleSave = () => {
        const payload: ContactList = {
            name: listName,
            members: selectedMembers
        };

        if (editingList && editingList.id) {
            axios.put('/contactlists/' + editingList.id, payload, { headers, withCredentials: true })
                .then(() => {
                    setDialogOpen(false);
                    fetchContactLists();
                });
        } else {
            axios.post('/contactlists', payload, { headers, withCredentials: true })
                .then(() => {
                    setDialogOpen(false);
                    fetchContactLists();
                });
        }
    };

    const handleDelete = (id: string) => {
        axios.delete('/contactlists/' + id, { headers, withCredentials: true })
            .then(() => fetchContactLists());
    };

    return (
        <>
            <CssBaseline />
            <Container maxWidth="sm" sx={{ mt: 4 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/secure')}
                    sx={{ ...glassButtonSx, mb: 2, px: 3, py: 1 }}
                >
                    Zurück
                </Button>

                <Card sx={glassCardSx}>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h5" sx={{ color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                                Kontaktlisten
                            </Typography>
                            <Button
                                startIcon={<AddIcon />}
                                onClick={openCreateDialog}
                                sx={glassButtonSx}
                            >
                                Neue Liste
                            </Button>
                        </Box>
                        <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

                        {contactLists.length === 0 && (
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                Noch keine Kontaktlisten vorhanden.
                            </Typography>
                        )}

                        <List>
                            {contactLists.map(list => (
                                <ListItem
                                    key={list.id}
                                    sx={{
                                        mb: 1,
                                        borderRadius: '12px',
                                        background: 'rgba(255, 255, 255, 0.06)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        transition: 'all 0.2s ease',
                                        flexWrap: { xs: 'wrap', sm: 'nowrap' },
                                        '&:hover': {
                                            background: 'rgba(255, 255, 255, 0.12)',
                                        },
                                    }}
                                    secondaryAction={
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <IconButton onClick={() => openEditDialog(list)} aria-label="Bearbeiten" size="small" sx={glassIconButtonSx}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton onClick={() => handleDelete(list.id!)} aria-label="Löschen" size="small" sx={glassIconButtonSx}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    }
                                >
                                    <ListItemText
                                        primary={list.name}
                                        secondary={`${list.members?.length || 0} Mitglieder`}
                                        slotProps={{
                                            primary: { sx: { color: '#fff' } },
                                            secondary: { sx: { color: 'rgba(255, 255, 255, 0.6)' } },
                                        }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </CardContent>
                </Card>

                {/* Create/Edit Dialog mit Liquid Glass */}
                <Dialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    fullWidth
                    maxWidth="sm"
                    slotProps={{
                        paper: {
                            sx: {
                                background: 'rgba(30, 30, 60, 0.85)',
                                backdropFilter: 'blur(24px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '20px',
                                boxShadow: '0 16px 64px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                                color: '#fff',
                            }
                        }
                    }}
                >
                    <DialogTitle sx={{ color: '#fff' }}>
                        {editingList ? 'Kontaktliste bearbeiten' : 'Neue Kontaktliste'}
                    </DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Listenname"
                            fullWidth
                            variant="standard"
                            value={listName}
                            onChange={e => setListName(e.target.value)}
                            sx={{
                                '& .MuiInput-underline:before': { borderBottomColor: 'rgba(255,255,255,0.3)' },
                                '& .MuiInput-underline:hover:before': { borderBottomColor: 'rgba(255,255,255,0.5)' },
                                '& .MuiInput-underline:after': { borderBottomColor: '#fff' },
                                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
                                '& .MuiInputBase-input': { color: '#fff' },
                            }}
                        />
                        <Autocomplete
                            multiple
                            options={allUsers}
                            getOptionLabel={(option) => option.name}
                            value={selectedMembers}
                            onChange={(_, newValue) => setSelectedMembers(newValue)}
                            isOptionEqualToValue={(option, value) => option.name === value.name}
                            renderOption={(props, option) => (
                                <li {...props} key={option.name}>
                                    <ListItemAvatar>
                                        <Avatar src={option.avatar_url ? config.assetsUrl + '/' + option.avatar_url : undefined} sx={{ width: 32, height: 32 }}>
                                            {option.name?.charAt(0).toUpperCase()}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText primary={option.name} />
                                </li>
                            )}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    variant="standard"
                                    label="Mitglieder auswählen"
                                    margin="dense"
                                    sx={{
                                        '& .MuiInput-underline:before': { borderBottomColor: 'rgba(255,255,255,0.3)' },
                                        '& .MuiInput-underline:hover:before': { borderBottomColor: 'rgba(255,255,255,0.5)' },
                                        '& .MuiInput-underline:after': { borderBottomColor: '#fff' },
                                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.6)' },
                                        '& .MuiInputBase-input': { color: '#fff' },
                                    }}
                                />
                            )}
                            sx={{ mt: 2 }}
                        />
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={() => setDialogOpen(false)} sx={{ ...glassButtonSx, px: 3 }}>
                            Abbrechen
                        </Button>
                        <Button onClick={handleSave} disabled={!listName.trim()} sx={{ ...glassButtonSx, px: 3 }}>
                            Speichern
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </>
    );
}
