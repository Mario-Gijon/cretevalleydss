import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CalculateIcon from "@mui/icons-material/Calculate";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import GavelIcon from "@mui/icons-material/Gavel";

import { ConfirmationDialog } from "../../../../components/StyledComponents/ConfirmationDialog";

const CONFIRM_TONE_BY_KEY = {
  compute: "warning",
  resolve: "warning",
  remove: "error",
};

const CONFIRM_LABEL_BY_KEY = {
  compute: "Compute",
  resolve: "Resolve",
  remove: "Remove",
};

const CONFIRM_COLOR_BY_KEY = {
  compute: "warning",
  resolve: "warning",
  remove: "error",
};

const CONFIRM_ICON_BY_KEY = {
  compute: <CalculateIcon />,
  resolve: <GavelIcon />,
  remove: <DeleteOutlineIcon />,
};

export default function AdminIssueActionConfirmDialog({
  confirmAction,
  actionBusy,
  onClose,
  onConfirm,
}) {
  const confirmTone = CONFIRM_TONE_BY_KEY[confirmAction?.key] || "info";
  const confirmLabel = CONFIRM_LABEL_BY_KEY[confirmAction?.key] || "Confirm";
  const confirmColor = CONFIRM_COLOR_BY_KEY[confirmAction?.key] || "info";
  const confirmIcon = CONFIRM_ICON_BY_KEY[confirmAction?.key] || <InfoOutlinedIcon />;

  return (
    <ConfirmationDialog
      open={Boolean(confirmAction)}
      onClose={onClose}
      tone={confirmTone}
      title={confirmAction?.title || "Confirm action"}
      subtitle={
        confirmAction?.description || "Are you sure you want to continue?"
      }
      actions={[
        {
          id: "cancel-admin-issue-action",
          label: "Cancel",
          color: "secondary",
          variant: "outlined",
          icon: <CancelOutlinedIcon />,
          onClick: onClose,
        },
        {
          id: "confirm-admin-issue-action",
          label: confirmLabel,
          color: confirmColor,
          variant: "outlined",
          icon: confirmIcon,
          autoFocus: true,
          loading: Boolean(confirmAction?.key && actionBusy[confirmAction.key]),
          onClick: onConfirm,
        },
      ]}
      maxWidth="xs"
      fullWidth
    />
  );
}
