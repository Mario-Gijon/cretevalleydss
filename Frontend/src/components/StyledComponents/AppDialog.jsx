import CloseIcon from "@mui/icons-material/Close";
import { DialogTitle, IconButton, Stack, Tooltip } from "@mui/material";

import { GlassDialog } from "./GlassDialog";

/** Standard shell for content and form dialogs; decision dialogs use ConfirmationDialog. */
export function AppDialog({
  open,
  onClose,
  title,
  icon,
  children,
  titleId = "app-dialog-title",
  titleSx,
  ...dialogProps
}) {
  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      fullWidth
      {...dialogProps}
    >
      <DialogTitle id={titleId} sx={{ px: { xs: 2, sm: 3 }, py: 1.75, ...titleSx }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          {icon ? (
            <Stack aria-hidden="true" data-testid="app-dialog-header-icon" sx={{ color: "secondary.main" }}>
              {icon}
            </Stack>
          ) : null}
          <Stack sx={{ minWidth: 0, flex: 1, fontWeight: 800 }}>{title}</Stack>
          <Tooltip title="Close dialog">
            <IconButton aria-label="Close dialog" onClick={onClose} edge="end" sx={{ minWidth: 44, minHeight: 44 }}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </DialogTitle>
      {children}
    </GlassDialog>
  );
}
