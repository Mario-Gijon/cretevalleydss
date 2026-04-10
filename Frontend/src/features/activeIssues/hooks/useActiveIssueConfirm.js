import { useState } from "react";

/**
 * Gestiona el estado y el flujo del diálogo de confirmación
 * usado en la pantalla de issues activos.
 *
 * Mantiene desacoplado el estado del modal y la acción
 * pendiente de ejecución para dejar la page más limpia.
 *
 * @returns {Object}
 */
export const useActiveIssueConfirm = () => {
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    description: "",
    confirmText: "Confirm",
    tone: "warning",
    action: null,
  });

  /**
   * Abre el diálogo de confirmación con el contenido indicado.
   *
   * Se conserva el campo tone por compatibilidad con los
   * callers actuales aunque el componente visual no lo use aún.
   *
   * @param {Object} params Parámetros del diálogo.
   * @param {string} params.title Título del diálogo.
   * @param {string} params.description Descripción mostrada.
   * @param {string} params.confirmText Texto del botón de confirmación.
   * @param {string} params.tone Tono lógico del diálogo.
   * @param {Function|null} params.action Acción a ejecutar al confirmar.
   * @returns {void}
   */
  const openConfirm = ({
    title,
    description,
    confirmText,
    tone = "warning",
    action,
  }) => {
    setConfirm({
      open: true,
      title,
      description,
      confirmText: confirmText || "Confirm",
      tone,
      action,
    });
  };

  /**
   * Cierra el diálogo y limpia la acción pendiente.
   *
   * @returns {void}
   */
  const closeConfirm = () => {
    setConfirm((current) => ({
      ...current,
      open: false,
      action: null,
    }));
  };

  /**
   * Ejecuta la acción confirmada actualmente y cierra el diálogo.
   *
   * @returns {Promise<void>}
   */
  const runConfirm = async () => {
    const action = confirm.action;

    closeConfirm();

    if (typeof action === "function") {
      await action();
    }
  };

  return {
    confirm,
    openConfirm,
    closeConfirm,
    runConfirm,
  };
};

export default useActiveIssueConfirm;