import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import { ConfirmationDialog } from "../../../../components/StyledComponents/ConfirmationDialog";

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
    <ConfirmationDialog
      open={open}
      onClose={onClose}
      tone="success"
      title="Submit evaluations?"
      subtitle="You won't be able to modify them."
      actions={[
        {
          id: "cancel-submit-alternative-evaluation",
          label: "Cancel",
          color: "info",
          variant: "text",
          icon: <CancelOutlinedIcon />,
          onClick: onClose,
        },
        {
          id: "submit-alternative-evaluation",
          label: "Submit",
          color: "success",
          variant: "text",
          icon: <CheckCircleOutlineIcon />,
          autoFocus: true,
          onClick: onSubmit,
        },
      ]}
      maxWidth="xs"
      fullWidth
    />
  );
};

export default AlternativeEvaluationSubmitDialog;
