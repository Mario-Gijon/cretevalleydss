// Importa componentes de Material UI
import { Dialog, DialogActions, CircularProgress, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';

// Componente ConfirmDeleteDialog
export default function ConfirmDeleteDialog({ open, handleCancel, loading, handleDelete }) {
  return (
    // Diálogo de confirmación de eliminación
    <Dialog
      open={open}
      onClose={handleCancel}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title" color='error'>Delete Account</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description">
          Are you sure you want to delete your account? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color="success" startIcon={<CancelIcon />}>
          Cancel
        </Button>
        <Button onClick={handleDelete} color="error" autoFocus disabled={loading} startIcon={!loading && <DeleteIcon />}>
        {loading && <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />}
          Confirm
        </Button>


      </DialogActions>
    </Dialog>
  );
}