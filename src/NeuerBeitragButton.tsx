import Box from '@mui/material/Box';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import PhotoIcon from '@mui/icons-material/Photo';
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import { MouseEvent } from 'react';

const actions = [
  { icon: <PhotoIcon />, name: 'Teile Foto'},
  { icon: <AddAPhotoIcon />, name: 'Foto aufnehmen'}
];

export type NeuerBeitragButtonProps = {
    fotoUpload: () => void;
}

export default function NeuerBeitragButton(props: NeuerBeitragButtonProps) {
    function handleNeuerBeitrag(name: string): void {
        if (name === 'Teile Foto') {
            props.fotoUpload();
        }
    }

  return (
      <SpeedDial
        ariaLabel="SpeedDial basic example"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            slotProps={{
              tooltip: {
                title: action.name,
              }
            }}
            onClick={e => handleNeuerBeitrag(action.name)}
          />
        ))}
      </SpeedDial>
  );
}