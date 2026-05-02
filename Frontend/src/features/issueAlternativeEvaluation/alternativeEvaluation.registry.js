import { EVALUATION_STRUCTURES } from "./alternativeEvaluation.constants.js";
import { directEvaluationStructure } from "./structures/direct/index.js";
import { pairwiseAlternativesEvaluationStructure } from "./structures/pairwiseAlternatives/index.js";

/**
 * Alternative evaluation structure registry.
 *
 * Adding a new evaluation structure should only require exporting its
 * structure descriptor and registering it here.
 */
export const ALTERNATIVE_EVALUATION_STRUCTURE_REGISTRY = Object.freeze({
  [EVALUATION_STRUCTURES.DIRECT]: directEvaluationStructure,
  [EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES]:
    pairwiseAlternativesEvaluationStructure,
});

/**
 * Returns the registered entry for an alternative evaluation structure.
 *
 * @param {string|null|undefined} evaluationStructure - Evaluation structure key.
 * @returns {Object|null} Registered structure entry.
 */
export const getAlternativeEvaluationStructureEntry = (evaluationStructure) =>
  ALTERNATIVE_EVALUATION_STRUCTURE_REGISTRY[evaluationStructure] ?? null;
