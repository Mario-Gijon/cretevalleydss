import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import ExitToAppOutlinedIcon from "@mui/icons-material/ExitToAppOutlined";

import { ConfirmationDialog } from "../../../../components/StyledComponents/ConfirmationDialog";

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
    <ConfirmationDialog
      open={open}
      onClose={onClose}
      tone="info"
      title="Save changes?"
      subtitle="You have unsaved changes. Save as draft or exit without saving."
      actions={[
        {
          id: "exit-alternative-evaluation",
          label: "Exit",
          color: "error",
          variant: "text",
          icon: <ExitToAppOutlinedIcon />,
          onClick: onExit,
        },
        {
          id: "save-draft-alternative-evaluation",
          label: "Save draft",
          color: "info",
          variant: "text",
          icon: <SaveOutlinedIcon />,
          onClick: onSave,
        },
      ]}
      maxWidth="xs"
      fullWidth
    />
  );
};

export default AlternativeEvaluationSaveDialog;
