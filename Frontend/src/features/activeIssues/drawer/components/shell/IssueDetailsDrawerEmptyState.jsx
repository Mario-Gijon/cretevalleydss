import { IconButton, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

/**
 * Estado vacío del drawer cuando no hay issue seleccionado.
 *
 * @param {Object} props Props del componente.
 * @param {Function} props.onClose Acción de cierre.
 * @returns {JSX.Element}
 */
const IssueDetailsDrawerEmptyState = ({ onClose }) => {
  return (
    <Stack sx={{ p: 3 }} spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" sx={{ fontWeight: 980 }}>
          Issue details
        </Typography>

        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>

      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Select an issue to see details.
      </Typography>
    </Stack>
  );
};

export default IssueDetailsDrawerEmptyState;