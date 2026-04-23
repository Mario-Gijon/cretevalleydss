import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import { ConfirmationDialog } from "../../../components/StyledComponents/ConfirmationDialog";

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
    <ConfirmationDialog
      open={open}
      onClose={onClose}
      tone="error"
      title="Remove issue"
      subtitle="Are you sure you want to remove this issue? Other users will still be able to see it."
      actions={[
        {
          id: "cancel-remove-finished-issue",
          label: "Cancel",
          color: "secondary",
          icon: <CancelOutlinedIcon />,
          onClick: onClose,
        },
        {
          id: "confirm-remove-finished-issue",
          label: removeLoading ? "Removing..." : "Remove",
          color: "error",
          icon: <DeleteOutlineIcon />,
          loading: removeLoading,
          onClick: onConfirm,
        },
      ]}
      maxWidth="xs"
    />
  );
};

export default FinishedIssueRemoveDialog;
