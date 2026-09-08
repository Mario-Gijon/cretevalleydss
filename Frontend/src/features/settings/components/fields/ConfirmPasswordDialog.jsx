import { useState } from 'react';
import LockIcon from '@mui/icons-material/Lock';

import { DialogContent, TextField, DialogActions, Button, FormHelperText, IconButton, CircularProgress } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { AppDialog } from '../../../../components/StyledComponents/AppDialog';


export default function ConfirmPasswordDialog({ open, repeatPassword, setRepeatPassword, onCancel, onConfirm, error, loading }) {

  const [showPassword, setShowPassword] = useState(false);


  const handleClickShowPassword = () => setShowPassword((prev) => !prev);


  const handleKeyDown = (e) => {
    e.key === 'Enter' && onConfirm()
  }

  return (

    <AppDialog
      open={open}
      onClose={onCancel}
      title="Confirm new password"
      icon={<LockIcon />}
      maxWidth="xs"
    >
      <DialogContent>
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
          sx={{
            mt: 0.5,
            "& .MuiFilledInput-root": {
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
            },
          }}
        />
        {error && <FormHelperText error>{error}</FormHelperText>}
        <FormHelperText sx={{ marginTop: 2 }} variant="outlined" color="text.secondary">
          You will be redirected to the login page after the password is updated.
        </FormHelperText>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onConfirm}
          color="success"
          disabled={!repeatPassword || loading}
          startIcon={!loading && <LockIcon />}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {loading && <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />}
          Confirm
        </Button>
      </DialogActions>
    </AppDialog>
  );
}
