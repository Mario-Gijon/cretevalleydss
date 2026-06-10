import { useEffect, useMemo } from "react";

import IssueExpertsContext from "./issueExperts.context.js";
import { useIssueExperts } from "../hooks/useIssueExperts.js";

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
const IssueExpertsProvider = ({
  selectedIssue,
  initialExperts = [],
  showSnackbarAlert,
  refresh,
  setBusy,
  children,
}) => {
  const issueExpertsState = useIssueExperts({
    selectedIssue,
    initialExperts,
    showSnackbarAlert,
    refresh,
    setBusy,
  });
  const { resetExpertsEdition } = issueExpertsState;

  useEffect(() => {
    resetExpertsEdition();
  }, [selectedIssue?.id, resetExpertsEdition]);

  const value = useMemo(() => {
    return {
      selectedIssue,
      ...issueExpertsState,
    };
  }, [selectedIssue, issueExpertsState]);

  return (
    <IssueExpertsContext.Provider value={value}>
      {children}
    </IssueExpertsContext.Provider>
  );
};

export default IssueExpertsProvider;
