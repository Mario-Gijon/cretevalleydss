import { EVALUATION_STAGES } from "../../evaluation.constants";
import BestWorstCriteriaEvaluationDialog from "./BestWorstCriteriaEvaluationDialog";
import BestWorstCriteriaView from "./BestWorstCriteriaView";

export const bestWorstCriteriaStructure = Object.freeze({
  key: "bestWorstCriteria",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  label: "BWM",
  Dialog: BestWorstCriteriaEvaluationDialog,
  View: BestWorstCriteriaView,
});
