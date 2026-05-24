export const ISSUE_STAGES = Object.freeze({
  CRITERIA_WEIGHTING: "criteriaWeighting",
  WEIGHTS_FINISHED: "weightsFinished",
  ALTERNATIVE_EVALUATION: "alternativeEvaluation",
  FINISHED: "finished",
});

export const EVALUATION_STAGES = Object.freeze({
  CRITERIA_WEIGHTING: ISSUE_STAGES.CRITERIA_WEIGHTING,
  ALTERNATIVE_EVALUATION: ISSUE_STAGES.ALTERNATIVE_EVALUATION,
});


export const EVALUATION_STAGE_VALUES = Object.freeze(
  Object.values(EVALUATION_STAGES)
);

