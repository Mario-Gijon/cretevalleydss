import { Box, Stack, Typography } from "@mui/material";

import { GlassDialog } from "../../../../components/StyledComponents/GlassDialog";

/**
 * Diálogo de confirmación reutilizable para acciones
 * realizadas desde la pantalla de issues activos.
 *
 * @param {Object} props Props del componente.
 * @param {boolean} props.open Indica si el diálogo está abierto.
 * @param {string} props.title Título del diálogo.
 * @param {string} props.description Descripción mostrada al usuario.
 * @param {string} props.confirmText Texto del botón de confirmación.
 * @param {Function} props.onClose Acción al cerrar el diálogo.
 * @param {Function} props.onConfirm Acción al confirmar.
 * @returns {JSX.Element}
 */
const ActiveIssueConfirmDialog = ({
  open,
  title,
  description,
  confirmText = "Confirm",
  onClose,
  onConfirm,
}) => {
  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      PaperProps={{ elevation: 0 }}
      maxWidth="xs"
    >
      <Box sx={{ p: 2.25 }}>
        <Typography variant="h6" sx={{ fontWeight: 980 }}>
          {title}
        </Typography>

        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.75 }}>
          {description}
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: "flex-end" }}>
          <Box
            component="button"
            type="button"
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              background: "transparent",
              borderRadius: 12,
              padding: "8px 12px",
              cursor: "pointer",
            }}
            onClick={onClose}
          >
            Cancel
          </Box>

          <Box
            component="button"
            type="button"
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              background: "transparent",
              borderRadius: 12,
              padding: "8px 12px",
              cursor: "pointer",
            }}
            onClick={onConfirm}
          >
            {confirmText}
          </Box>
        </Stack>
      </Box>
    </GlassDialog>
  );
};

export default ActiveIssueConfirmDialog;