import { useEffect, useState } from "react";

/**
 * Sincroniza el estado auxiliar de la pantalla de issues activos.
 *
 * Gestiona los metadatos que pueden llegar del servidor, el refresco
 * manual de la pantalla y la notificación asociada a la creación de issues.
 *
 * @param {Object} params Parámetros del hook.
 * @param {Object|null} params.taskCenterFromContext Task center expuesto por el contexto.
 * @param {Object|null} params.filtersMetaFromContext Metadatos de filtros expuestos por el contexto.
 * @param {Object|null} params.issueCreated Estado de creación de issue.
 * @param {Function} params.setIssueCreated Setter del estado de creación.
 * @param {Function} params.showSnackbarAlert Función para mostrar alertas.
 * @param {Function} params.fetchActiveIssues Función para refrescar issues activos.
 * @param {Function} params.fetchFinishedIssues Función para refrescar issues finalizados.
 * @returns {Object}
 */
export const useActiveIssuesScreenSync = ({
  taskCenterFromContext = null,
  filtersMetaFromContext = null,
  issueCreated = null,
  setIssueCreated,
  showSnackbarAlert,
  fetchActiveIssues,
  fetchFinishedIssues,
}) => {
  const [serverTaskCenter, setServerTaskCenter] = useState(null);
  const [serverFiltersMeta, setServerFiltersMeta] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const taskCenter = taskCenterFromContext ?? serverTaskCenter;
  const filtersMeta = filtersMetaFromContext ?? serverFiltersMeta;

  useEffect(() => {
    if (issueCreated?.success) {
      showSnackbarAlert(
        issueCreated?.message || issueCreated?.msg || "Issue created successfully",
        "success"
      );
      setIssueCreated("");
    }
  }, [issueCreated, setIssueCreated, showSnackbarAlert]);

  /**
   * Refresca issues activos y, opcionalmente, issues finalizados.
   *
   * @param {Object} options Opciones de refresco.
   * @param {boolean} options.alsoFinished Indica si también hay que refrescar finalizados.
   * @returns {Promise<void>}
   */
  const refresh = async ({ alsoFinished = false } = {}) => {
    const response = await fetchActiveIssues();

    if (response?.taskCenter) {
      setServerTaskCenter(response.taskCenter);
    }

    if (response?.filtersMeta) {
      setServerFiltersMeta(response.filtersMeta);
    }

    if (alsoFinished) {
      await fetchFinishedIssues();
    }
  };

  /**
   * Ejecuta el refresco manual mostrado en la cabecera.
   *
   * @returns {Promise<void>}
   */
  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      const response = await fetchActiveIssues();

      if (response?.taskCenter) {
        setServerTaskCenter(response.taskCenter);
      }

      if (response?.filtersMeta) {
        setServerFiltersMeta(response.filtersMeta);
      }
    } finally {
      setRefreshing(false);
    }
  };

  return {
    taskCenter,
    filtersMeta,
    refreshing,
    refresh,
    handleRefresh,
  };
};

export default useActiveIssuesScreenSync;
