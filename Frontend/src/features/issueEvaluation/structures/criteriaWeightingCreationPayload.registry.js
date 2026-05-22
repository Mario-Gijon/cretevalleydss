import { EVALUATION_STRUCTURE_KEYS } from "../evaluation.constants";
import { buildEmptyBestWorstCriteriaPayload } from "./bestWorstCriteria/bestWorstCriteria.payload";

export const buildInitialCriteriaWeightingPayload = ({
  structureKey,
  criterionNames,
}) => {
  if (structureKey === EVALUATION_STRUCTURE_KEYS.BEST_WORST_CRITERIA) {
    return buildEmptyBestWorstCriteriaPayload(criterionNames);
  }

  return {};
};
