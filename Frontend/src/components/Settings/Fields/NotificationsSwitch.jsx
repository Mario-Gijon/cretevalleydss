// Importar componentes necesarios de MUI
import { FormControlLabel, Switch } from '@mui/material';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PropTypes from 'prop-types';

// Definir el componente NotificationsSwitch
export default function NotificationsSwitch({ value, setValue }) {
  return (
    <FormControlLabel
      // Control del interruptor
      control={
        <Switch
          color="secondary"
          checked={value}
          onChange={() => setValue(!value)}
        />
      }
      // Etiqueta del interruptor
      label={
        <>
          {value ? <NotificationsIcon sx={{ mr: 1 }} /> : <NotificationsOffIcon sx={{ mr: 1 }} />}
          Email Notifications
        </>
      }
    />
  );
}
