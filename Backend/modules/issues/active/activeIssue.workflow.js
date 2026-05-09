/**
 * Elimina el campo weights de modelParameters para respuestas de issues activos.
 *
 * @param {unknown} modelParameters Parámetros del modelo.
 * @returns {Object}
 */
export const cleanModelParameters = (modelParameters) => {
  const parsed =
    modelParameters && typeof modelParameters === "object"
      ? { ...modelParameters }
      : {};

  if ("weights" in parsed) {
    delete parsed.weights;
  }

  return parsed;
};

/**
 * Detecta si el issue ya dispone de pesos directos.
 *
 * @param {Object} issue Issue a inspeccionar.
 * @returns {boolean}
 */
export const detectHasDirectWeights = (issue) => {
  const weightingMode = String(issue?.weightingMode || "").toLowerCase();

  if (["manual", "direct", "predefined", "fixed"].includes(weightingMode)) {
    return true;
  }

  const weights = issue?.modelParameters?.weights;
  return (
    Array.isArray(weights) &&
    weights.length > 0 &&
    weights.some((value) => value !== null && value !== undefined)
  );
};

/**
 * Detecta si el issue tiene consenso de alternativas habilitado.
 *
 * @param {Object} issue Issue a inspeccionar.
 * @returns {boolean}
 */
export const detectHasAlternativeConsensusEnabled = (issue) =>
  Boolean(issue?.isConsensus);

/**
 * Construye los pasos del workflow para la UI de activos.
 *
 * @param {object} params Parámetros de entrada.
 * @param {boolean} params.hasDirectWeights Indica si el issue tiene pesos directos.
 * @param {boolean} params.hasAlternativeConsensus Indica si el issue tiene consenso de alternativas.
 * @returns {Array<Object>}
 */
export const buildWorkflowStepsStable = ({
  hasDirectWeights,
  hasAlternativeConsensus,
}) => {
  if (hasDirectWeights) {
    return [
      { key: "weightsAssigned", label: "Weights assigned" },
      { key: "alternativeEvaluation", label: "Alternative evaluation" },
      ...(hasAlternativeConsensus
        ? [{ key: "alternativeConsensus", label: "Alternative consensus" }]
        : []),
      { key: "readyResolve", label: "Ready to resolve" },
    ];
  }

  return [
    { key: "criteriaWeighting", label: "Criteria weighting" },
    { key: "weightsFinished", label: "Weights finished" },
    { key: "alternativeEvaluation", label: "Alternative evaluation" },
    ...(hasAlternativeConsensus
      ? [{ key: "alternativeConsensus", label: "Alternative consensus" }]
      : []),
    { key: "readyResolve", label: "Ready to resolve" },
  ];
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
