import { useState } from "react";

import {
  computeManualWeights,
  computeWeights,
  leaveIssue,
  removeIssue,
  resolveIssue,
} from "../../../services/issue.service";

/**
 * Gestiona las acciones principales disponibles sobre
 * el issue activo dentro del drawer.
 *
 * Centraliza el estado busy y las operaciones que llaman
 * a servicios para mantener la page más ligera.
 *
 * @param {Object} params Parámetros del hook.
 * @param {Object|null} params.selectedIssue Issue seleccionado.
 * @param {Function} params.showSnackbarAlert Función para mostrar alertas.
 * @param {Function} params.refresh Refresco de datos de la pantalla.
 * @param {Function} params.closeDrawer Cierre del drawer.
 * @param {Function} params.setLoading Setter global de loading.
 * @returns {Object}
 */
export const useActiveIssueActions = ({
  selectedIssue,
  showSnackbarAlert,
  refresh,
  closeDrawer,
  setLoading,
}) => {
  const [busy, setBusy] = useState({
    resolve: false,
    compute: false,
    remove: false,
    leave: false,
    editExperts: false,
  });

  /**
   * Elimina el issue seleccionado.
   *
   * @returns {Promise<void>}
   */
  const handleRemoveIssue = async () => {
    if (!selectedIssue) return;

    setBusy((prev) => ({ ...prev, remove: true }));
    const response = await removeIssue(selectedIssue.id);

    if (response?.success) {
      showSnackbarAlert(response.msg, "success");
      await refresh();
      closeDrawer();
    } else {
      showSnackbarAlert(response?.msg || "Error removing issue", "error");
    }

    setBusy((prev) => ({ ...prev, remove: false }));
  };

  /**
   * Sale del issue seleccionado como experto.
   *
   * @returns {Promise<void>}
   */
  const handleLeaveIssue = async () => {
    if (!selectedIssue) return;

    setBusy((prev) => ({ ...prev, leave: true }));
    const response = await leaveIssue(selectedIssue.id);

    if (response?.success) {
      showSnackbarAlert(response.msg, "success");
      await refresh();
      closeDrawer();
    } else {
      showSnackbarAlert(response?.msg || "Error leaving issue", "error");
    }

    setBusy((prev) => ({ ...prev, leave: false }));
  };

  /**
   * Resuelve el issue seleccionado.
   *
   * @returns {Promise<void>}
   */
  const handleResolveIssue = async () => {
    if (!selectedIssue) return;

    setBusy((prev) => ({ ...prev, resolve: true }));
    const response = await resolveIssue(selectedIssue.id);

    if (response?.success) {
      showSnackbarAlert(response.msg, response.finished ? "success" : "info");
      await refresh({ alsoFinished: Boolean(response.finished) });
      closeDrawer();
    } else {
      showSnackbarAlert(response?.msg || "Error resolving issue", "error");
      setLoading(false);
      closeDrawer();
    }

    setBusy((prev) => ({ ...prev, resolve: false }));
  };

  /**
   * Calcula o computa los pesos del issue seleccionado
   * según su modo de ponderación.
   *
   * @returns {Promise<void>}
   */
  const handleComputeWeights = async () => {
    if (!selectedIssue) return;

    setBusy((prev) => ({ ...prev, compute: true }));

    const response =
      selectedIssue.weightingMode === "consensus"
        ? await computeManualWeights(selectedIssue.id)
        : await computeWeights(selectedIssue.id);

    if (response?.success) {
      showSnackbarAlert(response.msg, response.finished ? "success" : "info");
      await refresh({ alsoFinished: true });
      closeDrawer();
    } else {
      showSnackbarAlert(response?.msg || "Error computing weights", "error");
      setLoading(false);
      closeDrawer();
    }

    setBusy((prev) => ({ ...prev, compute: false }));
  };

  return {
    busy,
    setBusy,
    handleRemoveIssue,
    handleLeaveIssue,
    handleResolveIssue,
    handleComputeWeights,
  };
};

export default useActiveIssueActions;