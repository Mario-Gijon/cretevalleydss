import { createBadRequestError } from "../../../../../../utils/common/errors.js";
import {
  hasOwnKey,
  isPlainObject,
} from "../../../../../../utils/common/objects.js";

const TOP_LEVEL_KEYS = Object.freeze([
  "bestCriterionId",
  "worstCriterionId",
  "bestToOthers",
  "othersToWorst",
]);

const validateComparisonMapShape = ({
  comparisons,
  criterionIds,
  field,
}) => {
  if (!isPlainObject(comparisons)) {
    throw createBadRequestError(`${field} must be an object`, { field });
  }

  const comparisonKeys = Object.keys(comparisons);
  const unknownCriterionIds = comparisonKeys.filter(
    (criterionId) => !criterionIds.includes(criterionId)
  );

  if (unknownCriterionIds.length > 0) {
    throw createBadRequestError(`${field} contains unknown criteria`, {
      field,
    });
  }

  for (const criterionId of criterionIds) {
    if (!hasOwnKey(comparisons, criterionId)) {
      throw createBadRequestError(`${field} is missing a criterion`, {
        field: `${field}.${criterionId}`,
      });
    }
  }
};

export const validatePayloadShape = ({ payload, criteria }) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("payload must be an object", {
      field: "payload",
    });
  }

  const payloadKeys = Object.keys(payload);
  const unknownKeys = payloadKeys.filter(
    (key) => !TOP_LEVEL_KEYS.includes(key)
  );

  if (unknownKeys.length > 0) {
    throw createBadRequestError("payload contains unknown fields", {
      field: "payload",
    });
  }

  for (const key of TOP_LEVEL_KEYS) {
    if (!hasOwnKey(payload, key)) {
      throw createBadRequestError("payload is missing a required field", {
        field: `payload.${key}`,
      });
    }
  }

  const criterionIds = criteria.map((criterion) => criterion.id);

  validateComparisonMapShape({
    comparisons: payload.bestToOthers,
    criterionIds,
    field: "payload.bestToOthers",
  });
  validateComparisonMapShape({
    comparisons: payload.othersToWorst,
    criterionIds,
    field: "payload.othersToWorst",
  });

  return payload;
};
