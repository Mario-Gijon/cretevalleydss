import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

const DIALOG_TONE_COLORS = {
  warning: "warning",
  success: "success",
  secondary: "secondary",
  info: "secondary",
  error: "error",
};

const DEFAULT_TONE = "info";

const DEFAULT_HEADER_ICONS = {
  warning: <WarningAmberIcon />,
  success: <CheckCircleOutlineIcon />,
  secondary: <InfoOutlinedIcon />,
  error: <ErrorOutlineIcon />,
};

/**
 * Generic confirmation dialog with configurable tone, content and action buttons.
 * Use tone values: warning, success, info or error.
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onClose
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {string} [props.tone]
 * @param {JSX.Element} [props.headerIcon]
 * @param {*} [props.children]
 * @param {Object[]} [props.actions]
 * @param {string} [props.actions[].id]
 * @param {string} props.actions[].label
 * @param {Function} [props.actions[].onClick]
 * @param {JSX.Element} [props.actions[].icon]
 * @param {boolean} [props.actions[].iconOnly]
 * @param {string} [props.actions[].ariaLabel]
 * @param {string} [props.actions[].tooltip]
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
  headerIcon,
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
  const resolvedHeaderIcon = headerIcon || DEFAULT_HEADER_ICONS[paletteKey];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      PaperProps={{
        "data-confirmation-tone": paletteKey,
        sx: {
          width: "min(100% - 24px, 520px)",
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
        sx={{ py: 2, ...titleSx }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          {resolvedHeaderIcon && (
            <Stack
              aria-hidden="true"
              data-testid="confirmation-dialog-header-icon"
              alignItems="center"
              justifyContent="center"
              sx={{ color: toneColor, flexShrink: 0 }}
            >
              {resolvedHeaderIcon}
            </Stack>
          )}
          <span>{title}</span>
        </Stack>
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
        <DialogActions
          sx={{
            gap: 0.5,
            px: 2.5,
            pb: 2,
            "& .MuiIconButton-root": { minWidth: 44, minHeight: 44 },
            ...actionsSx,
          }}
        >
          {actions.map((action, index) => {
            const {
              id,
              label,
              onClick,
              icon,
              iconOnly = false,
              ariaLabel,
              tooltip,
              color = "inherit",
              variant,
              loading = false,
              disabled = false,
              autoFocus = false,
              sx,
              ...buttonProps
            } = action;

            if (iconOnly) {
              const accessibleLabel = ariaLabel || label;
              return (
                <Tooltip key={id || `${label}-${index}`} title={tooltip || accessibleLabel}>
                  <span>
                    <IconButton
                      onClick={onClick}
                      color={color}
                      autoFocus={autoFocus}
                      disabled={disabled || loading}
                      aria-label={accessibleLabel}
                      sx={sx}
                      {...buttonProps}
                    >
                      {loading ? <CircularProgress size={20} color="inherit" /> : icon}
                    </IconButton>
                  </span>
                </Tooltip>
              );
            }

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
