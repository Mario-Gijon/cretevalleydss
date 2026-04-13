import { useEffect, useMemo } from "react";

import IssueExpertsFlowContext from "../context/issueExpertsFlow.context.js";
import { useIssueExpertsFlow } from "../hooks/useIssueExpertsFlow.js";

/**
 * Provider del flujo de edición de expertos del issue.
 *
 * Mantiene un único estado compartido entre el drawer,
 * la tab de expertos y los diálogos auxiliares.
 *
 * @param {Object} props Props del componente.
 * @param {Object|null} props.selectedIssue Issue seleccionado.
 * @param {Array} props.initialExperts Catálogo global de expertos.
 * @param {Function} props.showSnackbarAlert Función de alertas.
 * @param {Function} props.refresh Refresco de datos de la pantalla.
 * @param {Function} props.setBusy Setter del estado global busy.
 * @param {*} props.children Contenido envuelto por el provider.
 * @returns {JSX.Element}
 */
const IssueExpertsFlowProvider = ({
  selectedIssue,
  initialExperts = [],
  showSnackbarAlert,
  refresh,
  setBusy,
  children,
}) => {
  const flow = useIssueExpertsFlow({
    selectedIssue,
    initialExperts,
    showSnackbarAlert,
    refresh,
    setBusy,
  });

  useEffect(() => {
    flow.resetExpertsEdition();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIssue?.id]);

  const value = useMemo(() => {
    return {
      selectedIssue,
      ...flow,
    };
  }, [selectedIssue, flow]);

  return (
    <IssueExpertsFlowContext.Provider value={value}>
      {children}
    </IssueExpertsFlowContext.Provider>
  );
};

export default IssueExpertsFlowProvider;