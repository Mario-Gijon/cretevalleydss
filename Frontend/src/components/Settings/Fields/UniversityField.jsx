// Importar componentes de MUI
import { TextField, IconButton, Button, FormHelperText, CircularProgress } from '@mui/material';
// Importar iconos de MUI
import RefreshIcon from '@mui/icons-material/Refresh';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
// Importar PropTypes para validación de propiedades
import PropTypes from 'prop-types';

// Definir el componente UniversityField
export default function UniversityField({ initialValue, value, setValue, showReset, onSave, error, color, loading }) {
  // Función para manejar la tecla Enter
  const handleKeyDown = (e) => {
    // Si la tecla presionada es Enter, llamar a la función onSave
    e.key === 'Enter' && onSave()
  }

  return (
    <>
      {/* Campo de texto para el nombre de usuario */}
      <TextField
        label="University"
        variant="filled"
        fullWidth
        value={value}
        onChange={(e) => setValue(e.target.value)}
        color={color}
        error={!!error} // Si hay error, el campo se marcará como error
        autoComplete="off"
        onKeyDown={showReset && handleKeyDown}
        InputProps={{
          endAdornment: showReset ? (
            <IconButton onClick={() => setValue(initialValue)} color="secondary" sx={{ ml: 1 }} size="small">
              <RefreshIcon color={color} />
            </IconButton>
          ) : null,
        }}
      />
      {/* Mostrar el error si existe */}
      {error && <FormHelperText error>{error}</FormHelperText>}
      {/* Botón para modificar el nombre de usuario */}
      <Button
        variant="contained"
        color={color}
        fullWidth
        sx={{ mt: 2 }}
        startIcon={!loading && <AccountCircleIcon />}
        disabled={!showReset || loading} // Deshabilitar si no hay reset o si está en carga
        onClick={onSave}
      >
        {loading && <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />}
        Modify university
      </Button>
    </>
  );
}