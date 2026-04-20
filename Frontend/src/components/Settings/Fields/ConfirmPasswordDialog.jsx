                         
import { useState } from 'react';
import LockIcon from '@mui/icons-material/Lock';
import CancelIcon from '@mui/icons-material/Cancel';
                                     
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, FormHelperText, IconButton, CircularProgress } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

                                   
export default function ConfirmPasswordDialog({ open, repeatPassword, setRepeatPassword, onCancel, onConfirm, error, loading }) {
                                                
  const [showPassword, setShowPassword] = useState(false);

                                                          
  const handleClickShowPassword = () => setShowPassword((prev) => !prev);

                                                               
  const handleKeyDown = (e) => {
    e.key === 'Enter' && onConfirm()
  }

  return (
                                            
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>Confirm new password</DialogTitle>
      <DialogContent>
        {                                               }
        <TextField
          label="Repeat Password"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          value={repeatPassword}
          onChange={(e) => setRepeatPassword(e.target.value)}
          variant="filled"
          color="secondary"
          onKeyDown={repeatPassword && handleKeyDown}
          error={error}
          InputProps={{
            endAdornment: (
              <IconButton onClick={handleClickShowPassword}>
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            ),
          }}
        />
        {error && <FormHelperText error>{error}</FormHelperText>}
        <FormHelperText sx={{ marginTop: 2 }} variant="outlined" color="text.secondary">
          You will be redirected to the login page after the password is updated.
        </FormHelperText>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<CancelIcon />} onClick={onCancel} color="error">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color="success"
          disabled={!repeatPassword || loading}
          startIcon={!loading && <LockIcon />}
        >
          {loading && <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />}
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}