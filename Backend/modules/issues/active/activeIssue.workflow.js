/**
 * Construye los pasos del workflow para la UI de activos.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.criteriaWeightingStructureKey Clave de estructura de ponderación.
 * @param {boolean} params.hasAlternativeConsensus Indica si el issue tiene consenso de alternativas.
 * @returns {Array<Object>}
 */
export const buildActiveWorkflowSteps = ({
  criteriaWeightingStructureKey,
  hasAlternativeConsensus,
}) => {
  const steps = [];

  if (criteriaWeightingStructureKey) {
    steps.push({ key: "criteriaWeighting", label: "Criteria weighting" });
    steps.push({ key: "weightsFinished", label: "Weights finished" });
  }

  steps.push({ key: "alternativeEvaluation", label: "Alternative evaluation" });

  if (hasAlternativeConsensus) {
    steps.push({ key: "alternativeConsensus", label: "Alternative consensus" });
  }

  steps.push({ key: "readyResolve", label: "Ready to resolve" });

  return steps;
};

/**
 * Calcula la metadata de deadline para un issue.
 *
 * @param {string | null | undefined} closureDate Fecha de cierre.
 * @param {Object} dayjsLib Instancia de dayjs.
 * @returns {Object}
 */
export const buildDeadlineInfo = (closureDate, dayjsLib) => {
  if (!closureDate) {
    return {
      hasDeadline: false,
      daysLeft: null,
      overdue: false,
      iso: null,
    };
  }

  const parsedDate = dayjsLib(closureDate, "DD-MM-YYYY", true);
  if (!parsedDate.isValid()) {
    return {
      hasDeadline: false,
      daysLeft: null,
      overdue: false,
      iso: null,
    };
  }

  const daysLeft = parsedDate
    .startOf("day")
    .diff(dayjsLib().startOf("day"), "day");

  return {
    hasDeadline: true,
    daysLeft,
    overdue: daysLeft < 0,
    iso: parsedDate.toISOString(),
  };
};
