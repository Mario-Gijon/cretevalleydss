import {
  EVALUATION_STAGES,
} from "../../evaluationStages.js";
import { getBestWorstCriteriaPayload } from "./bestWorstCriteria.get.js";
import { saveBestWorstCriteriaPayload } from "./bestWorstCriteria.save.js";
import { remapBestWorstCriteriaCriterionIds } from "./operations/remapCriterionIds.js";

export const bestWorstCriteriaStructure = Object.freeze({
  key: "bestWorstCriteria",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  get: getBestWorstCriteriaPayload,
  save: saveBestWorstCriteriaPayload,
  remapCriterionIds: remapBestWorstCriteriaCriterionIds,
});
