import { EVALUATION_STAGES, EVALUATION_STRUCTURE_KEYS } from "../../evaluation.constants";
import ManualCriteriaWeightsEvaluationDialog from "./ManualCriteriaWeightsEvaluationDialog";

export const manualCriteriaWeightsStructure = Object.freeze({
  key: EVALUATION_STRUCTURE_KEYS.MANUAL_CRITERIA_WEIGHTS,
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  label: "Manual criteria weights",
  Dialog: ManualCriteriaWeightsEvaluationDialog,
});
