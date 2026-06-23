import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

import { useAuthContext } from "../../context/auth/auth.context";
import { useSnackbarAlertContext } from "../../context/snackbarAlert/snackbarAlert.context";
import { fetchProtectedData } from "../../services/auth.service";
import { getBackendHealth, restartBackendAdmin } from "../../services/admin.service";

const PENDING_BACKEND_CHANGE_KEY = "system.pendingBackendChange";
const PENDING_SUCCESS_MESSAGE_KEY = "system.pendingSuccessMessage";
const BACKEND_CHANGE_MAX_AGE_MS = 2 * 60 * 1000;
const BACKEND_CHANGE_POLL_INTERVAL_MS = 1000;
const BACKEND_CHANGE_POLL_TIMEOUT_MS = 30 * 1000;
const DEFAULT_DESTINATION_PATH = "/dashboard/admin/models?tab=manifest-sync";
const BACKEND_RESTART_DISABLED_MESSAGE =
  "Backend restart is disabled in this environment.";
const BACKEND_RESTART_TIMEOUT_MESSAGE =
  "The Backend restart was requested, but reconnect timed out. Refresh the page manually.";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parsePendingBackendChange = (rawValue) => {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") return null;

    return {
      type: typeof parsed.type === "string" ? parsed.type : null,
      createdAt: Number(parsed.createdAt) || 0,
      restartRequested: parsed.restartRequested === true,
      backendStartedAtBefore:
        typeof parsed.backendStartedAtBefore === "string"
          ? parsed.backendStartedAtBefore
          : null,
      successMessage:
        typeof parsed.successMessage === "string" && parsed.successMessage.trim()
          ? parsed.successMessage
          : "Backend changes applied successfully.",
      destinationPath:
        typeof parsed.destinationPath === "string" && parsed.destinationPath.trim()
          ? parsed.destinationPath
          : DEFAULT_DESTINATION_PATH,
    };
  } catch {
    return null;
  }
};

const readPendingBackendChange = () =>
  parsePendingBackendChange(window.sessionStorage.getItem(PENDING_BACKEND_CHANGE_KEY));

const writePendingBackendChange = (value) => {
  window.sessionStorage.setItem(
    PENDING_BACKEND_CHANGE_KEY,
    JSON.stringify(value)
  );
};

const clearPendingBackendChange = () => {
  window.sessionStorage.removeItem(PENDING_BACKEND_CHANGE_KEY);
};

export default function ApplyingBackendChangesPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { setValue, setIsLoggedIn } = useAuthContext();
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const isMountedRef = useRef(true);
  const [pendingChange, setPendingChange] = useState(() =>
    typeof window === "undefined" ? null : readPendingBackendChange()
  );
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");
  const [canRetry, setCanRetry] = useState(false);

  const destinationPath = useMemo(
    () => pendingChange?.destinationPath || DEFAULT_DESTINATION_PATH,
    [pendingChange]
  );

  const restoreAuthIfPossible = useCallback(async () => {
    const response = await fetchProtectedData();
    const user = response?.data?.user ?? null;

    if (response?.success && user) {
      setValue({
        name: user.name || "",
        university: user.university || "",
        email: user.email || "",
        accountCreation: user.accountCreation || "",
        role: user.role ?? "user",
        isAdmin: user.isAdmin ?? user.role === "admin",
      });
      setIsLoggedIn(true);
      return true;
    }

    return false;
  }, [setIsLoggedIn, setValue]);

  const completeFlow = useCallback(
    async (resolvedPendingChange) => {
      clearPendingBackendChange();
      window.sessionStorage.setItem(
        PENDING_SUCCESS_MESSAGE_KEY,
        resolvedPendingChange.successMessage
      );
      await restoreAuthIfPossible();
      navigate(
        resolvedPendingChange.destinationPath || DEFAULT_DESTINATION_PATH,
        { replace: true }
      );
    },
    [navigate, restoreAuthIfPossible]
  );

  const pollForHealthyRestart = useCallback(
    async (resolvedPendingChange) => {
      const startedAt = Date.now();
      let sawFailure = false;

      while (Date.now() - startedAt < BACKEND_CHANGE_POLL_TIMEOUT_MS) {
        const response = await getBackendHealth();

        if (response?.success) {
          const nextStartedAt = response?.data?.startedAt || null;
          const backendStartedAtBefore =
            resolvedPendingChange?.backendStartedAtBefore || null;
          const backendRestarted =
            backendStartedAtBefore && nextStartedAt
              ? nextStartedAt !== backendStartedAtBefore
              : sawFailure || Date.now() - startedAt >= 3000;

          if (backendRestarted) {
            await completeFlow(resolvedPendingChange);
            return true;
          }
        } else {
          sawFailure = true;
        }

        await delay(BACKEND_CHANGE_POLL_INTERVAL_MS);
      }

      if (isMountedRef.current) {
        setStatus("timeout");
        setMessage(BACKEND_RESTART_TIMEOUT_MESSAGE);
        setCanRetry(true);
        showSnackbarAlert(BACKEND_RESTART_TIMEOUT_MESSAGE, "warning");
      }

      return false;
    },
    [completeFlow, showSnackbarAlert]
  );

  const runApplyingFlow = useCallback(async () => {
    const resolvedPendingChange = readPendingBackendChange();

    if (!resolvedPendingChange) {
      setPendingChange(null);
      setStatus("missing");
      setMessage("No pending backend change was found.");
      setCanRetry(false);
      return;
    }

    if (Date.now() - resolvedPendingChange.createdAt > BACKEND_CHANGE_MAX_AGE_MS) {
      clearPendingBackendChange();
      setPendingChange(null);
      setStatus("stale");
      setMessage("The pending backend change is stale.");
      setCanRetry(false);
      return;
    }

    setPendingChange(resolvedPendingChange);
    setStatus("applying");
    setMessage("");
    setCanRetry(false);

    if (resolvedPendingChange.restartRequested !== true) {
      writePendingBackendChange({
        ...resolvedPendingChange,
        restartRequested: true,
      });

      const restartResponse = await restartBackendAdmin();
      if (!restartResponse?.success) {
        const errorCode = restartResponse?.error?.code || "";
        if (errorCode === "BACKEND_RESTART_DISABLED") {
          if (isMountedRef.current) {
            setStatus("disabled");
            setMessage(BACKEND_RESTART_DISABLED_MESSAGE);
          }
          return;
        }

        if (isMountedRef.current) {
          setStatus("timeout");
          setMessage(restartResponse?.message || BACKEND_RESTART_TIMEOUT_MESSAGE);
          setCanRetry(true);
        }
        return;
      }
    }

    await pollForHealthyRestart({
      ...resolvedPendingChange,
      restartRequested: true,
    });
  }, [pollForHealthyRestart]);

  useEffect(() => {
    runApplyingFlow();

    return () => {
      isMountedRef.current = false;
    };
  }, [runApplyingFlow]);

  const showDefaultBody = status === "checking" || status === "applying";

  return (
    <Box
      className="dashboard-background"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 620,
          p: { xs: 2.2, md: 3 },
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.info.main, 0.18)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: "blur(12px)",
        }}
      >
        <Stack spacing={2} alignItems="center" textAlign="center">
          <CircularProgress color="info" size={32} thickness={4.4} />

          <Stack spacing={0.75}>
            <Typography variant="h5" sx={{ fontWeight: 980 }}>
              Applying backend changes
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 520 }}>
              The server is restarting to load generated files. You will be redirected
              automatically when everything is ready.
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800 }}>
              Do not close this tab.
            </Typography>
          </Stack>

          {showDefaultBody ? null : (
            <Alert
              severity={status === "disabled" ? "info" : "warning"}
              variant="outlined"
              sx={{ width: "100%", textAlign: "left" }}
            >
              {message}
            </Alert>
          )}

          {!showDefaultBody && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              {canRetry && (
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={runApplyingFlow}
                  sx={{ textTransform: "none", fontWeight: 900 }}
                >
                  Retry health check
                </Button>
              )}
              <Button
                variant="contained"
                color="info"
                onClick={() => navigate(destinationPath, { replace: true })}
                sx={{ textTransform: "none", fontWeight: 900 }}
              >
                Go to Admin Models
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
