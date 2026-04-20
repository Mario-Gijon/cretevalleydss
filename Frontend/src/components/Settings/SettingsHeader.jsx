                              
import { IconButton, Typography, Stack } from '@mui/material';
                         
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
                                       
export default function SettingsHeader({ handleClose }) {
  return (
                          
    <Stack direction={"row"} justifyContent={"space-between"} p={2} alignItems={"center"} pb={1} pt={1}>
      {                                        }
      <Typography sx={{ ml: 1, flex: 1 }} variant="h5">
        Settings
      </Typography>
      {                                  }
      <IconButton color='inherit' onClick={handleClose} aria-label="close">
        <ExpandLessIcon fontSize='large' />
      </IconButton>
    </Stack>

  );
}
