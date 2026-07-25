import React, { useEffect, useState } from 'react';
import {
    Autocomplete,
    Avatar,
    Box,
    Chip,
    FormControl,
    InputLabel,
    ListItemAvatar,
    ListItemText,
    MenuItem,
    Select,
    TextField
} from '@mui/material';
import { Person } from './datenformat/Person';
import { ContactList } from './datenformat/ContactList';
import axios from 'axios';
import { config } from './config';

export type EmpfaengerAuswahlProps = {
    token: string | null;
    empfaenger: Person[];
    setEmpfaenger: (empfaenger: Person[]) => void;
};

export default function EmpfaengerAuswahl({ token, empfaenger, setEmpfaenger }: EmpfaengerAuswahlProps) {
    const [allUsers, setAllUsers] = useState<Person[]>([]);
    const [contactLists, setContactLists] = useState<ContactList[]>([]);
    const [modus, setModus] = useState<string>('alle');

    const headers = {
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: 'Bearer ' + token
    };

    useEffect(() => {
        if (token) {
            axios.get<Person[]>('/users', { headers, withCredentials: true })
                .then(res => setAllUsers(res.data));
            axios.get<ContactList[]>('/contactlists', { headers, withCredentials: true })
                .then(res => setContactLists(res.data));
        }
    }, [token]);

    const handleModusChange = (newModus: string) => {
        setModus(newModus);
        if (newModus === 'alle') {
            setEmpfaenger([]);
        } else if (newModus.startsWith('list:')) {
            const listId = newModus.replace('list:', '');
            const list = contactLists.find(l => l.id === listId);
            if (list) {
                setEmpfaenger(list.members || []);
            }
        }
        // 'custom' keeps current selection
    };

    return (
        <Box sx={{ mt: 2, mb: 1 }}>
            <FormControl fullWidth variant="standard" sx={{ mb: 1 }}>
                <InputLabel id="empfaenger-modus-label">Sichtbarkeit</InputLabel>
                <Select
                    labelId="empfaenger-modus-label"
                    value={modus}
                    onChange={(e) => handleModusChange(e.target.value)}
                    label="Sichtbarkeit"
                >
                    <MenuItem value="alle">Alle</MenuItem>
                    {contactLists.map(list => (
                        <MenuItem key={list.id} value={'list:' + list.id}>
                            {list.name} ({list.members?.length || 0} Mitglieder)
                        </MenuItem>
                    ))}
                    <MenuItem value="custom">Benutzerdefiniert...</MenuItem>
                </Select>
            </FormControl>

            {modus === 'custom' && (
                <Autocomplete
                    multiple
                    options={allUsers}
                    getOptionLabel={(option) => option.name}
                    value={empfaenger}
                    onChange={(_, newValue) => setEmpfaenger(newValue)}
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
                        <TextField {...params} variant="standard" label="Empfänger auswählen" />
                    )}
                />
            )}

            {modus !== 'alle' && modus !== 'custom' && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {empfaenger.map(p => (
                        <Chip
                            key={p.name}
                            avatar={<Avatar src={p.avatar_url ? config.assetsUrl + '/' + p.avatar_url : undefined}>{p.name?.charAt(0)}</Avatar>}
                            label={p.name}
                            size="small"
                        />
                    ))}
                </Box>
            )}
        </Box>
    );
}
