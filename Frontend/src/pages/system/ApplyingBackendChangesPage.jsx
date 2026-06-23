import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

import { useAuthContext } from "../../context/auth/auth.context";
import { useSnackbarAlertContext } from "../../context/snackbarAlert/snackbarAlert.context";
import {
  EmptyAuthState,
  fetchProtectedDataForBootstrap,
} from "../../services/auth.service";
import {
  getBackendHealth,
  getCurrentModelManifestAdmin,
  getDecisionModelsServiceHealth,
  reloadDecisionModelsServiceAdmin,
  restartBackendAdmin,
} from "../../services/admin.service";
import {
  clearPendingBackendChange,
  getPendingBackendChange,
  isRecentPendingBackendChange,
  updatePendingBackendChange,
} from "../../utils/pendingBackendChange.js";

const PENDING_SUCCESS_MESSAGE_KEY = "system.pendingSuccessMessage";
const BACKEND_CHANGE_MAX_AGE_MS = 2 * 60 * 1000;
const POLL_INTERVAL_MS = 1000;
const BACKEND_CHANGE_POLL_TIMEOUT_MS = 30 * 1000;
const DECISION_MODELS_POLL_TIMEOUT_MS = 30 * 1000;
const MANIFEST_POLL_TIMEOUT_MS = 45 * 1000;
const DEFAULT_DESTINATION_PATH = "/dashboard/admin/models?tab=manifest-sync";
const BACKEND_RESTART_DISABLED_MESSAGE =
  "Backend restart is disabled in this environment.";
const BACKEND_RESTART_TIMEOUT_MESSAGE =
  "The Backend restart was requested, but reconnect timed out. Refresh the page manually.";
const DECISION_MODELS_WARNING_MESSAGE =
  "Generated files were written, but DecisionModelsService has not published the generated model yet.";

const STEP_KEYS = {
  backend: "backend",
  decisionModels: "decisionModels",
  manifest: "manifest",
  redirect: "redirect",
};

const STEP_LABELS = {
  [STEP_KEYS.backend]: "Restarting Backend",
  [STEP_KEYS.decisionModels]: "Refreshing DecisionModelsService",
  [STEP_KEYS.manifest]: "Waiting for generated model manifest",
  [STEP_KEYS.redirect]: "Redirecting to Manifest Sync",
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildStepState = ({
  backend = "pending",
  decisionModels = "pending",
  manifest = "pending",
  redirect = "pending",
} = {}) => ({
  [STEP_KEYS.backend]: backend,
  [STEP_KEYS.decisionModels]: decisionModels,
  [STEP_KEYS.manifest]: manifest,
  [STEP_KEYS.redirect]: redirect,
});

const normalizePendingBackendChange = (value) => {
  if (!value || typeof value !== "object") return null;

  return {
    type: typeof value.type === "string" ? value.type : null,
    createdAt: Number(value.createdAt) || 0,
    restartRequested: value.restartRequested === true,
    decisionModelsReloadRequested:
      value.decisionModelsReloadRequested === true,
    backendStartedAtBefore:
      typeof value.backendStartedAtBefore === "string"
        ? value.backendStartedAtBefore
        : null,
    decisionModelsStartedAtBefore:
      typeof value.decisionModelsStartedAtBefore === "string"
        ? value.decisionModelsStartedAtBefore
        : null,
    expectedApiModelKey:
      typeof value.expectedApiModelKey === "string" && value.expectedApiModelKey.trim()
        ? value.expectedApiModelKey.trim()
        : null,
    successMessage:
      typeof value.successMessage === "string" && value.successMessage.trim()
        ? value.successMessage
        : "Generated changes applied successfully.",
    destinationPath:
      typeof value.destinationPath === "string" && value.destinationPath.trim()
        ? value.destinationPath
        : DEFAULT_DESTINATION_PATH,
  };
};

export default function ApplyingBackendChangesPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isLoggedIn, setValue, setIsLoggedIn } = useAuthContext();
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const isMountedRef = useRef(true);
  const [pendingChange, setPendingChange] = useState(() =>
    typeof window === "undefined"
      ? null
      : normalizePendingBackendChange(getPendingBackendChange())
  );
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");
  const [retryMode, setRetryMode] = useState(null);
  const [steps, setSteps] = useState(() => buildStepState());

  const destinationPath = useMemo(
    () => pendingChange?.destinationPath || DEFAULT_DESTINATION_PATH,
    [pendingChange]
  );

  const setSingleStepStatus = useCallback((stepKey, nextStatus) => {
    setSteps((current) => ({
      ...current,
      [stepKey]: nextStatus,
    }));
  }, []);

  const resetStepsForMode = useCallback((mode) => {
    if (mode === "manifestOnly") {
      setSteps(
        buildStepState({
          backend: "completed",
          decisionModels: "completed",
          manifest: "active",
        })
      );
      return;
    }

    if (mode === "serviceRefresh") {
      setSteps(
        buildStepState({
          backend: "completed",
          decisionModels: "active",
        })
      );
      return;
    }

    setSteps(
      buildStepState({
        backend: "active",
      })
    );
  }, []);

  const restoreAuthIfPossible = useCallback(async () => {
    const response = await fetchProtectedDataForBootstrap();
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
      return { restored: true, unauthorized: false };
    }

    if (response?.status === 401 || response?.status === 403) {
      setValue(EmptyAuthState);
      setIsLoggedIn(false);
      navigate("/login", { replace: true });
      return { restored: false, unauthorized: true };
    }

    return { restored: false, unauthorized: false };
  }, [navigate, setIsLoggedIn, setValue]);

  const completeFlow = useCallback(
    async (resolvedPendingChange) => {
      clearPendingBackendChange();
      window.sessionStorage.setItem(
        PENDING_SUCCESS_MESSAGE_KEY,
        resolvedPendingChange.successMessage
      );

      const authRecovery = await restoreAuthIfPossible();
      if (authRecovery?.unauthorized) return;

      if (!authRecovery?.restored && !isLoggedIn) {
        if (isMountedRef.current) {
          setStatus("applying");
        }

        await delay(1000);
        const retryAuthRecovery = await restoreAuthIfPossible();
        if (retryAuthRecovery?.unauthorized) return;

        if (!retryAuthRecovery?.restored && !isLoggedIn) {
          if (isMountedRef.current) {
            setStatus("backend-timeout");
            setMessage(BACKEND_RESTART_TIMEOUT_MESSAGE);
            setRetryMode("backend");
          }
          return;
        }
      }

      setSingleStepStatus(STEP_KEYS.redirect, "completed");
      navigate(
        resolvedPendingChange.destinationPath || DEFAULT_DESTINATION_PATH,
        { replace: true }
      );
    },
    [isLoggedIn, navigate, restoreAuthIfPossible, setSingleStepStatus]
  );

  const pollForHealthyRestart = useCallback(
    async (resolvedPendingChange) => {
      setSingleStepStatus(STEP_KEYS.backend, "active");
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
            setSingleStepStatus(STEP_KEYS.backend, "completed");
            return true;
          }
        } else {
          sawFailure = true;
        }

        await delay(POLL_INTERVAL_MS);
      }

      if (isMountedRef.current) {
        setSingleStepStatus(STEP_KEYS.backend, "failed");
        setStatus("backend-timeout");
        setMessage(BACKEND_RESTART_TIMEOUT_MESSAGE);
        setRetryMode("backend");
        showSnackbarAlert(BACKEND_RESTART_TIMEOUT_MESSAGE, "warning");
      }

      return false;
    },
    [setSingleStepStatus, showSnackbarAlert]
  );

  const pollForDecisionModelsHealth = useCallback(
    async (resolvedPendingChange) => {
      setSingleStepStatus(STEP_KEYS.decisionModels, "active");
      const startedAt = Date.now();
      let sawFailure = false;

      while (Date.now() - startedAt < DECISION_MODELS_POLL_TIMEOUT_MS) {
        const response = await getDecisionModelsServiceHealth();

        if (response?.success) {
          const nextStartedAt = response?.data?.startedAt || null;
          const startedAtBefore =
            resolvedPendingChange?.decisionModelsStartedAtBefore || null;
          const reloaded =
            startedAtBefore && nextStartedAt
              ? nextStartedAt !== startedAtBefore
              : sawFailure || Date.now() - startedAt >= 3000;

          if (reloaded) {
            setSingleStepStatus(STEP_KEYS.decisionModels, "completed");
            return true;
          }
        } else {
          sawFailure = true;
        }

        await delay(POLL_INTERVAL_MS);
      }

      if (isMountedRef.current) {
        setSingleStepStatus(STEP_KEYS.decisionModels, "failed");
        setStatus("service-warning");
        setMessage(DECISION_MODELS_WARNING_MESSAGE);
        setRetryMode("service");
        showSnackbarAlert(DECISION_MODELS_WARNING_MESSAGE, "warning");
      }

      return false;
    },
    [setSingleStepStatus, showSnackbarAlert]
  );

  const pollForManifestModel = useCallback(
    async (resolvedPendingChange) => {
      if (!resolvedPendingChange?.expectedApiModelKey) {
        setSingleStepStatus(STEP_KEYS.manifest, "completed");
        return true;
      }

      setSingleStepStatus(STEP_KEYS.manifest, "active");
      const startedAt = Date.now();

      while (Date.now() - startedAt < MANIFEST_POLL_TIMEOUT_MS) {
        const response = await getCurrentModelManifestAdmin();
        const models = Array.isArray(response?.data?.models) ? response.data.models : [];

        if (
          response?.success &&
          models.some(
            (model) =>
              String(model?.apiModelKey || "").trim() ===
              resolvedPendingChange.expectedApiModelKey
          )
        ) {
          setSingleStepStatus(STEP_KEYS.manifest, "completed");
          return true;
        }

        await delay(POLL_INTERVAL_MS);
      }

      if (isMountedRef.current) {
        setSingleStepStatus(STEP_KEYS.manifest, "failed");
        setStatus("manifest-warning");
        setMessage(DECISION_MODELS_WARNING_MESSAGE);
        setRetryMode("manifest");
        showSnackbarAlert(DECISION_MODELS_WARNING_MESSAGE, "warning");
      }

      return false;
    },
    [setSingleStepStatus, showSnackbarAlert]
  );

  const runApplyingFlow = useCallback(
    async (mode = "full") => {
      const resolvedPendingChange = normalizePendingBackendChange(
        getPendingBackendChange()
      );

      if (!resolvedPendingChange) {
        setPendingChange(null);
        setStatus("missing");
        setMessage("No pending generated change was found.");
        setRetryMode(null);
        setSteps(buildStepState());
        return;
      }

      if (!isRecentPendingBackendChange(BACKEND_CHANGE_MAX_AGE_MS)) {
        clearPendingBackendChange();
        setPendingChange(null);
        setStatus("stale");
        setMessage("The pending generated change is stale.");
        setRetryMode(null);
        setSteps(buildStepState());
        return;
      }

      setPendingChange(resolvedPendingChange);
      setStatus("applying");
      setMessage("");
      setRetryMode(null);
      resetStepsForMode(mode);

      let nextPendingChange = resolvedPendingChange;

      if (mode === "full") {
        if (nextPendingChange.restartRequested !== true) {
          nextPendingChange = updatePendingBackendChange({
            restartRequested: true,
          }) || {
            ...nextPendingChange,
            restartRequested: true,
          };

          const restartResponse = await restartBackendAdmin();
          if (!restartResponse?.success) {
            const errorCode = restartResponse?.error?.code || "";

            if (errorCode === "BACKEND_RESTART_DISABLED") {
              if (isMountedRef.current) {
                setSingleStepStatus(STEP_KEYS.backend, "failed");
                setStatus("disabled");
                setMessage(BACKEND_RESTART_DISABLED_MESSAGE);
              }
              return;
            }

            if (isMountedRef.current) {
              setSingleStepStatus(STEP_KEYS.backend, "failed");
              setStatus("backend-timeout");
              setMessage(
                restartResponse?.message || BACKEND_RESTART_TIMEOUT_MESSAGE
              );
              setRetryMode("backend");
            }
            return;
          }
        }

        const backendReady = await pollForHealthyRestart(nextPendingChange);
        if (!backendReady) return;
      } else {
        setSingleStepStatus(STEP_KEYS.backend, "completed");
      }

      if (mode === "full" || mode === "serviceRefresh") {
        const shouldReload =
          mode === "serviceRefresh" ||
          nextPendingChange.decisionModelsReloadRequested !== true;

        if (shouldReload) {
          nextPendingChange = updatePendingBackendChange({
            decisionModelsReloadRequested: true,
          }) || {
            ...nextPendingChange,
            decisionModelsReloadRequested: true,
          };

          const reloadResponse = await reloadDecisionModelsServiceAdmin();
          if (!reloadResponse?.success) {
            if (isMountedRef.current) {
              setSingleStepStatus(STEP_KEYS.decisionModels, "failed");
              setStatus("service-warning");
              setMessage(
                reloadResponse?.message || DECISION_MODELS_WARNING_MESSAGE
              );
              setRetryMode("service");
            }
            return;
          }
        }

        const decisionModelsReady = await pollForDecisionModelsHealth(
          nextPendingChange
        );
        if (!decisionModelsReady) return;
      } else {
        setSingleStepStatus(STEP_KEYS.decisionModels, "completed");
      }

      const manifestReady = await pollForManifestModel(nextPendingChange);
      if (!manifestReady) return;

      setSingleStepStatus(STEP_KEYS.redirect, "active");
      await completeFlow(nextPendingChange);
    },
    [
      completeFlow,
      pollForDecisionModelsHealth,
      pollForHealthyRestart,
      pollForManifestModel,
      resetStepsForMode,
      setSingleStepStatus,
    ]
  );

  useEffect(() => {
    runApplyingFlow();

    return () => {
      isMountedRef.current = false;
    };
  }, [runApplyingFlow]);

  const showDefaultBody = status === "checking" || status === "applying";

  const actionButtons = (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
      {retryMode === "backend" && (
        <Button
          variant="outlined"
          color="warning"
          onClick={() => runApplyingFlow("full")}
          sx={{ textTransform: "none", fontWeight: 900 }}
        >
          Retry Backend restart
        </Button>
      )}

      {(retryMode === "service" || retryMode === "manifest") && (
        <Button
          variant="outlined"
          color="warning"
          onClick={() => runApplyingFlow("serviceRefresh")}
          sx={{ textTransform: "none", fontWeight: 900 }}
        >
          Retry service refresh
        </Button>
      )}

      {(retryMode === "service" || retryMode === "manifest") && (
        <Button
          variant="outlined"
          color="info"
          onClick={() => runApplyingFlow("manifestOnly")}
          sx={{ textTransform: "none", fontWeight: 900 }}
        >
          Retry manifest check
        </Button>
      )}

      <Button
        variant="contained"
        color="info"
        onClick={() => navigate(destinationPath, { replace: true })}
        sx={{ textTransform: "none", fontWeight: 900 }}
      >
        Go to Admin Models anyway
      </Button>
    </Stack>
  );

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
          maxWidth: 680,
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
              Applying generated changes
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", maxWidth: 540 }}
            >
              The system is refreshing generated runtime files. You will be
              redirected automatically when everything is ready.
            </Typography>
          </Stack>

          <Stack spacing={0.85} sx={{ width: "100%" }}>
            {Object.entries(STEP_LABELS).map(([stepKey, label]) => {
              const stepStatus = steps[stepKey] || "pending";
              const color =
                stepStatus === "completed"
                  ? "success"
                  : stepStatus === "active"
                    ? "info"
                    : stepStatus === "failed"
                      ? "warning"
                      : "default";
              const chipLabel =
                stepStatus === "completed"
                  ? "Done"
                  : stepStatus === "active"
                    ? "In progress"
                    : stepStatus === "failed"
                      ? "Needs attention"
                      : "Pending";

              return (
                <Stack
                  key={stepKey}
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    width: "100%",
                    px: 1.1,
                    py: 0.95,
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.16)}`,
                    bgcolor: alpha(theme.palette.background.default, 0.28),
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: stepStatus === "active" ? 900 : 800 }}
                  >
                    {label}
                  </Typography>
                  <Chip
                    size="small"
                    label={chipLabel}
                    color={color}
                    variant="outlined"
                  />
                </Stack>
              );
            })}
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

          {!showDefaultBody && actionButtons}
        </Stack>
      </Paper>
    </Box>
  );
}
