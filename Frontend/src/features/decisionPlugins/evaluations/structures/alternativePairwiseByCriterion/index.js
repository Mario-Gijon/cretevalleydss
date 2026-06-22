import { EVALUATION_STAGES } from "../../evaluationStages";
import AlternativePairwiseByCriterionView from "./AlternativePairwiseByCriterionView";
import { alternativePairwiseByCriterionAdapter } from "./alternativePairwiseByCriterion.adapter";

export const alternativePairwiseByCriterionStructure = Object.freeze({
  key: "alternativePairwiseByCriterion",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  adapter: alternativePairwiseByCriterionAdapter,
  View: AlternativePairwiseByCriterionView,
});
