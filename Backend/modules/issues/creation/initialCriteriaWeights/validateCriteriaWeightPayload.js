import { createBadRequestError } from "../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../utils/common/objects.js";
import { toIdString } from "../../../../utils/common/ids.js";
import {
  validateAndNormalizeCrispCriteriaWeightArray,
  validateAndNormalizeFuzzyCriteriaWeightArray,
} from "../../../decisionPlugins/modelParameters/criteriaWeightValues.js";

const CRITERIA_WEIGHT_SUM_TOLERANCE = 0.001;

const getCriteriaForWeightPayloadOrThrow = (leafCriteria) => {
  if (!Array.isArray(leafCriteria) || leafCriteria.length === 0) {
    throw createBadRequestError("Leaf criteria are required for criteria weights", {
      field: "criteria",
    });
  }

  return leafCriteria.map((criterion) => {
    const criterionId = toIdString(criterion?.id ?? criterion?._id);
    const criterionName = criterion?.name;

    if (!criterionId) {
      throw createBadRequestError("Each weighted criterion must have an id", {
        field: "criteriaWeightingConfig.payload.weightsByCriterion",
      });
    }

    if (typeof criterionName !== "string" || criterionName.trim() === "") {
      throw createBadRequestError("Each weighted criterion must have a name", {
        field: "criteriaWeightingConfig.payload.weightsByCriterion",
      });
    }

    return {
      id: criterionId,
      name: criterionName,
    };
  });
};

const getWeightsByCriterionOrThrow = (payload) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError(
      "criteriaWeightingConfig.payload must be an object",
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

  return weightsByCriterion;
};

const validateExpectedCriterionKeysOrThrow = ({
  weightsByCriterion,
  criteria,
  modeLabel,
}) => {
  const expectedCriterionIdSet = new Set(criteria.map((criterion) => criterion.id));
  const unknownKeys = Object.keys(weightsByCriterion).filter(
    (criterionId) => !expectedCriterionIdSet.has(criterionId)
  );

  if (unknownKeys.length > 0) {
    throw createBadRequestError(
      `Unknown criteria in ${modeLabel} weights: ${unknownKeys.join(", ")}`,
      {
        field: "criteriaWeightingConfig.payload.weightsByCriterion",
      }
    );
  }
};

export const normalizeCreatorFuzzyWeightsOrThrow = ({
  payload,
  leafCriteria,
  valueCount,
}) => {
  const criteria = getCriteriaForWeightPayloadOrThrow(leafCriteria);
  const weightsByCriterion = getWeightsByCriterionOrThrow(payload);

  validateExpectedCriterionKeysOrThrow({
    weightsByCriterion,
    criteria,
    modeLabel: "creator fuzzy",
  });

  const orderedFuzzyValues = criteria.map(
    (criterion) => weightsByCriterion[criterion.id]
  );

  const normalizedResult = validateAndNormalizeFuzzyCriteriaWeightArray({
    value: orderedFuzzyValues,
    expectedLength: criteria.length,
    valueCount,
    min: 0,
    max: 1,
    requireNonDecreasing: true,
    enforceMiddleSum: false,
  });

  if (!normalizedResult.ok) {
    const { code, index } = normalizedResult.error;
    const criterionName = criteria[index]?.name || "<unknown>";

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

  return criteria.reduce((accumulator, criterion, index) => {
    accumulator[criterion.id] = normalizedResult.value[index];
    return accumulator;
  }, {});
};

export const normalizeCreatorManualWeightsOrThrow = ({
  payload,
  leafCriteria,
}) => {
  const criteria = getCriteriaForWeightPayloadOrThrow(leafCriteria);
  const weightsByCriterion = getWeightsByCriterionOrThrow(payload);

  validateExpectedCriterionKeysOrThrow({
    weightsByCriterion,
    criteria,
    modeLabel: "creator manual",
  });

  const orderedWeights = criteria.map(
    (criterion) => weightsByCriterion[criterion.id]
  );

  const normalizedResult = validateAndNormalizeCrispCriteriaWeightArray({
    value: orderedWeights,
    expectedLength: criteria.length,
    min: 0,
    max: 1,
    enforceNonNegative: false,
    requirePositiveTotal: false,
    sumTarget: 1,
    sumTolerance: CRITERIA_WEIGHT_SUM_TOLERANCE,
  });

  if (!normalizedResult.ok) {
    const { code, index } = normalizedResult.error;
    const criterionName = criteria[index]?.name || "<unknown>";

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

  return criteria.reduce((accumulator, criterion, index) => {
    accumulator[criterion.id] = normalizedResult.value[index];
    return accumulator;
  }, {});
};
