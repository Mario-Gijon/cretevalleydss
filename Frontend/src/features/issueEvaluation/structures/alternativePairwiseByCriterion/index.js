import { EVALUATION_STAGES } from "../../evaluation.constants";
import AlternativePairwiseByCriterionEvaluationDialog from "./AlternativePairwiseByCriterionEvaluationDialog";
import AlternativePairwiseByCriterionView from "./AlternativePairwiseByCriterionView";
import { alternativePairwiseByCriterionAdapter } from "./alternativePairwiseByCriterion.adapter";

export const alternativePairwiseByCriterionStructure = Object.freeze({
  key: "alternativePairwiseByCriterion",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  label: "Pairwise alternatives by criterion",
  adapter: alternativePairwiseByCriterionAdapter,
  Dialog: AlternativePairwiseByCriterionEvaluationDialog,
  View: AlternativePairwiseByCriterionView,
});
