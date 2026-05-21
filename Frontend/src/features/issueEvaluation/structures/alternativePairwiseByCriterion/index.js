import { EVALUATION_STAGES, EVALUATION_STRUCTURE_KEYS } from "../../evaluation.constants";
import AlternativePairwiseByCriterionEvaluationDialog from "./AlternativePairwiseByCriterionEvaluationDialog";
import PairwiseAlternativeByCriterionEvaluationView from "./PairwiseAlternativeByCriterionEvaluationView";

export const alternativePairwiseByCriterionStructure = Object.freeze({
  key: EVALUATION_STRUCTURE_KEYS.ALTERNATIVE_PAIRWISE_BY_CRITERION,
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  label: "Pairwise alternatives by criterion",
  Dialog: AlternativePairwiseByCriterionEvaluationDialog,
  EvaluationComponent: PairwiseAlternativeByCriterionEvaluationView,
});
