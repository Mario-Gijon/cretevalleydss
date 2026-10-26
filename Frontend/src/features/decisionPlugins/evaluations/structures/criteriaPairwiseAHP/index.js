import { EVALUATION_STAGES } from "../../evaluationStages";
import CriteriaPairwiseAHPView from "./CriteriaPairwiseAHPView";
import { buildInitialEvaluation } from "./operations/buildInitialEvaluation";
import { isCollectiveEvaluationUsable } from "./operations/resolveCollective";

export const criteriaPairwiseAHPStructure = Object.freeze({
  key: "criteriaPairwiseAHP",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  displayLabel: "AHP pairwise criteria",
  View: CriteriaPairwiseAHPView,
  buildInitialEvaluation,
  isCollectiveEvaluationUsable,
});
