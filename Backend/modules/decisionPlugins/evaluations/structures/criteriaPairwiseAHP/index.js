import { EVALUATION_STAGES } from "../../evaluationStages.js";
import { getCriteriaPairwiseAHPPayload } from "./criteriaPairwiseAHP.get.js";
import { saveCriteriaPairwiseAHPPayload } from "./criteriaPairwiseAHP.save.js";
import { remapCriteriaPairwiseAHPCriterionIds } from "./operations/remapCriterionIds.js";

export const criteriaPairwiseAHPStructure = Object.freeze({
  key: "criteriaPairwiseAHP",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  get: getCriteriaPairwiseAHPPayload,
  save: saveCriteriaPairwiseAHPPayload,
  remapCriterionIds: remapCriteriaPairwiseAHPCriterionIds,
});
