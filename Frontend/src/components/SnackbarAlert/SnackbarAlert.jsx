
import { Alert, IconButton, Snackbar, Slide, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

const severityVisuals = {
  success: { alertSeverity: "success", tone: "success", Icon: CheckCircleOutlineIcon },
  warning: { alertSeverity: "warning", tone: "warning", Icon: WarningAmberIcon },
  error: { alertSeverity: "error", tone: "error", Icon: ErrorOutlineIcon },
  info: { alertSeverity: "info", tone: "secondary", Icon: InfoOutlinedIcon },
  secondary: { alertSeverity: "info", tone: "secondary", Icon: InfoOutlinedIcon },
};

function SlideTransition(props) {
  return <Slide {...props} direction="down" />;
}

export const SnackbarAlert = ({ open, onClose, message, severity = "info" }) => {
  const handleClose = () => onClose();
  const visual = severityVisuals[severity] || severityVisuals.info;
  const VisualIcon = visual.Icon;

  return (
    <Snackbar
      open={open}
      autoHideDuration={5000}
      onClose={handleClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      TransitionComponent={SlideTransition}
      sx={{
        width: "calc(100% - 24px)",
        maxWidth: 600,
        mt: { xs: 1, sm: 2 },
      }}
    >
      <Alert
        severity={visual.alertSeverity}
        icon={<VisualIcon fontSize="inherit" />}
        data-snackbar-tone={visual.tone}
        sx={(theme) => {
          const toneColor = theme.palette[visual.tone].main;

          return {
            width: "100%",
            alignItems: "flex-start",
            border: `1px solid ${alpha(toneColor, 0.45)}`,
            borderRadius: 2.5,
            color: theme.palette.text.primary,
            backgroundColor: alpha(theme.palette.background.paper, 0.88),
            backgroundImage: `radial-gradient(circle at 0% 0%, ${alpha(toneColor, 0.2)}, transparent 58%)`,
            boxShadow: `0 10px 28px ${alpha(theme.palette.common.black, 0.28)}`,
            backdropFilter: "blur(14px)",
            "& .MuiAlert-icon": {
              color: toneColor,
              opacity: 1,
              pt: 0.25,
            },
            "& .MuiAlert-message": {
              minWidth: 0,
              overflowWrap: "anywhere",
              py: 0.25,
            },
          };
        }}
        action={
          <Tooltip title="Close notification">
            <IconButton
              size="small"
              color="inherit"
              onClick={handleClose}
              aria-label="Close notification"
              sx={{ minWidth: 44, minHeight: 44, mt: -0.5, mr: -0.75 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        }
      >
        {message}
      </Alert>
    </Snackbar>
  );
};
