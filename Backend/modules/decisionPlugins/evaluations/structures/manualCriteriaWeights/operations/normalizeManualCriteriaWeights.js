import { createBadRequestError } from "../../../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../../../utils/common/objects.js";

const normalizeWeightValueOrThrow = (rawValue, { criterionName, allowEmpty }) => {
  if (rawValue === "" || rawValue === null || rawValue === undefined) {
    if (allowEmpty) {
      return "";
    }

    throw createBadRequestError(
      `Weight for criterion '${criterionName}' is required`,
      {
        field: "payload.weightsByCriterion",
      }
    );
  }

  const numericValue = Number(rawValue);

  if (!Number.isFinite(numericValue)) {
    throw createBadRequestError(
      `Weight for criterion '${criterionName}' must be a finite number`,
      {
        field: "payload.weightsByCriterion",
      }
    );
  }

  return numericValue;
};

const getCriteriaFromDecisionContextOrThrow = (decisionContext) => {
  const leafItems = decisionContext?.leafCriteria;

  if (!Array.isArray(leafItems)) {
    throw createBadRequestError("decisionContext.leafCriteria must be an array", {
      field: "decisionContext.leafCriteria",
    });
  }

  return leafItems
    .map((criterion) => ({
      id: criterion?.id,
      name: criterion?.name,
    }))
    .filter((criterion) => criterion.id && criterion.name);
};

export const normalizeManualCriteriaWeights = async ({
  payload,
  decisionContext,
  allowEmpty,
}) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("payload must be an object", {
      field: "payload",
    });
  }

  const rawWeightsByCriterion = payload.weightsByCriterion;
  const safeWeightsByCriterion =
    rawWeightsByCriterion === undefined ? {} : rawWeightsByCriterion;

  if (!isPlainObject(safeWeightsByCriterion)) {
    throw createBadRequestError("payload.weightsByCriterion must be an object", {
      field: "payload.weightsByCriterion",
    });
  }

  const criteria = getCriteriaFromDecisionContextOrThrow(decisionContext);

  const weightsByCriterion = criteria.reduce((accumulator, criterion) => {
    accumulator[criterion.id] = normalizeWeightValueOrThrow(
      safeWeightsByCriterion[criterion.id],
      {
        criterionName: criterion.name,
        allowEmpty,
      }
    );
    return accumulator;
  }, {});

  return {
    criteria,
    payload: {
      weightsByCriterion,
    },
  };
};
