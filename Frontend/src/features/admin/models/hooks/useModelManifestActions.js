import { useCallback, useState } from "react";

import { useSnackbarAlertContext } from "../../../../context/snackbarAlert/snackbarAlert.context";
import {
  getModelManifestDryRun,
  syncModelManifest,
  updateModelCatalogVisibility,
} from "../../../../services/admin.service";
import { isModelVisibleInCreateIssue } from "../logic/formatModelManifestDisplay";

export default function useModelManifestActions({ onCatalogShouldRefresh, onAfterSync } = {}) {
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const [dryRunReport, setDryRunReport] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingDryRun, setLoadingDryRun] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);
  const [visibilityBusyId, setVisibilityBusyId] = useState(null);

  const runDryRun = useCallback(async () => {
    setLoadingDryRun(true);
    setErrorMessage("");

    try {
      const response = await getModelManifestDryRun();

      if (!response?.success) {
        const message = response?.message || "Error running model manifest dry-run";
        setErrorMessage(message);
        showSnackbarAlert(message, "error");
        return false;
      }

      setDryRunReport(response.data);
      showSnackbarAlert(response.message || "Model manifest dry-run completed", "success");
      return true;
    } catch (error) {
      console.error(error);
      setErrorMessage("Unexpected error running model manifest dry-run");
      showSnackbarAlert("Unexpected error running model manifest dry-run", "error");
      return false;
    } finally {
      setLoadingDryRun(false);
    }
  }, [showSnackbarAlert]);

  const syncManifest = useCallback(async () => {
    setLoadingSync(true);
    setErrorMessage("");

    try {
      const response = await syncModelManifest();

      if (!response?.success) {
        const message = response?.message || "Error synchronizing model manifest";
        setErrorMessage(message);
        showSnackbarAlert(message, "error");
        return false;
      }

      setSyncResult(response.data);
      onAfterSync?.();
      await onCatalogShouldRefresh?.({ quiet: true });
      showSnackbarAlert(response.message || "Model manifest synchronized", "success");
      return true;
    } catch (error) {
      console.error(error);
      setErrorMessage("Unexpected error synchronizing model manifest");
      showSnackbarAlert("Unexpected error synchronizing model manifest", "error");
      return false;
    } finally {
      setLoadingSync(false);
    }
  }, [onAfterSync, onCatalogShouldRefresh, showSnackbarAlert]);

  const updateVisibility = useCallback(
    async (row) => {
      if (!row?.mongoId) return false;

      const nextVisibility = !isModelVisibleInCreateIssue(row);

      setVisibilityBusyId(row.mongoId);
      setErrorMessage("");

      try {
        const response = await updateModelCatalogVisibility(row.mongoId, nextVisibility);

        if (!response?.success) {
          const message = response?.message || "Error updating model visibility";
          setErrorMessage(message);
          showSnackbarAlert(message, "error");
          return false;
        }

        await onCatalogShouldRefresh?.({ quiet: true });
        showSnackbarAlert(response.message || "Model catalog visibility updated", "success");
        return true;
      } catch (error) {
        console.error(error);
        setErrorMessage("Unexpected error updating model visibility");
        showSnackbarAlert("Unexpected error updating model visibility", "error");
        return false;
      } finally {
        setVisibilityBusyId(null);
      }
    },
    [onCatalogShouldRefresh, showSnackbarAlert]
  );

  return {
    dryRunReport,
    syncResult,
    errorMessage,
    loadingDryRun,
    loadingSync,
    visibilityBusyId,
    runDryRun,
    syncManifest,
    updateVisibility,
  };
}
