import { EVALUATION_STAGES } from "../../evaluation.constants";
import AlternativePairwiseByCriterionEvaluationDialog from "./AlternativePairwiseByCriterionEvaluationDialog";
import AlternativePairwiseByCriterionView from "./AlternativePairwiseByCriterionView";

export const alternativePairwiseByCriterionStructure = Object.freeze({
  key: "alternativePairwiseByCriterion",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  label: "Pairwise alternatives by criterion",
  Dialog: AlternativePairwiseByCriterionEvaluationDialog,
  View: AlternativePairwiseByCriterionView,
});
