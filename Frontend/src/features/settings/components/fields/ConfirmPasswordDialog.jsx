import { useState } from 'react';
import LockIcon from '@mui/icons-material/Lock';
import CancelIcon from '@mui/icons-material/Cancel';

import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, FormHelperText, IconButton, CircularProgress } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Visibility, VisibilityOff } from '@mui/icons-material';


export default function ConfirmPasswordDialog({ open, repeatPassword, setRepeatPassword, onCancel, onConfirm, error, loading }) {

  const [showPassword, setShowPassword] = useState(false);
  const theme = useTheme();


  const handleClickShowPassword = () => setShowPassword((prev) => !prev);


  const handleKeyDown = (e) => {
    e.key === 'Enter' && onConfirm()
  }

  return (

    <Dialog
      open={open}
      onClose={onCancel}
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.secondary.main, 0.24)}`,
          background: `radial-gradient(760px 280px at 10% 0%, ${alpha(
            theme.palette.info.main,
            0.16
          )}, transparent 58%), rgba(16, 24, 34, 0.95)`,
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: "1.05rem" }}>Confirm new password</DialogTitle>
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
        <Button startIcon={<CancelIcon />} onClick={onCancel} color="error" sx={{ textTransform: "none", fontWeight: 700 }}>
          Cancel
        </Button>
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
    </Dialog>
  );
}
