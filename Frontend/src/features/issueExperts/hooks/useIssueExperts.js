import { useCallback, useMemo, useState } from "react";

import { editExperts } from "../../../services/issue.service.js";
import { modelUsesExpertWeights } from "../../../utils/expertWeights.utils.js";

const getCurrentExpertsFromIssue = (issue) =>
  Array.from(
    new Set([
      ...(Array.isArray(issue?.participatedExperts) ? issue.participatedExperts : []),
      ...(Array.isArray(issue?.acceptedButNotEvaluatedExperts)
        ? issue.acceptedButNotEvaluatedExperts
        : []),
      ...(Array.isArray(issue?.pendingExperts) ? issue.pendingExperts : []),
      ...(Array.isArray(issue?.notAcceptedExperts) ? issue.notAcceptedExperts : []),
    ])
  );

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
  const [openExpertWeightsDialog, setOpenExpertWeightsDialog] = useState(false);

  const normalizedInitialExperts = useMemo(() => {
    return Array.isArray(initialExperts) ? initialExperts : [];
  }, [initialExperts]);

  const existingExpertEmails = useMemo(() => {
    if (!selectedIssue) {
      return [...expertsToAdd];
    }

    return [...getCurrentExpertsFromIssue(selectedIssue), ...expertsToAdd];
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
    setOpenExpertWeightsDialog(false);
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
  const processEditExperts = async (expertWeightsByEmail = null) => {
    if (!selectedIssue) return;

    setBusy((prev) => ({ ...prev, editExperts: true }));

    const response = expertWeightsByEmail
      ? await editExperts(
        selectedIssue.id,
        expertsToAdd,
        expertsToRemove,
        expertWeightsByEmail
      )
      : await editExperts(selectedIssue.id, expertsToAdd, expertsToRemove);

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

    const currentExperts = getCurrentExpertsFromIssue(selectedIssue);

    const remainingExperts = currentExperts.filter(
      (expert) => !expertsToRemove.includes(expert)
    );

    if (remainingExperts.length + expertsToAdd.length < 1) {
      showSnackbarAlert("An issue must have at least one expert.", "error");
      return;
    }

    const issueUsesExpertWeights =
      selectedIssue.usesExpertWeights === true ||
      modelUsesExpertWeights(selectedIssue.model);

    if (
      issueUsesExpertWeights &&
      (expertsToAdd.length > 0 || expertsToRemove.length > 0)
    ) {
      setOpenExpertWeightsDialog(true);
      return;
    }

    await processEditExperts();
  };

  const confirmExpertWeights = async (expertWeightsByEmail) => {
    await processEditExperts(expertWeightsByEmail);
  };

  const expertParticipants = useMemo(() => {
    const currentByEmail = new Map(
      (Array.isArray(selectedIssue?.expertParticipants)
        ? selectedIssue.expertParticipants
        : getCurrentExpertsFromIssue(selectedIssue)
      ).map((expert) => [
        typeof expert === "string" ? expert : expert.email,
        typeof expert === "string" ? { email: expert, name: "", weight: null } : expert,
      ])
    );
    const finalExperts = Array.from(currentByEmail.values()).filter(
      (expert) => !expertsToRemove.includes(expert.email)
    );

    expertsToAdd.forEach((email) => {
      if (!currentByEmail.has(email)) {
        const expert = normalizedInitialExperts.find((item) => item.email === email);
        finalExperts.push({ email, name: expert?.name || "", weight: 0, isNew: true });
      }
    });

    return finalExperts.sort((left, right) => left.email.localeCompare(right.email));
  }, [expertsToAdd, expertsToRemove, normalizedInitialExperts, selectedIssue]);

  const currentExpertWeightsByEmail = useMemo(
    () =>
      expertParticipants.reduce((weights, expert) => {
        weights[expert.email] = expert.weight;
        return weights;
      }, {}),
    [expertParticipants]
  );

  return {
    isEditingExperts,
    expertsToRemove,
    expertsToAdd,
    openAddExpertsDialog,
    openExpertWeightsDialog,
    expertParticipants,
    currentExpertWeightsByEmail,
    availableExperts,
    setExpertsToAdd,
    setOpenAddExpertsDialog,
    setOpenExpertWeightsDialog,
    resetExpertsEdition,
    toggleEditExperts,
    markRemoveExpert,
    saveExpertsChanges,
    confirmExpertWeights,
  };
};

export default useIssueExperts;
