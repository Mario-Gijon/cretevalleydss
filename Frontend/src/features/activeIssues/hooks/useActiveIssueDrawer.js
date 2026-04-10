import { useEffect, useMemo, useState } from "react";

import { resolveIssueEvaluationStructure } from "../../../utils/issues/evaluationStructure";
import { EVALUATION_UI_REGISTRY } from "../../../utils/issues/evaluationUIRegistry";

/**
 * Gestiona el estado del drawer de detalle del issue activo.
 *
 * Aísla la selección del issue, el estado de apertura del drawer,
 * la pestaña activa y la resolución del componente de evaluación
 * asociado a la estructura del issue.
 *
 * @param {Object} params Parámetros del hook.
 * @param {Array} params.activeIssues Lista actual de issues activos.
 * @param {boolean} params.loading Indica si la pantalla sigue cargando.
 * @returns {Object}
 */
export const useActiveIssueDrawer = ({
  activeIssues = [],
  loading = false,
}) => {
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState(0);

  /**
   * Issue actualmente seleccionado en el drawer.
   */
  const selectedIssue = useMemo(() => {
    return activeIssues?.find((issue) => issue.id === selectedIssueId) || null;
  }, [activeIssues, selectedIssueId]);

  /**
   * Componente de diálogo de evaluación asociado al issue seleccionado.
   */
  const EvaluationDialogComponent = useMemo(() => {
    if (!selectedIssue) return null;

    const evaluationStructure = resolveIssueEvaluationStructure(selectedIssue);
    const evaluationUi = EVALUATION_UI_REGISTRY[evaluationStructure] ?? null;

    return evaluationUi?.dialog ?? null;
  }, [selectedIssue]);

  useEffect(() => {
    if (drawerOpen && selectedIssueId && !selectedIssue && !loading) {
      setDrawerOpen(false);
      setSelectedIssueId(null);
      setDrawerTab(0);
    }
  }, [drawerOpen, selectedIssueId, selectedIssue, loading]);

  /**
   * Abre el drawer para el issue indicado.
   *
   * @param {Object} issue Issue a mostrar.
   * @returns {void}
   */
  const openDetails = (issue) => {
    if (!issue?.id) return;

    setSelectedIssueId(issue.id);
    setDrawerOpen(true);
    setDrawerTab(0);
  };

  /**
   * Abre el drawer a partir del id del issue.
   *
   * @param {string} issueId Id del issue.
   * @returns {void}
   */
  const openDetailsById = (issueId) => {
    if (!issueId) return;

    setSelectedIssueId(issueId);
    setDrawerOpen(true);
    setDrawerTab(0);
  };

  /**
   * Cierra el drawer y limpia completamente su estado.
   *
   * @returns {void}
   */
  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedIssueId(null);
    setDrawerTab(0);
  };

  /**
   * Minimiza el drawer sin perder el issue seleccionado.
   *
   * @returns {void}
   */
  const minimizeDrawerOnly = () => {
    setDrawerOpen(false);
  };

  return {
    selectedIssue,
    EvaluationDialogComponent,
    drawerOpen,
    drawerTab,
    setDrawerTab,
    setDrawerOpen,
    openDetails,
    openDetailsById,
    closeDrawer,
    minimizeDrawerOnly,
  };
};

export default useActiveIssueDrawer;