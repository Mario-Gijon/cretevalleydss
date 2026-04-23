import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import { ConfirmationDialog } from "../../../../components/StyledComponents/ConfirmationDialog";

const TONE_CONFIRM_COLORS = {
  warning: "warning",
  success: "success",
  info: "info",
  error: "error",
};

const TONE_CONFIRM_ICONS = {
  warning: <WarningAmberOutlinedIcon />,
  success: <CheckCircleOutlineIcon />,
  info: <InfoOutlinedIcon />,
  error: <DeleteOutlineIcon />,
};

/**
 * Diálogo de confirmación reutilizable para acciones
 * realizadas desde la pantalla de issues activos.
 *
 * @param {Object} props Props del componente.
 * @param {boolean} props.open Indica si el diálogo está abierto.
 * @param {string} props.title Título del diálogo.
 * @param {string} props.description Descripción mostrada al usuario.
 * @param {string} props.confirmText Texto del botón de confirmación.
 * @param {string} props.tone Tono visual del diálogo.
 * @param {Function} props.onClose Acción al cerrar el diálogo.
 * @param {Function} props.onConfirm Acción al confirmar.
 * @returns {JSX.Element}
 */
const ActiveIssueConfirmDialog = ({
  open,
  title,
  description,
  confirmText = "Confirm",
  tone = "warning",
  onClose,
  onConfirm,
}) => {
  const confirmTone = TONE_CONFIRM_COLORS[tone] || "info";

  return (
    <ConfirmationDialog
      open={open}
      onClose={onClose}
      tone={tone}
      title={title}
      subtitle={description}
      actions={[
        {
          id: "cancel-active-issue-action",
          label: "Cancel",
          color: "secondary",
          icon: <CancelOutlinedIcon />,
          onClick: onClose,
        },
        {
          id: "confirm-active-issue-action",
          label: confirmText,
          color: confirmTone,
          icon: TONE_CONFIRM_ICONS[tone] || <InfoOutlinedIcon />,
          autoFocus: true,
          onClick: onConfirm,
        },
      ]}
      maxWidth="xs"
    />
  );
};

export default ActiveIssueConfirmDialog;
