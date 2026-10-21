import { useCallback, useState } from "react";

import { useSnackbarAlertContext } from "../../../../context/snackbarAlert/snackbarAlert.context";
import {
  getModelManifestDryRun,
  syncModelManifest,
  updateModelCatalogVisibility,
} from "../../../../services/admin.service";
import {
  getModelVisibilityFieldForKind,
  isModelActiveInCatalog,
} from "../logic/formatModelManifestDisplay";

export default function useModelManifestActions({
  onCatalogShouldRefresh,
  onCatalogModelUpdated,
  onAfterSync,
} = {}) {
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const [dryRunReport, setDryRunReport] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingDryRun, setLoadingDryRun] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);
  const [visibilityBusyId, setVisibilityBusyId] = useState(null);

  const reportVisibilityFailure = useCallback((message) => {
    setErrorMessage(message);
    showSnackbarAlert(message, "error");
    return false;
  }, [showSnackbarAlert]);

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

      const visibilityField = getModelVisibilityFieldForKind(row);
      const nextVisibility = !isModelActiveInCatalog(row);

      setVisibilityBusyId(row.mongoId);
      setErrorMessage("");

      try {
        const response = await updateModelCatalogVisibility(row.mongoId, {
          [visibilityField]: nextVisibility,
        });

        if (!response?.success) {
          const message = response?.message || "Error updating model visibility";
          setErrorMessage(message);
          showSnackbarAlert(message, "error");
          return false;
        }

        const updatedModel = response?.data?.model;
        const updatedModelId = String(updatedModel?.id || updatedModel?._id || "");
        if (
          updatedModelId !== String(row.mongoId) ||
          updatedModel?.[visibilityField] !== nextVisibility
        ) {
          return reportVisibilityFailure(
            "The server did not confirm the requested model visibility change."
          );
        }

        onCatalogModelUpdated?.(updatedModel);

        if (onCatalogShouldRefresh) {
          const refreshedModels = await onCatalogShouldRefresh({ quiet: true });
          const refreshedModel = Array.isArray(refreshedModels)
            ? refreshedModels.find(
                (model) =>
                  String(model?.id || model?._id || "") === String(row.mongoId)
              )
            : null;

          if (refreshedModel?.[visibilityField] !== nextVisibility) {
            return reportVisibilityFailure(
              "The catalog refresh did not confirm the saved visibility. Reload the catalog and verify its current state."
            );
          }
        }

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
    [
      onCatalogModelUpdated,
      onCatalogShouldRefresh,
      reportVisibilityFailure,
      showSnackbarAlert,
    ]
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
