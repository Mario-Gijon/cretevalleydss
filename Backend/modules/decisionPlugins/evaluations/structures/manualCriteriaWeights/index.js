import {
  EVALUATION_STAGES,
} from "../../evaluationStages.js";
import { getManualCriteriaWeightsPayload } from "./manualCriteriaWeights.get.js";
import { saveManualCriteriaWeightsPayload } from "./manualCriteriaWeights.save.js";

export const manualCriteriaWeightsStructure = Object.freeze({
  key: "manualCriteriaWeights",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  get: getManualCriteriaWeightsPayload,
  save: saveManualCriteriaWeightsPayload,
});
