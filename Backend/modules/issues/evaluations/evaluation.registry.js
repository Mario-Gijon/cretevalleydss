import { createBadRequestError } from "../../../utils/common/errors.js";
import { alternativeCriteriaMatrixStructure } from "./structures/alternativeCriteriaMatrix/index.js";
import { alternativePairwiseByCriterionStructure } from "./structures/alternativePairwiseByCriterion/index.js";
import { manualCriteriaWeightsStructure } from "./structures/manualCriteriaWeights/index.js";
import { bestWorstCriteriaStructure } from "./structures/bestWorstCriteria/index.js";
import { fuzzyCriteriaWeightsStructure } from "./structures/fuzzyCriteriaWeights/index.js";
import { criteriaPairwiseMatrixStructure } from "./structures/criteriaPairwiseMatrix/index.js";

const EVALUATION_STRUCTURES = [
  alternativeCriteriaMatrixStructure,
  alternativePairwiseByCriterionStructure,
  manualCriteriaWeightsStructure,
  bestWorstCriteriaStructure,
  fuzzyCriteriaWeightsStructure,
  criteriaPairwiseMatrixStructure,
];

export const EVALUATION_STRUCTURE_REGISTRY = Object.freeze(
  Object.fromEntries(
    EVALUATION_STRUCTURES.map((structure) => [structure.key, structure])
  )
);

export const getEvaluationStructureOrThrow = (structureKey) => {
  const structure = EVALUATION_STRUCTURE_REGISTRY[structureKey];

  if (!structure) {
    throw createBadRequestError(
      `Unsupported evaluation structure: ${structureKey}`,
      {
        code: "UNSUPPORTED_EVALUATION_STRUCTURE",
        field: "structureKey",
      }
    );
  }

  return structure;
};