import { EVALUATION_STAGES } from "../../evaluationStages";
import BestWorstCriteriaView from "./BestWorstCriteriaView";
import { buildInitialEvaluation } from "./operations/buildInitialEvaluation";

export const bestWorstCriteriaStructure = Object.freeze({
  key: "bestWorstCriteria",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  View: BestWorstCriteriaView,
  buildInitialEvaluation,
});
