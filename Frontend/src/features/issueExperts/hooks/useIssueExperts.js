import { useCallback, useMemo, useState } from "react";

import { editExperts } from "../../../services/issue.service.js";

/**
 * Gestiona el flujo de edición de expertos del issue seleccionado.
 *
 * Mantiene aislado el estado de edición, selección de expertos,
 * apertura del selector y guardado de cambios.
 *
 * @param {Object} params Parámetros del hook.
 * @param {Object|null} params.selectedIssue Issue actualmente seleccionado.
 * @param {Array} params.initialExperts Lista global de expertos disponibles.
 * @param {Function} params.showSnackbarAlert Función para mostrar alertas.
 * @param {Function} params.refresh Función para refrescar datos tras guardar.
 * @param {Function} params.setBusy Setter del estado global de acciones ocupadas.
 * @returns {Object}
 */
export const useIssueExperts = ({
  selectedIssue,
  initialExperts = [],
  showSnackbarAlert,
  refresh,
  setBusy,
}) => {
  const [isEditingExperts, setIsEditingExperts] = useState(false);
  const [expertsToRemove, setExpertsToRemove] = useState([]);
  const [expertsToAdd, setExpertsToAdd] = useState([]);
  const [openAddExpertsDialog, setOpenAddExpertsDialog] = useState(false);

  const normalizedInitialExperts = useMemo(() => {
    return Array.isArray(initialExperts) ? initialExperts : [];
  }, [initialExperts]);

  const existingExpertEmails = useMemo(() => {
    if (!selectedIssue) {
      return [...expertsToAdd];
    }

    return [
      ...(Array.isArray(selectedIssue?.participatedExperts)
        ? selectedIssue.participatedExperts
        : []),
      ...(Array.isArray(selectedIssue?.acceptedButNotEvaluatedExperts)
        ? selectedIssue.acceptedButNotEvaluatedExperts
        : []),
      ...(Array.isArray(selectedIssue?.pendingExperts)
        ? selectedIssue.pendingExperts
        : []),
      ...(Array.isArray(selectedIssue?.notAcceptedExperts)
        ? selectedIssue.notAcceptedExperts
        : []),
      ...expertsToAdd,
    ];
  }, [selectedIssue, expertsToAdd]);

  const availableExperts = useMemo(() => {
    return normalizedInitialExperts.filter(
      (expert) => !existingExpertEmails.includes(expert.email)
    );
  }, [normalizedInitialExperts, existingExpertEmails]);

  /**
   * Restablece el estado completo del flujo de expertos.
   *
   * @returns {void}
   */
  const resetExpertsEdition = useCallback(() => {
    setIsEditingExperts(false);
    setExpertsToAdd([]);
    setExpertsToRemove([]);
    setOpenAddExpertsDialog(false);
  }, []);

  /**
   * Activa o desactiva el modo edición de expertos.
   *
   * @returns {void}
   */
  const toggleEditExperts = () => {
    if (!selectedIssue) return;

    if (isEditingExperts) {
      resetExpertsEdition();
      return;
    }

    setIsEditingExperts(true);
  };

  /**
   * Marca o desmarca un experto para eliminarlo del issue.
   *
   * @param {string} email Correo del experto.
   * @returns {void}
   */
  const markRemoveExpert = (email) => {
    setExpertsToRemove((prev) =>
      prev.includes(email)
        ? prev.filter((value) => value !== email)
        : [...prev, email]
    );
  };

  /**
   * Ejecuta la actualización real de expertos en backend.
   *
   * @returns {Promise<void>}
   */
  const processEditExperts = async () => {
    if (!selectedIssue) return;

    setBusy((prev) => ({ ...prev, editExperts: true }));

    const response = await editExperts(
      selectedIssue.id,
      expertsToAdd,
      expertsToRemove
    );

    showSnackbarAlert(
      response?.message || "Experts updated",
      response?.success ? "success" : "error"
    );

    await refresh();

    setBusy((prev) => ({ ...prev, editExperts: false }));
    resetExpertsEdition();
  };

  /**
   * Valida el cambio de expertos y lo guarda directamente.
   *
   * @returns {Promise<void>}
   */
  const saveExpertsChanges = async () => {
    if (!selectedIssue) return;

    const currentExperts = [
      ...(Array.isArray(selectedIssue?.participatedExperts)
        ? selectedIssue.participatedExperts
        : []),
      ...(Array.isArray(selectedIssue?.acceptedButNotEvaluatedExperts)
        ? selectedIssue.acceptedButNotEvaluatedExperts
        : []),
      ...(Array.isArray(selectedIssue?.pendingExperts)
        ? selectedIssue.pendingExperts
        : []),
      ...(Array.isArray(selectedIssue?.notAcceptedExperts)
        ? selectedIssue.notAcceptedExperts
        : []),
    ];

    const remainingExperts = currentExperts.filter(
      (expert) => !expertsToRemove.includes(expert)
    );

    if (remainingExperts.length + expertsToAdd.length < 1) {
      showSnackbarAlert("An issue must have at least one expert.", "error");
      return;
    }

    await processEditExperts();
  };

  return {
    isEditingExperts,
    expertsToRemove,
    expertsToAdd,
    openAddExpertsDialog,
    availableExperts,
    setExpertsToAdd,
    setOpenAddExpertsDialog,
    resetExpertsEdition,
    toggleEditExperts,
    markRemoveExpert,
    saveExpertsChanges,
  };
};

export default useIssueExperts;
