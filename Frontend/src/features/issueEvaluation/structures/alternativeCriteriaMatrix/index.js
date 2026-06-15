import { EVALUATION_STAGES } from "../../evaluation.constants";
import AlternativeCriteriaMatrixEvaluationDialog from "./AlternativeCriteriaMatrixEvaluationDialog";
import AlternativeCriteriaMatrixView from "./AlternativeCriteriaMatrixView";
import { alternativeCriteriaMatrixAdapter } from "./alternativeCriteriaMatrix.adapter";

export const alternativeCriteriaMatrixStructure = Object.freeze({
  key: "alternativeCriteriaMatrix",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  label: "Alternative-criteria matrix",
  adapter: alternativeCriteriaMatrixAdapter,
  Dialog: AlternativeCriteriaMatrixEvaluationDialog,
  View: AlternativeCriteriaMatrixView,
});
