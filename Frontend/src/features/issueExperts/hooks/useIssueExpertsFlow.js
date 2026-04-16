import { useMemo, useState } from "react";

import { updateIssueExperts } from "../services/issueExperts.service.js";

/**
 * Gestiona el flujo de edición de expertos del issue seleccionado.
 *
 * Mantiene aislado el estado de edición, selección de expertos,
 * apertura de diálogos y guardado de cambios.
 *
 * @param {Object} params Parámetros del hook.
 * @param {Object|null} params.selectedIssue Issue actualmente seleccionado.
 * @param {Array} params.initialExperts Lista global de expertos disponibles.
 * @param {Function} params.showSnackbarAlert Función para mostrar alertas.
 * @param {Function} params.refresh Función para refrescar datos tras guardar.
 * @param {Function} params.setBusy Setter del estado global de acciones ocupadas.
 * @returns {Object}
 */
export const useIssueExpertsFlow = ({
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
  const [openAssignDomainsDialog, setOpenAssignDomainsDialog] = useState(false);

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
  const resetExpertsEdition = () => {
    setIsEditingExperts(false);
    setExpertsToAdd([]);
    setExpertsToRemove([]);
    setOpenAddExpertsDialog(false);
    setOpenAssignDomainsDialog(false);
  };

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
   * @param {Object|null} domainAssignments Asignaciones de dominio opcionales.
   * @returns {Promise<void>}
   */
  const processEditExperts = async (domainAssignments = null) => {
    if (!selectedIssue) return;

    setBusy((prev) => ({ ...prev, editExperts: true }));

    const response = await updateIssueExperts(
      selectedIssue.id,
      expertsToAdd,
      expertsToRemove,
      domainAssignments
    );

    showSnackbarAlert(
      response?.message || response?.msg || "Experts updated",
      response?.success ? "success" : "error"
    );

    await refresh();

    setBusy((prev) => ({ ...prev, editExperts: false }));
    resetExpertsEdition();
  };

  /**
   * Valida el cambio de expertos y decide si guardar directamente
   * o abrir la asignación de dominios para los nuevos expertos.
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

    if (expertsToAdd.length > 0) {
      setOpenAssignDomainsDialog(true);
      return;
    }

    await processEditExperts(null);
  };

  /**
   * Confirma la asignación de dominios y completa la edición.
   *
   * @param {Object} domainAssignments Asignaciones de dominio.
   * @returns {Promise<void>}
   */
  const handleConfirmDomains = async (domainAssignments) => {
    await processEditExperts(domainAssignments);
  };

  return {
    isEditingExperts,
    expertsToRemove,
    expertsToAdd,
    openAddExpertsDialog,
    openAssignDomainsDialog,
    availableExperts,
    setExpertsToAdd,
    setOpenAddExpertsDialog,
    setOpenAssignDomainsDialog,
    resetExpertsEdition,
    toggleEditExperts,
    markRemoveExpert,
    saveExpertsChanges,
    handleConfirmDomains,
  };
};

export default useIssueExpertsFlow;