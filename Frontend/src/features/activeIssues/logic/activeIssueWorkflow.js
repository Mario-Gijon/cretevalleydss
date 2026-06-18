/**
 * Detecta si existe una fase de consenso en alternativas.
 *
 * @param {Object|null} issue Issue a evaluar.
 * @returns {boolean}
 */
export const detectIssueAlternativeConsensus = (issue) => {
  if (!issue) return false;
  if (issue.ui.hasAlternativeConsensus) return true;

  return issue.ui.workflowSteps.some(
    (step) => step.key === "alternativeConsensus"
  );
};

/**
 * Construye la secuencia de pasos visible del workflow.
 *
 * @param {Object|null} issue Issue a evaluar.
 * @returns {Array}
 */
export const buildIssueWorkflowSteps = (issue) => {
  if (!issue) return [];

  const serverSteps = issue.ui.workflowSteps;

  if (serverSteps.length > 0) {
    return serverSteps;
  }

  const hasAlternativeConsensus = detectIssueAlternativeConsensus(issue);
  const hasCriteriaWeighting = issue.ui.hasCriteriaWeighting === true;

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
  const key = issue.ui.statusKey;

  if (!key) return null;

  if (key === "evaluateWeights") {
    return "criteriaWeighting";
  }

  if (key === "computeWeights") {
    return "weightsFinished";
  }

  if (key === "evaluateAlternatives") return "alternativeEvaluation";
  if (key === "alternativeConsensus") return "alternativeConsensus";
  if (key === "resolveIssue" || key === "waitingOwner") return "readyResolve";

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

  if (issue.currentStage === "finished") {
    return "__done__";
  }

  const serverStepKey = mapIssueServerStatusToStepKey(issue);

  if (serverStepKey === "__done__") {
    return "__done__";
  }

  if (serverStepKey && steps.some((step) => step.key === serverStepKey)) {
    return serverStepKey;
  }

  const flags = issue.statusFlags;
  const stage = issue.currentStage;

  if (
    steps.some((step) => step.key === "alternativeConsensus") &&
    detectIssueAlternativeConsensus(issue)
  ) {
    return "alternativeConsensus";
  }

  const waitingOwnerResolve =
    Boolean(flags.waitingOwner) &&
    stage !== "weightsFinished" &&
    stage !== "criteriaWeighting";

  if (flags.canResolveIssue || waitingOwnerResolve) {
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

  return "criteriaWeighting";
};
