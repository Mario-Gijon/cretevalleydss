import { createBadRequestError } from "../../../../../../utils/common/errors.js";
import {
  hasOwnKey,
  isPlainObject,
} from "../../../../../../utils/common/objects.js";

const TOP_LEVEL_KEYS = Object.freeze(["weightsByCriterion"]);

export const validatePayloadShape = ({ payload, criteria }) => {
  if (!isPlainObject(payload)) {
    throw createBadRequestError("payload must be an object", {
      field: "payload",
    });
  }

  const payloadKeys = Object.keys(payload);
  if (
    payloadKeys.length !== TOP_LEVEL_KEYS.length ||
    TOP_LEVEL_KEYS.some((key) => !hasOwnKey(payload, key))
  ) {
    throw createBadRequestError("payload must contain only weightsByCriterion", {
      field: "payload",
    });
  }

  const weightsByCriterion = payload.weightsByCriterion;
  if (!isPlainObject(weightsByCriterion)) {
    throw createBadRequestError("payload.weightsByCriterion must be an object", {
      field: "payload.weightsByCriterion",
    });
  }

  const criterionIds = criteria.map((criterion) => criterion.id);
  const weightKeys = Object.keys(weightsByCriterion);
  const unknownCriterionIds = weightKeys.filter(
    (criterionId) => !criterionIds.includes(criterionId)
  );

  if (unknownCriterionIds.length > 0) {
    throw createBadRequestError(
      "payload.weightsByCriterion contains unknown criteria",
      { field: "payload.weightsByCriterion" }
    );
  }

  for (const criterionId of criterionIds) {
    if (!hasOwnKey(weightsByCriterion, criterionId)) {
      throw createBadRequestError(
        "payload.weightsByCriterion is missing a criterion",
        { field: `payload.weightsByCriterion.${criterionId}` }
      );
    }
  }

  return payload;
};
