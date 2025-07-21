// Importa componentes de Material UI
import { Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

// Componente DeleteAccountButton
export default function DeleteAccountButton({ onClick }) {
  return (
    // Botón para eliminar la cuenta
    <Button
      variant="contained"
      color="error"
      fullWidth
      startIcon={<DeleteIcon />}
      onClick={onClick}
    >
      Delete Account
    </Button>
  );
}