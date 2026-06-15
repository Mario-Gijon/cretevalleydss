import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages.js";

export const ISSUE_STAGES = Object.freeze({
  CRITERIA_WEIGHTING: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  WEIGHTS_FINISHED: "weightsFinished",
  ALTERNATIVE_EVALUATION: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  FINISHED: "finished",
});
