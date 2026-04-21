import { Stack, Typography, Box } from "@mui/material";

import { GlassDialog } from "../../../components/StyledComponents/GlassDialog";

/**
 * Diálogo de confirmación para eliminar un issue finalizado.
 *
 * @param {Object} props Props del componente.
 * @param {boolean} props.open Estado de apertura.
 * @param {boolean} props.removeLoading Estado de carga de eliminación.
 * @param {Function} props.onClose Acción de cierre.
 * @param {Function} props.onConfirm Acción de confirmación.
 * @returns {JSX.Element}
 */
const FinishedIssueRemoveDialog = ({
  open,
  removeLoading,
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
          Are you sure you want to remove this issue?
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.75 }}>
          Other users will still be able to see it.
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: "flex-end" }}>
          <Box
            component="button"
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
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              background: "transparent",
              borderRadius: 12,
              padding: "8px 12px",
              cursor: "pointer",
              opacity: removeLoading ? 0.7 : 1,
            }}
            onClick={onConfirm}
            disabled={removeLoading}
          >
            {removeLoading ? "Removing..." : "Remove"}
          </Box>
        </Stack>
      </Box>
    </GlassDialog>
  );
};

export default FinishedIssueRemoveDialog;
