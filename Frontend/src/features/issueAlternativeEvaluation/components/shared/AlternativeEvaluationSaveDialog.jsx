import {
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
} from "@mui/material";

import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import ExitToAppOutlinedIcon from "@mui/icons-material/ExitToAppOutlined";

import { GlassDialog } from "../../../../components/StyledComponents/GlassDialog";

/**
 * Confirmación para guardar borrador o salir sin guardar.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onClose
 * @param {Function} props.onSave
 * @param {Function} props.onExit
 * @returns {JSX.Element}
 */
const AlternativeEvaluationSaveDialog = ({
  open,
  onClose,
  onSave,
  onExit,
}) => {
  return (
    <GlassDialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 950 }}>Save changes?</DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ color: "text.secondary" }}>
          You have unsaved changes. Save as draft or exit without saving.
        </DialogContentText>
      </DialogContent>

      <DialogActions sx={{ gap: 1 }}>
        <Button
          variant="outlined"
          color="info"
          onClick={onSave}
          startIcon={<SaveOutlinedIcon />}
        >
          Save draft
        </Button>

        <Button
          variant="outlined"
          color="error"
          onClick={onExit}
          startIcon={<ExitToAppOutlinedIcon />}
        >
          Exit
        </Button>
      </DialogActions>
    </GlassDialog>
  );
};

export default AlternativeEvaluationSaveDialog;