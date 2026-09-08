import { EVALUATION_STAGES } from "../../evaluationStages";
import ManualCriteriaWeightsView from "./ManualCriteriaWeightsView";

export const manualCriteriaWeightsStructure = Object.freeze({
  key: "manualCriteriaWeights",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  displayLabel: "Manual criteria weights",
  defaultForStage: true,
  View: ManualCriteriaWeightsView,
});
