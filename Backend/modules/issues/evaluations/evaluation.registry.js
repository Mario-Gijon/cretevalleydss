import { createBadRequestError } from "../../../utils/common/errors.js";
import { EVALUATION_STAGES } from "./evaluation.constants.js";
import { alternativeCriteriaMatrixStructure } from "./structures/alternativeCriteriaMatrix/index.js";
import { alternativePairwiseByCriterionStructure } from "./structures/alternativePairwiseByCriterion/index.js";
import { manualCriteriaWeightsStructure } from "./structures/manualCriteriaWeights/index.js";
import { bestWorstCriteriaStructure } from "./structures/bestWorstCriteria/index.js";
import { fuzzyCriteriaWeightsStructure } from "./structures/fuzzyCriteriaWeights/index.js";
import { criteriaPairwiseMatrixStructure } from "./structures/criteriaPairwiseMatrix/index.js";

export const EVALUATION_STRUCTURE_REGISTRY = Object.freeze({
  [alternativeCriteriaMatrixStructure.key]: alternativeCriteriaMatrixStructure,
  [alternativePairwiseByCriterionStructure.key]:
    alternativePairwiseByCriterionStructure,
  [manualCriteriaWeightsStructure.key]: manualCriteriaWeightsStructure,
  [bestWorstCriteriaStructure.key]: bestWorstCriteriaStructure,
  [fuzzyCriteriaWeightsStructure.key]: fuzzyCriteriaWeightsStructure,
  [criteriaPairwiseMatrixStructure.key]: criteriaPairwiseMatrixStructure,
});

const normalizeStructureKey = (structureKey) => String(structureKey ?? "").trim();

export const getEvaluationStructureOrThrow = (structureKey) => {
  const normalizedStructureKey = normalizeStructureKey(structureKey);

  if (!normalizedStructureKey) {
    throw createBadRequestError("Evaluation structure key is required", {
      code: "EVALUATION_STRUCTURE_KEY_REQUIRED",
      field: "structureKey",
    });
  }

  const structure = EVALUATION_STRUCTURE_REGISTRY[normalizedStructureKey] ?? null;

  if (!structure) {
    throw createBadRequestError(
      `Unsupported evaluation structure: ${normalizedStructureKey}`,
      {
        code: "UNSUPPORTED_EVALUATION_STRUCTURE",
        field: "structureKey",
      }
    );
  }

  return structure;
};

export const getEvaluationStructureForStageOrThrow = ({
  structureKey,
  stage,
}) => {
  const structure = getEvaluationStructureOrThrow(structureKey);

  if (structure.stage !== stage) {
    throw createBadRequestError(
      `Evaluation structure '${structure.key}' does not support stage '${stage}'`,
      {
        code: "EVALUATION_STRUCTURE_STAGE_MISMATCH",
        field: "stage",
        details: {
          structureKey: structure.key,
          expectedStage: structure.stage,
          receivedStage: stage,
        },
      }
    );
  }

  return structure;
};

export const getIssueStructureKeyForStageOrThrow = ({ issue, stage }) => {
  if (stage === EVALUATION_STAGES.CRITERIA_WEIGHTING) {
    return issue?.criteriaWeightingStructureKey;
  }

  if (stage === EVALUATION_STAGES.ALTERNATIVE_EVALUATION) {
    return issue?.alternativeEvaluationStructureKey;
  }

  throw createBadRequestError(`Unsupported evaluation stage: ${stage}`, {
    code: "UNSUPPORTED_EVALUATION_STAGE",
    field: "stage",
  });
};

export const getIssueEvaluationStructureForStageOrThrow = ({ issue, stage }) => {
  const structureKey = getIssueStructureKeyForStageOrThrow({ issue, stage });

  return getEvaluationStructureForStageOrThrow({
    structureKey,
    stage,
  });
};
