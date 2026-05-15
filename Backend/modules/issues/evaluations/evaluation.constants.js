export const ISSUE_STAGES = Object.freeze({
  CRITERIA_WEIGHTING: "criteriaWeighting",
  WEIGHTS_FINISHED: "weightsFinished",
  ALTERNATIVE_EVALUATION: "alternativeEvaluation",
  ALTERNATIVE_CONSENSUS: "alternativeConsensus",
  FINISHED: "finished",
});

export const EVALUATION_STAGES = Object.freeze({
  CRITERIA_WEIGHTING: ISSUE_STAGES.CRITERIA_WEIGHTING,
  ALTERNATIVE_EVALUATION: ISSUE_STAGES.ALTERNATIVE_EVALUATION,
  ALTERNATIVE_CONSENSUS: ISSUE_STAGES.ALTERNATIVE_CONSENSUS,
});


export const EVALUATION_STRUCTURE_KEYS = Object.freeze({
  ALTERNATIVE_CRITERIA_MATRIX: "alternativeCriteriaMatrix",
  ALTERNATIVE_PAIRWISE_BY_CRITERION: "alternativePairwiseByCriterion",
  MANUAL_CRITERIA_WEIGHTS: "manualCriteriaWeights",
  BEST_WORST_CRITERIA: "bestWorstCriteria",
  FUZZY_CRITERIA_WEIGHTS: "fuzzyCriteriaWeights",
  CRITERIA_PAIRWISE_MATRIX: "criteriaPairwiseMatrix",
});

export const CRITERIA_WEIGHTING_AGGREGATION_MODES = Object.freeze({
  NONE: "none",
  MEAN: "mean",
  BWM_MEAN: "bwmMean",
  CMCC_SIMULATION: "cmccSimulation",
});

export const EVALUATION_STAGE_VALUES = Object.freeze(
  Object.values(EVALUATION_STAGES)
);

export const EVALUATION_STRUCTURE_KEY_VALUES = Object.freeze(
  Object.values(EVALUATION_STRUCTURE_KEYS)
);

export const CRITERIA_WEIGHTING_AGGREGATION_MODE_VALUES = Object.freeze(
  Object.values(CRITERIA_WEIGHTING_AGGREGATION_MODES)
);

