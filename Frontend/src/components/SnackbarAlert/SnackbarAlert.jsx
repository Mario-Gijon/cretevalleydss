
import { Snackbar, Alert, IconButton, Slide } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

function SlideTransition(props) {
  return <Slide {...props} direction="down" />;
}

export const SnackbarAlert = ({ open, onClose, message, severity="error" }) => {
  const handleClose = () => onClose();
  
  return (
    <Snackbar
      open={open}
      autoHideDuration={5000} // Se cierra automáticamente en 4 segundos
      onClose={handleClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      TransitionComponent={SlideTransition} // Animación de slide desde arriba
    >
      <Alert
        severity={severity}
        action={
          <IconButton size="small" color="inherit" onClick={handleClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        {message}
      </Alert>
    </Snackbar>
  );
};
