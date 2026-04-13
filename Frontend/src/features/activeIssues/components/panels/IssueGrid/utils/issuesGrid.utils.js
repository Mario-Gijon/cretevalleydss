/**
 * Limita un número al rango 0..1.
 *
 * @param {number} value Valor a limitar.
 * @returns {number}
 */
export const clamp01 = (value) => {
  return Math.max(0, Math.min(1, value));
};

/**
 * Convierte una fecha DD-MM-YYYY a timestamp.
 *
 * @param {string} value Fecha en formato DD-MM-YYYY.
 * @returns {number|null}
 */
export const parseIssueGridDateDDMMYYYY = (value) => {
  if (!value || typeof value !== "string") return null;

  const [day, month, year] = value.split("-").map((part) => Number(part));

  if (!day || !month || !year) return null;

  const timestamp = new Date(year, month - 1, day).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
};

/**
 * Calcula el progreso de la fecha límite visible del issue.
 *
 * Prioriza los datos enriquecidos del servidor y usa
 * fechas legacy como fallback si hace falta.
 *
 * @param {Object|null} issue Issue a evaluar.
 * @returns {Object|null}
 */
export const computeIssueDeadlineProgress = (issue) => {
  const serverDeadline = issue?.ui?.deadline;

  if (serverDeadline?.hasDeadline && typeof serverDeadline.daysLeft === "number") {
    const end = parseIssueGridDateDDMMYYYY(issue?.closureDate);
    const start = parseIssueGridDateDDMMYYYY(issue?.creationDate);
    const now = Date.now();

    if (end) {
      const fallbackTotal = 1000 * 60 * 60 * 24 * 30;
      const baseStart = start || end - fallbackTotal;
      const total = Math.max(1, end - baseStart);
      const progress = clamp01((now - baseStart) / total);

      return {
        progress,
        daysLeft: serverDeadline.daysLeft,
        label: issue?.closureDate,
      };
    }

    return {
      progress: 0,
      daysLeft: serverDeadline.daysLeft,
      label: issue?.closureDate,
    };
  }

  const end = parseIssueGridDateDDMMYYYY(issue?.closureDate);

  if (!end) return null;

  const start = parseIssueGridDateDDMMYYYY(issue?.creationDate);
  const now = Date.now();
  const fallbackTotal = 1000 * 60 * 60 * 24 * 30;
  const baseStart = start || end - fallbackTotal;
  const total = Math.max(1, end - baseStart);
  const progress = clamp01((now - baseStart) / total);
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

  return {
    progress,
    daysLeft,
    label: issue?.closureDate,
  };
};

/**
 * Detecta si el issue ya dispone de pesos directos.
 *
 * @param {Object|null} issue Issue a evaluar.
 * @returns {boolean}
 */
export const detectIssueDirectWeights = (issue) => {
  if (issue?.ui?.hasDirectWeights === true) return true;
  if (issue?.ui?.hasDirectWeights === false) return false;

  const weightingMode = String(issue?.weightingMode || "").toLowerCase();

  if (["manual", "direct", "predefined", "fixed"].includes(weightingMode)) {
    return true;
  }

  const weights = issue?.modelParameters?.weights;

  if (
    Array.isArray(weights) &&
    weights.length > 0 &&
    weights.some((value) => value !== null && value !== undefined)
  ) {
    return true;
  }

  return false;
};

/**
 * Detecta si existe una fase de consenso en alternativas.
 *
 * @param {Object|null} issue Issue a evaluar.
 * @returns {boolean}
 */
export const detectIssueAlternativeConsensus = (issue) => {
  if (issue?.ui?.hasAlternativeConsensus === true) return true;
  if (issue?.ui?.hasAlternativeConsensus === false) return false;

  const serverSteps = issue?.ui?.workflowSteps;

  if (
    Array.isArray(serverSteps) &&
    serverSteps.some((step) => step?.key === "alternativeConsensus")
  ) {
    return true;
  }

  const flags = issue?.statusFlags || {};

  return Boolean(
    issue?.isConsensus ||
      flags.alternativeConsensusActive ||
      flags.waitingAlternativeConsensus ||
      flags.consensusAlternativesActive ||
      flags.altConsensusActive ||
      issue?.alternativeConsensusActive ||
      issue?.consensusAlternativesActive
  );
};

/**
 * Construye la secuencia de pasos visible del workflow.
 *
 * @param {Object|null} issue Issue a evaluar.
 * @returns {Array}
 */
export const buildIssueWorkflowSteps = (issue) => {
  const serverSteps = issue?.ui?.workflowSteps;

  if (Array.isArray(serverSteps) && serverSteps.length > 0) {
    return serverSteps;
  }

  const hasDirectWeights = detectIssueDirectWeights(issue);
  const hasAlternativeConsensus = detectIssueAlternativeConsensus(issue);

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
 * Traduce el status del servidor a una clave de stepper.
 *
 * @param {Object|null} issue Issue a evaluar.
 * @returns {string|null}
 */
export const mapIssueServerStatusToStepKey = (issue) => {
  const rawKey = issue?.ui?.statusKey || issue?.nextAction?.key;

  if (!rawKey) return null;

  const key = String(rawKey);

  if (key === "evaluateWeights") {
    return detectIssueDirectWeights(issue)
      ? "weightsAssigned"
      : "criteriaWeighting";
  }

  if (key === "computeWeights") {
    return detectIssueDirectWeights(issue)
      ? "weightsAssigned"
      : "weightsFinished";
  }

  if (key === "evaluateAlternatives") return "alternativeEvaluation";
  if (key === "alternativeConsensus") return "alternativeConsensus";
  if (key === "resolveIssue" || key === "waitingAdmin") return "readyResolve";

  if (key === "waitingExperts" || key === "pendingInvitations") {
    return detectIssueDirectWeights(issue)
      ? "weightsAssigned"
      : "criteriaWeighting";
  }

  if (key === "finished") return "__done__";

  return null;
};

/**
 * Resuelve el paso actual del workflow para el stepper.
 *
 * @param {Object|null} issue Issue a evaluar.
 * @param {Array} steps Pasos visibles del workflow.
 * @returns {string}
 */
export const resolveIssueCurrentStepKey = (issue, steps) => {
  if (!issue) {
    return steps?.[0]?.key || "criteriaWeighting";
  }

  if (issue?.currentStage === "finished") {
    return "__done__";
  }

  const serverStepKey = mapIssueServerStatusToStepKey(issue);

  if (serverStepKey === "__done__") {
    return "__done__";
  }

  if (serverStepKey && steps.some((step) => step.key === serverStepKey)) {
    return serverStepKey;
  }

  const flags = issue?.statusFlags || {};
  const stage = issue?.currentStage;

  if (
    steps.some((step) => step.key === "alternativeConsensus") &&
    detectIssueAlternativeConsensus(issue)
  ) {
    return "alternativeConsensus";
  }

  const waitingAdminResolve =
    Boolean(flags.waitingAdmin) &&
    stage !== "weightsFinished" &&
    stage !== "criteriaWeighting";

  if (flags.canResolveIssue || waitingAdminResolve) {
    return "readyResolve";
  }

  if (stage === "alternativeEvaluation") {
    return "alternativeEvaluation";
  }

  if (stage === "weightsFinished") {
    return detectIssueDirectWeights(issue)
      ? "weightsAssigned"
      : "weightsFinished";
  }

  if (stage === "criteriaWeighting") {
    return detectIssueDirectWeights(issue)
      ? "weightsAssigned"
      : "criteriaWeighting";
  }

  return detectIssueDirectWeights(issue)
    ? "weightsAssigned"
    : "criteriaWeighting";
};