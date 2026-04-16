import {
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import { GlassDialog } from "../../../../components/StyledComponents/GlassDialog";

/**
 * Confirmación para enviar evaluaciones.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onClose
 * @param {Function} props.onSubmit
 * @returns {JSX.Element}
 */
const AlternativeEvaluationSubmitDialog = ({
  open,
  onClose,
  onSubmit,
}) => {
  return (
    <GlassDialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 950 }}>Submit evaluations?</DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ color: "text.secondary" }}>
          You won&apos;t be able to modify them.
        </DialogContentText>
      </DialogContent>

      <DialogActions sx={{ gap: 1 }}>
        <Button
          variant="outlined"
          color="success"
          onClick={onSubmit}
          startIcon={<CheckCircleOutlineIcon />}
        >
          Submit
        </Button>

        <Button
          variant="outlined"
          color="warning"
          onClick={onClose}
          startIcon={<CloseIcon />}
        >
          Cancel
        </Button>
      </DialogActions>
    </GlassDialog>
  );
};

export default AlternativeEvaluationSubmitDialog;