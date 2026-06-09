import { EVALUATION_STAGES } from "../../evaluation.constants";
import ManualCriteriaWeightsEvaluationDialog from "./ManualCriteriaWeightsEvaluationDialog";
import ManualCriteriaWeightsView from "./ManualCriteriaWeightsView";

export const manualCriteriaWeightsStructure = Object.freeze({
  key: "manualCriteriaWeights",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  label: "Manual criteria weights",
  Dialog: ManualCriteriaWeightsEvaluationDialog,
  View: ManualCriteriaWeightsView,
});
