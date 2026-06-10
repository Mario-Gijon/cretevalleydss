import { useCallback, useEffect, useState } from "react";

import { useSnackbarAlertContext } from "../../../../context/snackbarAlert/snackbarAlert.context";
import { getAdminModelCatalog } from "../../../../services/admin.service";
import { asArray } from "../utils/modelManifest.formatters";

export default function useAdminModelCatalog() {
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const [catalogModels, setCatalogModels] = useState([]);
  const [catalogError, setCatalogError] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(true);

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

        setCatalogModels(asArray(response?.data?.models));
        return true;
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
  };
}
