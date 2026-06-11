import { useEffect, useState } from "react";

import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { removeFinishedIssue } from "../../../services/issue.service";
import { useFinishedIssuesListing } from "./useFinishedIssuesListing";

/**
 * Gestiona el estado y las acciones de la pantalla de issues finalizados.
 *
 * Centraliza refresco, apertura de detalle, confirmación de borrado
 * y métricas de listado para dejar el componente de UI más limpio.
 *
 * @returns {Object}
 */
export const useFinishedIssuesView = () => {
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const {
    issueCreated,
    setIssueCreated,
    loading,
    finishedIssues,
    setFinishedIssues,
    fetchFinishedIssues,
  } = useIssuesDataContext();

  const [selectedIssue, setSelectedIssue] = useState(null);
  const [openFinishedIssueDialog, setOpenFinishedIssueDialog] = useState(false);
  const [openRemoveConfirmDialog, setOpenRemoveConfirmDialog] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    query,
    searchBy,
    sortBy,
    filteredIssues,
    overview,
    setQuery,
    setSearchBy,
    setSortBy,
  } = useFinishedIssuesListing({ finishedIssues });

  useEffect(() => {
    if (!issueCreated?.success) return;

    showSnackbarAlert(
      issueCreated?.message || "Issue created successfully",
      "success"
    );
    setIssueCreated("");
  }, [issueCreated, setIssueCreated, showSnackbarAlert]);

  /**
   * Refresca manualmente la colección de issues finalizados.
   *
   * @returns {Promise<void>}
   */
  const handleRefresh = async () => {
    if (typeof fetchFinishedIssues !== "function") return;

    try {
      setRefreshing(true);
      await fetchFinishedIssues();
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Abre el diálogo de detalle para el issue seleccionado.
   *
   * @param {Object} issue Issue seleccionado.
   * @returns {void}
   */
  const openDetails = (issue) => {
    setSelectedIssue(issue);
    setOpenFinishedIssueDialog(true);
  };

  /**
   * Cierra el diálogo de detalle y limpia selección.
   *
   * @returns {void}
   */
  const closeDetails = () => {
    setSelectedIssue(null);
    setOpenFinishedIssueDialog(false);
  };

  /**
   * Ejecuta la eliminación del issue finalizado seleccionado.
   *
   * @returns {Promise<void>}
   */
  const handleRemove = async () => {
    if (!selectedIssue) return;

    setRemoveLoading(true);

    const response = await removeFinishedIssue(selectedIssue.id);

    if (response?.success) {
      setFinishedIssues((previous) =>
        previous.filter((issue) => issue.id !== selectedIssue.id)
      );
      closeDetails();
    }

    showSnackbarAlert(
      response?.message || "Error removing issue",
      response?.success ? "success" : "error"
    );

    setRemoveLoading(false);
    setOpenRemoveConfirmDialog(false);
  };

  return {
    loading,
    finishedIssues,
    selectedIssue,
    openFinishedIssueDialog,
    openRemoveConfirmDialog,
    removeLoading,
    refreshing,
    query,
    searchBy,
    sortBy,
    filteredIssues,
    overview,
    setQuery,
    setSearchBy,
    setSortBy,
    setOpenRemoveConfirmDialog,
    openDetails,
    closeDetails,
    handleRefresh,
    handleRemove,
  };
};

export default useFinishedIssuesView;
