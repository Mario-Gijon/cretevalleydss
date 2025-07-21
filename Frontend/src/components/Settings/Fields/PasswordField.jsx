// Importar componentes necesarios de MUI
import { TextField, IconButton, Button, FormHelperText } from '@mui/material';
// Importar iconos de MUI
import LockIcon from '@mui/icons-material/Lock';
import ClearIcon from '@mui/icons-material/Clear';
// Importar PropTypes para validación de propiedades
import PropTypes from 'prop-types';

// Definir el componente PasswordField
export default function PasswordField({ value, setValue, onSave, error, color }) {
  // Función para manejar la tecla Enter
  const handleKeyDown = (e) => e.key === 'Enter' && onSave() 

  return (
    <>
      {/* Campo de texto para la nueva contraseña */}
      <TextField
        label="New password"
        type='password'
        variant="filled"
        fullWidth
        value={value}
        onChange={(e) => setValue(e.target.value)}
        color={color}
        error={!!error} // Si hay error, el campo se marcará como error
        autoComplete="off"
        onKeyDown={value && handleKeyDown}
        InputProps={{
          endAdornment: value && (
            <IconButton onClick={() => setValue('')} color="secondary" size="small">
              <ClearIcon color={color} />
            </IconButton>
          ),
        }}
      />
      {/* Mostrar el error si existe */}
      {error && <FormHelperText error>{error}</FormHelperText>}
      {/* Botón para modificar la contraseña */}
      <Button
        variant="contained"
        color={color}
        fullWidth
        sx={{ mt: 2 }}
        startIcon={<LockIcon />}
        disabled={!value} // Habilitado solo si el campo no está vacío
        onClick={onSave}
      >
        Modify Password
      </Button>
    </>
  );
}