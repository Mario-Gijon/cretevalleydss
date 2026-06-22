import { EVALUATION_STAGES } from "../../evaluationStages";
import AlternativeCriteriaMatrixView from "./AlternativeCriteriaMatrixView";

export const alternativeCriteriaMatrixStructure = Object.freeze({
  key: "alternativeCriteriaMatrix",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  View: AlternativeCriteriaMatrixView,
});
