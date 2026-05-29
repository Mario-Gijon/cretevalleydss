export const ACTIVE_STAGE_META = {
  criteriaWeighting: {
    key: "criteriaWeighting",
    label: "Criteria weighting",
    short: "Weighting",
    colorKey: "info",
  },
  weightsFinished: {
    key: "weightsFinished",
    label: "Weights finished",
    short: "Weights done",
    colorKey: "warning",
  },
  alternativeEvaluation: {
    key: "alternativeEvaluation",
    label: "Alternative evaluation",
    short: "Evaluation",
    colorKey: "info",
  },
  alternativeConsensus: {
    key: "alternativeConsensus",
    label: "Alternative consensus",
    short: "Consensus",
    colorKey: "success",
  },
  finished: {
    key: "finished",
    label: "Finished",
    short: "Finished",
    colorKey: "success",
  },
};

export const ACTIVE_ACTION_META = {
  resolveIssue: {
    key: "resolveIssue",
    label: "Resolve issue",
    role: "admin",
    severity: "warning",
    sortPriority: 0,
  },
  computeWeights: {
    key: "computeWeights",
    label: "Compute weights",
    role: "admin",
    severity: "warning",
    sortPriority: 10,
  },
  evaluateWeights: {
    key: "evaluateWeights",
    label: "Evaluate weights",
    role: "expert",
    severity: "info",
    sortPriority: 30,
  },
  evaluateAlternatives: {
    key: "evaluateAlternatives",
    label: "Evaluate alternatives",
    role: "expert",
    severity: "info",
    sortPriority: 40,
  },
};

export const ACTIVE_TASK_ACTION_KEYS = Object.freeze(
  Object.values(ACTIVE_ACTION_META)
    .sort((a, b) => a.sortPriority - b.sortPriority)
    .map((action) => action.key)
);

export const ACTIVE_STATUS_KEYS = Object.freeze({
  WAITING_ADMIN: "waitingAdmin",
  WAITING_EXPERTS: "waitingExperts",
});

export const ACTIVE_STATUS_META = {
  [ACTIVE_STATUS_KEYS.WAITING_ADMIN]: {
    key: ACTIVE_STATUS_KEYS.WAITING_ADMIN,
    label: "Waiting for admin",
    severity: "success",
  },
  [ACTIVE_STATUS_KEYS.WAITING_EXPERTS]: {
    key: ACTIVE_STATUS_KEYS.WAITING_EXPERTS,
    label: "Waiting experts",
    severity: "info",
  },
};