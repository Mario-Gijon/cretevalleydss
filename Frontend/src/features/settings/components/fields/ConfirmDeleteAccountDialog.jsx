import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";

import { ConfirmationDialog } from "../../../../components/StyledComponents/ConfirmationDialog";

/**
 * Confirmation dialog used for account deletion flow.
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.handleCancel
 * @param {boolean} props.loading
 * @param {Function} props.handleDelete
 * @returns {JSX.Element}
 */
export default function ConfirmDeleteAccountDialog({
  open,
  handleCancel,
  loading,
  handleDelete,
}) {
  return (
    <ConfirmationDialog
      open={open}
      onClose={handleCancel}
      tone="error"
      title="Delete Account"
      subtitle="Are you sure you want to delete your account? This action cannot be undone."
      actions={[
        {
          id: "cancel",
          label: "Cancel",
          color: "secondary",
          icon: <CancelIcon />,
          onClick: handleCancel,
        },
        {
          id: "confirm-delete",
          label: "Confirm",
          color: "error",
          icon: <DeleteIcon />,
          autoFocus: true,
          loading,
          onClick: handleDelete,
        },
      ]}
    />
  );
}
