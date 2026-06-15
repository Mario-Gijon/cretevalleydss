import { EVALUATION_STAGES } from "../../evaluationStages";
import AlternativeCriteriaMatrixView from "./AlternativeCriteriaMatrixView";
import { alternativeCriteriaMatrixAdapter } from "./alternativeCriteriaMatrix.adapter";

export const alternativeCriteriaMatrixStructure = Object.freeze({
  key: "alternativeCriteriaMatrix",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  label: "Alternative-criteria matrix",
  adapter: alternativeCriteriaMatrixAdapter,
  View: AlternativeCriteriaMatrixView,
});
