// Importar componentes necesarios de MUI
import { TextField, IconButton, Button, FormHelperText, CircularProgress } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';

// Definir el componente NameField
export default function NameField({initialValue, value, setValue, showReset, onSave, error, color, loading }) {

  // Función para manejar la tecla Enter
  const handleKeyDown = (e) => {
    e.key === 'Enter' && onSave()
  }

  return (
    <>
      {/* Campo de texto para el nombre */}
      <TextField
        label="Name"
        variant="filled"
        fullWidth
        value={value}
        onChange={(e) => setValue(e.target.value)}
        color={color}
        error={error} // Si hay error, el campo se marcará como error
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
      {/* Botón para modificar el nombre */}
      <Button
        variant="contained"
        color={color}
        fullWidth
        sx={{ mt: 2 }}
        startIcon={!loading && <PersonIcon />}
        disabled={!showReset || loading}
        onClick={onSave}
      >
        {loading && <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />}
        Modify Name
      </Button>
    </>
  );
}