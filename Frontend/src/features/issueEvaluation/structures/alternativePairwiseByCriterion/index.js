import { EVALUATION_STAGES } from "../../evaluation.constants";
import AlternativePairwiseByCriterionView from "./AlternativePairwiseByCriterionView";
import { alternativePairwiseByCriterionAdapter } from "./alternativePairwiseByCriterion.adapter";

export const alternativePairwiseByCriterionStructure = Object.freeze({
  key: "alternativePairwiseByCriterion",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  label: "Pairwise alternatives by criterion",
  adapter: alternativePairwiseByCriterionAdapter,
  View: AlternativePairwiseByCriterionView,
});
