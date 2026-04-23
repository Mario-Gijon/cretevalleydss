import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

const DIALOG_TONE_COLORS = {
  warning: "warning",
  success: "success",
  info: "info",
  error: "error",
};

const DEFAULT_TONE = "info";

/**
 * Generic confirmation dialog with configurable tone, content and action buttons.
 * Use tone values: warning, success, info or error.
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onClose
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {string} [props.tone]
 * @param {*} [props.children]
 * @param {Object[]} [props.actions]
 * @param {string} [props.actions[].id]
 * @param {string} props.actions[].label
 * @param {Function} [props.actions[].onClick]
 * @param {JSX.Element} [props.actions[].icon]
 * @param {string} [props.actions[].color]
 * @param {string} [props.actions[].variant]
 * @param {boolean} [props.actions[].loading]
 * @param {boolean} [props.actions[].disabled]
 * @param {boolean} [props.actions[].autoFocus]
 * @param {Object} [props.actions[].sx]
 * @param {string} [props.titleId]
 * @param {string} [props.descriptionId]
 * @param {Object} [props.paperSx]
 * @param {Object} [props.titleSx]
 * @param {Object} [props.contentSx]
 * @param {Object} [props.actionsSx]
 * @returns {JSX.Element}
 */
export function ConfirmationDialog({
  open,
  onClose,
  title,
  subtitle,
  tone = DEFAULT_TONE,
  children,
  actions = [],
  titleId = "confirmation-dialog-title",
  descriptionId = "confirmation-dialog-description",
  paperSx,
  titleSx,
  contentSx,
  actionsSx,
  ...dialogProps
}) {
  const theme = useTheme();
  const paletteKey = DIALOG_TONE_COLORS[tone] || DEFAULT_TONE;
  const toneColor = theme.palette[paletteKey].main;
  const hasContent = Boolean(subtitle) || Boolean(children);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: `1px solid ${alpha(toneColor, 0.28)}`,
          background: `radial-gradient(760px 280px at 10% 0%, ${alpha(
            toneColor,
            0.16
          )}, transparent 58%), rgba(16, 24, 34, 0.95)`,
          color: "text.primary",
          ...paperSx,
        },
      }}
      {...dialogProps}
    >
      <DialogTitle
        id={titleId}
        color={paletteKey}
        sx={{ fontWeight: 700, fontSize: "1.05rem", ...titleSx }}
      >
        {title}
      </DialogTitle>

      {hasContent && (
        <DialogContent sx={contentSx}>
          {subtitle && (
            <DialogContentText id={descriptionId} sx={{ color: "text.secondary" }}>
              {subtitle}
            </DialogContentText>
          )}
          {children}
        </DialogContent>
      )}

      {actions.length > 0 && (
        <DialogActions sx={actionsSx}>
          {actions.map((action, index) => {
            const {
              id,
              label,
              onClick,
              icon,
              color = "inherit",
              variant,
              loading = false,
              disabled = false,
              autoFocus = false,
              sx,
              ...buttonProps
            } = action;

            return (
              <Button
                key={id || `${label}-${index}`}
                onClick={onClick}
                color={color}
                variant={variant}
                autoFocus={autoFocus}
                disabled={disabled || loading}
                startIcon={!loading ? icon : undefined}
                sx={{ textTransform: "none", fontWeight: 700, ...sx }}
                {...buttonProps}
              >
                {loading && <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />}
                {label}
              </Button>
            );
          })}
        </DialogActions>
      )}
    </Dialog>
  );
}
