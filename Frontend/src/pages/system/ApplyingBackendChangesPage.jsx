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
  applyModelForgeModelPackage,
  getBackendHealth,
  getCurrentModelManifestAdmin,
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
const APPLY_SETTLE_DELAY_MS = 1500;
const BACKEND_CHANGE_POLL_TIMEOUT_MS = 30 * 1000;
const MANIFEST_POLL_TIMEOUT_MS = 45 * 1000;
const DEFAULT_DESTINATION_PATH = "/dashboard/admin/models?tab=manifest-sync";
const BACKEND_RESTART_DISABLED_MESSAGE =
  "Backend restart is disabled in this environment.";
const BACKEND_RESTART_TIMEOUT_MESSAGE =
  "Backend restart was requested, but the development server did not come back. Check that nodemon is running with the project nodemon.json configuration.";
const MANIFEST_WARNING_MESSAGE =
  "Generated files were written, but DecisionModelsService has not published the generated model yet.";
const APPLY_INTERRUPTED_MESSAGE =
  "Apply response was interrupted. Verifying generated files through the model manifest.";
const ADMIN_AUTH_REQUIRED_MESSAGE =
  "Your admin session could not be restored during the applying flow. Sign in again and retry.";

const STEP_KEYS = {
  apply: "apply",
  backend: "backend",
  manifest: "manifest",
  redirect: "redirect",
};

const STEP_LABELS = {
  [STEP_KEYS.apply]: "Writing scaffold files",
  [STEP_KEYS.backend]: "Restarting Backend",
  [STEP_KEYS.manifest]: "Waiting for generated model manifest",
  [STEP_KEYS.redirect]: "Redirecting to Manifest Sync",
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildStepState = ({
  apply = "pending",
  backend = "pending",
  manifest = "pending",
  redirect = "pending",
} = {}) => ({
  [STEP_KEYS.apply]: apply,
  [STEP_KEYS.backend]: backend,
  [STEP_KEYS.manifest]: manifest,
  [STEP_KEYS.redirect]: redirect,
});

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizePendingBackendChange = (value) => {
  if (!isPlainObject(value)) return null;

  return {
    type: typeof value.type === "string" ? value.type : null,
    createdAt: Number(value.createdAt) || 0,
    applyRequested: value.applyRequested === true,
    applyCompleted: value.applyCompleted === true,
    backendRestartRequested: value.backendRestartRequested === true,
    backendStartedAtBefore:
      typeof value.backendStartedAtBefore === "string"
        ? value.backendStartedAtBefore
        : null,
    expectedApiModelKey:
      typeof value.expectedApiModelKey === "string" &&
      value.expectedApiModelKey.trim()
        ? value.expectedApiModelKey.trim()
        : null,
    applyRequestPayload: isPlainObject(value.applyRequestPayload)
      ? value.applyRequestPayload
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
          apply: "completed",
          backend: "completed",
          manifest: "active",
        })
      );
      return;
    }

    setSteps(
      buildStepState({
        apply: "active",
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

  const recoverAuthForAdminFlow = useCallback(async () => {
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
      return true;
    }

    return false;
  }, [setIsLoggedIn, setValue]);

  const callAdminWithRecovery = useCallback(
    async (requestFn) => {
      let response = await requestFn();
      const errorCode = response?.error?.code || "";
      const unauthorized =
        response?.status === 401 ||
        response?.status === 403 ||
        errorCode === "UNAUTHORIZED" ||
        errorCode === "NO_TOKEN";

      if (!unauthorized) {
        return response;
      }

      const restored = await recoverAuthForAdminFlow();
      if (!restored) {
        if (isMountedRef.current) {
          setStatus("unauthorized");
          setMessage(ADMIN_AUTH_REQUIRED_MESSAGE);
          setRetryMode(null);
        }
        return null;
      }

      response = await requestFn();
      return response;
    },
    [recoverAuthForAdminFlow]
  );

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

  const pollForHealthyBackend = useCallback(
    async (
      resolvedPendingChange,
      { allowHealthyWithoutRestart = false } = {}
    ) => {
      setSingleStepStatus(STEP_KEYS.backend, "active");
      const startedAt = Date.now();
      let sawFailure = false;

      while (Date.now() - startedAt < BACKEND_CHANGE_POLL_TIMEOUT_MS) {
        const response = await getBackendHealth();

        if (response?.success) {
          const nextStartedAt = response?.data?.startedAt || null;
          const previousStartedAt =
            resolvedPendingChange?.backendStartedAtBefore || null;
          const backendRestarted =
            previousStartedAt && nextStartedAt
              ? nextStartedAt !== previousStartedAt
              : sawFailure || Date.now() - startedAt >= 3000;

          if (backendRestarted) {
            setSingleStepStatus(STEP_KEYS.backend, "completed");
            return { healthy: true, restarted: true };
          }

          if (
            allowHealthyWithoutRestart &&
            Date.now() - startedAt >= APPLY_SETTLE_DELAY_MS
          ) {
            setSingleStepStatus(STEP_KEYS.backend, "completed");
            return { healthy: true, restarted: false };
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

      return { healthy: false, restarted: false };
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
        const response = await callAdminWithRecovery(() =>
          getCurrentModelManifestAdmin()
        );
        if (response === null) {
          return false;
        }
        const models = Array.isArray(response?.data?.models)
          ? response.data.models
          : [];

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
        setMessage(MANIFEST_WARNING_MESSAGE);
        setRetryMode("manifest");
        showSnackbarAlert(MANIFEST_WARNING_MESSAGE, "warning");
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
      let applyRequestHadNetworkFailure = false;

      if (mode === "full") {
        setSingleStepStatus(STEP_KEYS.apply, "active");

        if (nextPendingChange.applyRequested !== true) {
          nextPendingChange = updatePendingBackendChange({
            applyRequested: true,
          }) || {
            ...nextPendingChange,
            applyRequested: true,
          };

          const applyResponse = await applyModelForgeModelPackage(
            nextPendingChange.applyRequestPayload || {}
          );

          if (applyResponse?.success) {
            nextPendingChange = updatePendingBackendChange({
              applyCompleted: true,
              applyNetworkInterrupted: false,
              applyResult: applyResponse.data || null,
              applyValidationResult: applyResponse?.data?.validation || null,
            }) || {
              ...nextPendingChange,
              applyCompleted: true,
            };
            setSingleStepStatus(STEP_KEYS.apply, "completed");
          } else if (applyResponse?.error?.code === "NETWORK_ERROR") {
            applyRequestHadNetworkFailure = true;
            setMessage(APPLY_INTERRUPTED_MESSAGE);
            nextPendingChange = updatePendingBackendChange({
              applyNetworkInterrupted: true,
            }) || {
              ...nextPendingChange,
              applyNetworkInterrupted: true,
            };
          } else {
            if (isMountedRef.current) {
              setSingleStepStatus(STEP_KEYS.apply, "failed");
              setStatus("apply-error");
              setMessage(
                applyResponse?.message ||
                  "Error applying Model Forge scaffold package."
              );
              setRetryMode(null);
            }
            return;
          }
        } else {
          const currentPendingChange = getPendingBackendChange();
          const currentApplyCompleted =
            currentPendingChange?.applyCompleted === true;
          setSingleStepStatus(
            STEP_KEYS.apply,
            currentApplyCompleted ? "completed" : "active"
          );
          applyRequestHadNetworkFailure = currentApplyCompleted !== true;
          nextPendingChange = {
            ...nextPendingChange,
            applyCompleted: currentApplyCompleted,
          };
        }
      } else {
        setSingleStepStatus(STEP_KEYS.apply, "completed");
      }

      if (mode === "full") {
        const backendHealthState = await pollForHealthyBackend(
          nextPendingChange,
          {
            allowHealthyWithoutRestart: true,
          }
        );
        if (!backendHealthState.healthy) return;

        if (
          (!backendHealthState.restarted || applyRequestHadNetworkFailure) &&
          nextPendingChange.backendRestartRequested !== true
        ) {
          nextPendingChange = updatePendingBackendChange({
            backendRestartRequested: true,
          }) || {
            ...nextPendingChange,
            backendRestartRequested: true,
          };

          const restartResponse = await callAdminWithRecovery(() =>
            restartBackendAdmin()
          );
          if (restartResponse === null) {
            return;
          }
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

          const restartedAfterRequest = await pollForHealthyBackend(
            nextPendingChange
          );
          if (!restartedAfterRequest.healthy) return;
        }
      } else {
        setSingleStepStatus(STEP_KEYS.backend, "completed");
      }

      const manifestReady = await pollForManifestModel(nextPendingChange);
      if (!manifestReady) return;

      if (nextPendingChange.applyCompleted !== true) {
        nextPendingChange = updatePendingBackendChange({
          applyCompleted: true,
          applyNetworkInterrupted: false,
        }) || {
          ...nextPendingChange,
          applyCompleted: true,
          applyNetworkInterrupted: false,
        };
      }

      setSingleStepStatus(STEP_KEYS.apply, "completed");
      setSingleStepStatus(STEP_KEYS.backend, "completed");
      setSingleStepStatus(STEP_KEYS.manifest, "completed");
      setSingleStepStatus(STEP_KEYS.redirect, "active");
      await completeFlow(nextPendingChange);
    },
    [
      callAdminWithRecovery,
      completeFlow,
      pollForHealthyBackend,
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

      {retryMode === "manifest" && (
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
