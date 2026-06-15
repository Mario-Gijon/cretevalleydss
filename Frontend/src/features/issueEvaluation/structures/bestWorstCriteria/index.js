import { EVALUATION_STAGES } from "../../evaluation.constants";
import BestWorstCriteriaView from "./BestWorstCriteriaView";
import { bestWorstCriteriaAdapter } from "./bestWorstCriteria.adapter";

export const bestWorstCriteriaStructure = Object.freeze({
  key: "bestWorstCriteria",
  stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  label: "BWM",
  adapter: bestWorstCriteriaAdapter,
  View: BestWorstCriteriaView,
});
