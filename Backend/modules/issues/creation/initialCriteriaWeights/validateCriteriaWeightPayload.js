import { createBadRequestError } from "../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../utils/common/objects.js";
import {
  validateAndNormalizeCrispCriteriaWeightArray,
  validateAndNormalizeFuzzyCriteriaWeightArray,
} from "../../../decisionPlugins/modelParameters/criteriaWeightValues.js";

const CRITERIA_WEIGHT_SUM_TOLERANCE = 0.001;

export const normalizeCreatorFuzzyWeightsOrThrow = ({
  payload,
  criterionNames,
  valueCount,
}) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError(
      "criteriaWeightingConfig.payload must be an object for creatorFuzzy mode",
      {
        field: "criteriaWeightingConfig.payload",
      }
    );
  }

  const weightsByCriterion = payload.weightsByCriterion;
  if (!isPlainObject(weightsByCriterion)) {
    throw createBadRequestError(
      "criteriaWeightingConfig.payload.weightsByCriterion must be an object",
      {
        field: "criteriaWeightingConfig.payload.weightsByCriterion",
      }
    );
  }

  const expectedCriterionSet = new Set(criterionNames);
  const unknownKeys = Object.keys(weightsByCriterion).filter(
    (criterionName) => !expectedCriterionSet.has(criterionName)
  );

  if (unknownKeys.length > 0) {
    throw createBadRequestError(
      `Unknown criteria in creator fuzzy weights: ${unknownKeys.join(", ")}`,
      {
        field: "criteriaWeightingConfig.payload.weightsByCriterion",
      }
    );
  }

  const orderedFuzzyValues = criterionNames.map(
    (criterionName) => weightsByCriterion[criterionName]
  );

  const normalizedResult = validateAndNormalizeFuzzyCriteriaWeightArray({
    value: orderedFuzzyValues,
    expectedLength: criterionNames.length,
    valueCount,
    min: 0,
    max: 1,
    requireNonDecreasing: true,
    enforceMiddleSum: false,
  });

  if (!normalizedResult.ok) {
    const { code, index } = normalizedResult.error;
    const criterionName = criterionNames[index] || "<unknown>";

    if (code === "tupleLengthMismatch") {
      throw createBadRequestError(
        `Fuzzy weight for criterion '${criterionName}' must be an array with length ${valueCount}`,
        {
          field: "criteriaWeightingConfig.payload.weightsByCriterion",
        }
      );
    }

    if (code === "tupleNonFinite") {
      throw createBadRequestError(
        `Fuzzy weight for criterion '${criterionName}' must contain finite numbers`,
        {
          field: "criteriaWeightingConfig.payload.weightsByCriterion",
        }
      );
    }

    if (code === "tupleOutOfRange") {
      throw createBadRequestError(
        `Fuzzy weight for criterion '${criterionName}' values must be in [0, 1]`,
        {
          field: "criteriaWeightingConfig.payload.weightsByCriterion",
        }
      );
    }

    if (code === "tupleNotNonDecreasing") {
      throw createBadRequestError(
        `Fuzzy weight for criterion '${criterionName}' must be non-decreasing`,
        {
          field: "criteriaWeightingConfig.payload.weightsByCriterion",
        }
      );
    }

    throw createBadRequestError(
      `Invalid fuzzy weight for criterion '${criterionName}'`,
      {
        field: "criteriaWeightingConfig.payload.weightsByCriterion",
      }
    );
  }

  return normalizedResult.value;
};

export const normalizeCreatorManualWeightsOrThrow = ({
  payload,
  criterionNames,
}) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError(
      "criteriaWeightingConfig.payload must be an object for creatorManual mode",
      {
        field: "criteriaWeightingConfig.payload",
      }
    );
  }

  const weightsByCriterion = payload.weightsByCriterion;
  if (!isPlainObject(weightsByCriterion)) {
    throw createBadRequestError(
      "criteriaWeightingConfig.payload.weightsByCriterion must be an object",
      {
        field: "criteriaWeightingConfig.payload.weightsByCriterion",
      }
    );
  }

  const expectedCriterionSet = new Set(criterionNames);
  const unknownKeys = Object.keys(weightsByCriterion).filter(
    (criterionName) => !expectedCriterionSet.has(criterionName)
  );

  if (unknownKeys.length > 0) {
    throw createBadRequestError(
      `Unknown criteria in creator manual weights: ${unknownKeys.join(", ")}`,
      {
        field: "criteriaWeightingConfig.payload.weightsByCriterion",
      }
    );
  }

  const orderedWeights = criterionNames.map(
    (criterionName) => weightsByCriterion[criterionName]
  );

  const normalizedResult = validateAndNormalizeCrispCriteriaWeightArray({
    value: orderedWeights,
    expectedLength: criterionNames.length,
    min: 0,
    max: 1,
    enforceNonNegative: false,
    requirePositiveTotal: false,
    sumTarget: 1,
    sumTolerance: CRITERIA_WEIGHT_SUM_TOLERANCE,
  });

  if (!normalizedResult.ok) {
    const { code, index } = normalizedResult.error;
    const criterionName = criterionNames[index] || "<unknown>";

    if (code === "nonFinite") {
      throw createBadRequestError(
        `Weight for criterion '${criterionName}' must be a finite number`,
        {
          field: "criteriaWeightingConfig.payload.weightsByCriterion",
        }
      );
    }

    if (code === "outOfRange") {
      throw createBadRequestError(
        `Weight for criterion '${criterionName}' must be between 0 and 1`,
        {
          field: "criteriaWeightingConfig.payload.weightsByCriterion",
        }
      );
    }

    if (code === "sumMismatch") {
      throw createBadRequestError(
        "Creator manual weights must sum to 1 (tolerance 0.001)",
        {
          field: "criteriaWeightingConfig.payload.weightsByCriterion",
        }
      );
    }

    throw createBadRequestError(
      `Invalid manual weight for criterion '${criterionName}'`,
      {
        field: "criteriaWeightingConfig.payload.weightsByCriterion",
      }
    );
  }

  return normalizedResult.value;
};
