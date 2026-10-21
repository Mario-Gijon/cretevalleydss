import { useCallback, useEffect, useState } from "react";

import { useSnackbarAlertContext } from "../../../../context/snackbarAlert/snackbarAlert.context";
import { getAdminModelCatalog } from "../../../../services/admin.service";

export default function useAdminModelCatalog() {
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const [catalogModels, setCatalogModels] = useState([]);
  const [catalogError, setCatalogError] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const applyCatalogModel = useCallback((updatedModel) => {
    const updatedModelId = String(updatedModel?.id || updatedModel?._id || "");
    if (!updatedModelId) return false;

    setCatalogModels((currentModels) =>
      currentModels.map((model) =>
        String(model?.id || model?._id || "") === updatedModelId
          ? { ...model, ...updatedModel }
          : model
      )
    );
    return true;
  }, []);

  const loadCatalog = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) {
        setLoadingCatalog(true);
      }

      setCatalogError("");

      try {
        const response = await getAdminModelCatalog();

        if (!response?.success) {
          const message = response?.message || "Error fetching model catalog";
          setCatalogError(message);
          showSnackbarAlert(message, "error");
          return false;
        }

        const models = Array.isArray(response?.data?.models)
          ? response.data.models
          : [];
        setCatalogModels(models);
        return models;
      } catch (error) {
        console.error(error);
        setCatalogError("Unexpected error fetching model catalog");
        showSnackbarAlert("Unexpected error fetching model catalog", "error");
        return false;
      } finally {
        if (!quiet) {
          setLoadingCatalog(false);
        }
      }
    },
    [showSnackbarAlert]
  );

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  return {
    catalogModels,
    catalogError,
    loadingCatalog,
    loadCatalog,
    applyCatalogModel,
  };
}
