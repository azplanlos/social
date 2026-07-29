import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import PhotoIcon from '@mui/icons-material/Photo';
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';

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
        sx={{ 
          position: 'fixed', 
          bottom: 16, 
          right: 16,
          '& .MuiFab-primary': {
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
            transition: 'all 0.2s ease',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.25)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
              transform: 'scale(1.05)',
            },
          },
        }}
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
            sx={{
              '& .MuiFab-root': {
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(16px) saturate(160%)',
                WebkitBackdropFilter: 'blur(16px) saturate(160%)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.22)',
                },
              }
            }}
            onClick={e => handleNeuerBeitrag(action.name)}
          />
        ))}
      </SpeedDial>
  );
}