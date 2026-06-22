import { EVALUATION_STAGES } from "../../evaluationStages";
import AlternativePairwiseByCriterionView from "./AlternativePairwiseByCriterionView";

export const alternativePairwiseByCriterionStructure = Object.freeze({
  key: "alternativePairwiseByCriterion",
  stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  View: AlternativePairwiseByCriterionView,
});
