import { ISSUE_STAGES } from "../../issues/shared/issueStages.js";

export const EVALUATION_STAGES = Object.freeze({
  CRITERIA_WEIGHTING: ISSUE_STAGES.CRITERIA_WEIGHTING,
  ALTERNATIVE_EVALUATION: ISSUE_STAGES.ALTERNATIVE_EVALUATION,
});

export const EVALUATION_STAGE_VALUES = Object.freeze(
  Object.values(EVALUATION_STAGES)
);
