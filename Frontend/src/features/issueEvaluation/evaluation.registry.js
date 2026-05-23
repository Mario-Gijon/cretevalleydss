import { manualCriteriaWeightsStructure } from "./structures/manualCriteriaWeights";
import { bestWorstCriteriaStructure } from "./structures/bestWorstCriteria";
import { alternativeCriteriaMatrixStructure } from "./structures/alternativeCriteriaMatrix";
import { alternativePairwiseByCriterionStructure } from "./structures/alternativePairwiseByCriterion";

export const EVALUATION_STRUCTURE_REGISTRY = Object.freeze({
  [manualCriteriaWeightsStructure.key]: manualCriteriaWeightsStructure,
  [bestWorstCriteriaStructure.key]: bestWorstCriteriaStructure,
  [alternativeCriteriaMatrixStructure.key]: alternativeCriteriaMatrixStructure,
  [alternativePairwiseByCriterionStructure.key]:
    alternativePairwiseByCriterionStructure,
});

export const getEvaluationStructureEntry = (structureKey) =>
  EVALUATION_STRUCTURE_REGISTRY[structureKey] ?? null;

export const getEvaluationStructureEntryForStage = ({ structureKey, stage }) => {
  const entry = getEvaluationStructureEntry(structureKey);

  if (!entry) return null;
  if (entry.stage !== stage) return null;

  return entry;
};
