import {
  EVALUATION_STAGES,
} from "../../evaluationStages.js";
import { getAlternativePairwiseByCriterionPayload } from "./alternativePairwiseByCriterion.get.js";
import { saveAlternativePairwiseByCriterionPayload } from "./alternativePairwiseByCriterion.save.js";

export const alternativePairwiseByCriterionStructure = Object.freeze({
  key: "alternativePairwiseByCriterion",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  get: getAlternativePairwiseByCriterionPayload,
  save: saveAlternativePairwiseByCriterionPayload,
});
