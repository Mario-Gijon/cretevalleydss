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

  const hasAlternativeConsensus = detectIssueAlternativeConsensus(issue);
  const hasCriteriaWeighting =
    issue?.ui?.hasCriteriaWeighting === true ||
    Boolean(issue?.criteriaWeightingStructureKey);

  return [
    ...(hasCriteriaWeighting
      ? [
        { key: "criteriaWeighting", label: "Criteria weighting" },
        { key: "weightsFinished", label: "Weights finished" },
      ]
      : []),
    { key: "alternativeEvaluation", label: "Alternative evaluation" },
    ...(hasAlternativeConsensus
      ? [{ key: "alternativeConsensus", label: "Alternative consensus" }]
      : []),
    { key: "readyResolve", label: "Ready to resolve" },
  ];
};

const mapIssueServerStatusToStepKey = (issue) => {
  const rawKey = issue?.ui?.statusKey || issue?.nextAction?.key;

  if (!rawKey) return null;

  const key = String(rawKey);

  if (key === "evaluateWeights") {
    return "criteriaWeighting";
  }

  if (key === "computeWeights") {
    return "weightsFinished";
  }

  if (key === "evaluateAlternatives") return "alternativeEvaluation";
  if (key === "alternativeConsensus") return "alternativeConsensus";
  if (key === "resolveIssue" || key === "waitingAdmin") return "readyResolve";

  if (key === "waitingExperts" || key === "pendingInvitations") {
    if (issue?.currentStage === "alternativeEvaluation") {
      return "alternativeEvaluation";
    }

    return "criteriaWeighting";
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
    return "weightsFinished";
  }

  if (stage === "criteriaWeighting") {
    return "criteriaWeighting";
  }

  if (stage === "alternativeEvaluation") {
    return "alternativeEvaluation";
  }

  return "criteriaWeighting";
};
