import { EVALUATION_STAGES, EVALUATION_STRUCTURE_KEYS } from "../../evaluation.constants";
import AlternativeCriteriaMatrixEvaluationDialog from "./AlternativeCriteriaMatrixEvaluationDialog";
import DirectEvaluationMatrix from "./DirectEvaluationMatrix";

export const alternativeCriteriaMatrixStructure = Object.freeze({
  key: EVALUATION_STRUCTURE_KEYS.ALTERNATIVE_CRITERIA_MATRIX,
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  label: "Alternative-criteria matrix",
  Dialog: AlternativeCriteriaMatrixEvaluationDialog,
  EvaluationComponent: DirectEvaluationMatrix,
});
