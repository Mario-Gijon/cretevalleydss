import {
  EVALUATION_STAGES,
} from "../../evaluationStages.js";
import { getAlternativeCriteriaMatrixPayload } from "./alternativeCriteriaMatrix.get.js";
import { saveAlternativeCriteriaMatrixPayload } from "./alternativeCriteriaMatrix.save.js";

export const alternativeCriteriaMatrixStructure = Object.freeze({
  key: "alternativeCriteriaMatrix",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  get: getAlternativeCriteriaMatrixPayload,
  save: saveAlternativeCriteriaMatrixPayload,
});
