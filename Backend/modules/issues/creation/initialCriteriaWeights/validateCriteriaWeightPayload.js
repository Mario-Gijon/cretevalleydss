import { createBadRequestError } from "../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../utils/common/objects.js";

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

  return criterionNames.map((criterionName) => {
    const value = weightsByCriterion[criterionName];

    if (!Array.isArray(value) || value.length !== valueCount) {
      throw createBadRequestError(
        `Fuzzy weight for criterion '${criterionName}' must be an array with length ${valueCount}`,
        {
          field: "criteriaWeightingConfig.payload.weightsByCriterion",
        }
      );
    }

    const fuzzyValues = value.map(Number);
    if (fuzzyValues.some((item) => !Number.isFinite(item))) {
      throw createBadRequestError(
        `Fuzzy weight for criterion '${criterionName}' must contain finite numbers`,
        {
          field: "criteriaWeightingConfig.payload.weightsByCriterion",
        }
      );
    }

    if (fuzzyValues.some((item) => item < 0 || item > 1)) {
      throw createBadRequestError(
        `Fuzzy weight for criterion '${criterionName}' values must be in [0, 1]`,
        {
          field: "criteriaWeightingConfig.payload.weightsByCriterion",
        }
      );
    }

    for (let index = 1; index < fuzzyValues.length; index += 1) {
      if (fuzzyValues[index] < fuzzyValues[index - 1]) {
        throw createBadRequestError(
          `Fuzzy weight for criterion '${criterionName}' must be non-decreasing`,
          {
            field: "criteriaWeightingConfig.payload.weightsByCriterion",
          }
        );
      }
    }

    return fuzzyValues;
  });
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

  const weights = criterionNames.map((criterionName) => {
    const rawValue = weightsByCriterion[criterionName];
    const numericValue = Number(rawValue);

    if (!Number.isFinite(numericValue)) {
      throw createBadRequestError(
        `Weight for criterion '${criterionName}' must be a finite number`,
        {
          field: "criteriaWeightingConfig.payload.weightsByCriterion",
        }
      );
    }

    if (numericValue < 0 || numericValue > 1) {
      throw createBadRequestError(
        `Weight for criterion '${criterionName}' must be between 0 and 1`,
        {
          field: "criteriaWeightingConfig.payload.weightsByCriterion",
        }
      );
    }

    return numericValue;
  });

  const total = weights.reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 1) > CRITERIA_WEIGHT_SUM_TOLERANCE) {
    throw createBadRequestError(
      "Creator manual weights must sum to 1 (tolerance 0.001)",
      {
        field: "criteriaWeightingConfig.payload.weightsByCriterion",
      }
    );
  }

  return weights;
};
