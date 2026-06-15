import { EVALUATION_STAGES } from "../../evaluationStages";
import ManualCriteriaWeightsView from "./ManualCriteriaWeightsView";
import { manualCriteriaWeightsAdapter } from "./manualCriteriaWeights.adapter";

export const manualCriteriaWeightsStructure = Object.freeze({
  key: "manualCriteriaWeights",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  label: "Manual criteria weights",
  adapter: manualCriteriaWeightsAdapter,
  View: ManualCriteriaWeightsView,
});
