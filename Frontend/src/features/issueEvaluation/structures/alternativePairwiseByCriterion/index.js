import { EVALUATION_STAGES, EVALUATION_STRUCTURE_KEYS } from "../../evaluation.constants";
import AlternativePairwiseByCriterionEvaluationDialog from "./AlternativePairwiseByCriterionEvaluationDialog";
import AlternativePairwiseByCriterionView from "./AlternativePairwiseByCriterionView";

export const alternativePairwiseByCriterionStructure = Object.freeze({
  key: EVALUATION_STRUCTURE_KEYS.ALTERNATIVE_PAIRWISE_BY_CRITERION,
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  label: "Pairwise alternatives by criterion",
  Dialog: AlternativePairwiseByCriterionEvaluationDialog,
  View: AlternativePairwiseByCriterionView,
});
