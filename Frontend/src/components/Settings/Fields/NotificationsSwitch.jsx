                                         
import { FormControlLabel, Switch } from '@mui/material';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PropTypes from 'prop-types';

                                            
export default function NotificationsSwitch({ value, setValue }) {
  return (
    <FormControlLabel
                                
      control={
        <Switch
          color="secondary"
          checked={value}
          onChange={() => setValue(!value)}
        />
      }
                                 
      label={
        <>
          {value ? <NotificationsIcon sx={{ mr: 1 }} /> : <NotificationsOffIcon sx={{ mr: 1 }} />}
          Email Notifications
        </>
      }
    />
  );
}
