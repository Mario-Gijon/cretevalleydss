// Importa hooks de React
import { useState } from 'react';
import PropTypes from 'prop-types';
import LockIcon from '@mui/icons-material/Lock';
import CancelIcon from '@mui/icons-material/Cancel';
// Importa componentes de Material UI
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, FormHelperText, IconButton, CircularProgress } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

// Componente ConfirmPasswordDialog
export default function ConfirmPasswordDialog({ open, repeatPassword, setRepeatPassword, onCancel, onConfirm, error, loading }) {
  // Estado para mostrar u ocultar la contraseña
  const [showPassword, setShowPassword] = useState(false);

  // Función para alternar la visibilidad de la contraseña
  const handleClickShowPassword = () => setShowPassword((prev) => !prev);

  // Maneja el evento de presionar "Enter" en el campo de texto
  const handleKeyDown = (e) => {
    e.key === 'Enter' && onConfirm()
  }

  return (
    // Diálogo de confirmación de contraseña
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>Confirm new password</DialogTitle>
      <DialogContent>
        {/* Campo de texto para repetir la contraseña */}
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