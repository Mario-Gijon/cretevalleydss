import { EVALUATION_STAGES, EVALUATION_STRUCTURE_KEYS } from "../../evaluation.constants";
import BestWorstCriteriaEvaluationDialog from "./BestWorstCriteriaEvaluationDialog";
import BestWorstCriteriaCreationComponent from "./BestWorstCriteriaCreationComponent";

export const bestWorstCriteriaStructure = Object.freeze({
  key: EVALUATION_STRUCTURE_KEYS.BEST_WORST_CRITERIA,
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  label: "BWM",
  Dialog: BestWorstCriteriaEvaluationDialog,
  CreationComponent: BestWorstCriteriaCreationComponent,
});
