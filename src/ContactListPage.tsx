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
                    sx={{ mb: 2 }}
                >
                    Zurück
                </Button>

                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h5">Kontaktlisten</Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={openCreateDialog}
                            >
                                Neue Liste
                            </Button>
                        </Box>
                        <Divider sx={{ mb: 2 }} />

                        {contactLists.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                                Noch keine Kontaktlisten vorhanden.
                            </Typography>
                        )}

                        <List>
                            {contactLists.map(list => (
                                <ListItem
                                    key={list.id}
                                    secondaryAction={
                                        <Box>
                                            <IconButton onClick={() => openEditDialog(list)} aria-label="Bearbeiten">
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton onClick={() => handleDelete(list.id!)} aria-label="Löschen">
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    }
                                >
                                    <ListItemText
                                        primary={list.name}
                                        secondary={`${list.members?.length || 0} Mitglieder`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </CardContent>
                </Card>

                {/* Create/Edit Dialog */}
                <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
                    <DialogTitle>{editingList ? 'Kontaktliste bearbeiten' : 'Neue Kontaktliste'}</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Listenname"
                            fullWidth
                            variant="standard"
                            value={listName}
                            onChange={e => setListName(e.target.value)}
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
                                <TextField {...params} variant="standard" label="Mitglieder auswählen" margin="dense" />
                            )}
                            sx={{ mt: 2 }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
                        <Button onClick={handleSave} variant="contained" disabled={!listName.trim()}>
                            Speichern
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </>
    );
}
